-- ─────────────────────────────────────────────────────────────────────────────
-- Subscription enforcement — trial expiry + write-block via RLS
-- Safe to re-run (CREATE OR REPLACE + DROP IF EXISTS).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Helper: returns true when caller has an active subscription ────────────
--    STABLE + SECURITY DEFINER → avaliado pelo Postgres, não pelo cliente.
--    Chamada automática no WITH CHECK de todas as tabelas de dados.
CREATE OR REPLACE FUNCTION public.subscription_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE((
    SELECT status = 'active'
        OR (status = 'trial' AND trial_ends_at > now())
    FROM  public.subscriptions
    WHERE user_id = auth.uid()
  ), false)
$$;

-- ── 2. RPC: expira trial se o prazo já passou ─────────────────────────────────
--    Chamado pelo frontend em cada loadSubscription — roda no servidor,
--    não pode ser interceptado ou ignorado pelo cliente.
CREATE OR REPLACE FUNCTION public.expire_trial_if_needed(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.subscriptions
  SET    status = 'expired'
  WHERE  user_id       = p_user_id
    AND  status        = 'trial'
    AND  trial_ends_at < now();
END;
$$;

-- ── 3. Trigger: impede que usuário autenticado altere status/trial_ends_at ─────
--    Mesmo que alguém chame supabase.from('subscriptions').update({status:'active'})
--    direto do console, o trigger reverte o campo para o valor anterior.
--    Funções SECURITY DEFINER rodam como 'postgres' → passam normalmente.
CREATE OR REPLACE FUNCTION public.guard_subscription_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user <> 'postgres' THEN
    NEW.status        := OLD.status;
    NEW.trial_ends_at := OLD.trial_ends_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_subscription_trigger ON public.subscriptions;
CREATE TRIGGER guard_subscription_trigger
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.guard_subscription_fields();

-- ── 4. RLS na tabela subscriptions ───────────────────────────────────────────
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can read own subscription"              ON public.subscriptions;
DROP POLICY IF EXISTS "users can update own subscription settings"   ON public.subscriptions;

CREATE POLICY "users can read own subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- UPDATE permitido (para salvar nome, pix, etc.) — trigger protege status/trial_ends_at
CREATE POLICY "users can update own subscription settings"
  ON public.subscriptions FOR UPDATE TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 5. Recria todas as políticas de dados com subscription_active() no WITH CHECK
--    Writes (INSERT/UPDATE) falham silenciosamente quando subscription expirada,
--    independente de como a chamada foi feita (frontend, console, REST direto).
-- ─────────────────────────────────────────────────────────────────────────────

-- produtos
DROP POLICY IF EXISTS "produtos isolated by user" ON public.produtos;
CREATE POLICY "produtos isolated by user" ON public.produtos FOR ALL TO authenticated
  USING  (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() AND subscription_active());

-- clientes
DROP POLICY IF EXISTS "clientes isolated by user" ON public.clientes;
CREATE POLICY "clientes isolated by user" ON public.clientes FOR ALL TO authenticated
  USING  (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() AND subscription_active());

-- vendas
DROP POLICY IF EXISTS "vendas isolated by user" ON public.vendas;
CREATE POLICY "vendas isolated by user" ON public.vendas FOR ALL TO authenticated
  USING  (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() AND subscription_active());

-- venda_itens (isola via tabela pai)
DROP POLICY IF EXISTS "venda_itens isolated by user" ON public.venda_itens;
CREATE POLICY "venda_itens isolated by user" ON public.venda_itens FOR ALL TO authenticated
  USING (
    venda_id IN (SELECT id FROM vendas WHERE user_id = auth.uid() OR user_id IS NULL)
  )
  WITH CHECK (
    venda_id IN (SELECT id FROM vendas WHERE user_id = auth.uid() OR user_id IS NULL)
    AND subscription_active()
  );

-- mesas
DROP POLICY IF EXISTS "mesas isolated by user" ON public.mesas;
CREATE POLICY "mesas isolated by user" ON public.mesas FOR ALL TO authenticated
  USING  (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() AND subscription_active());

-- comanda_itens (isola via mesa pai)
DROP POLICY IF EXISTS "comanda_itens isolated by user" ON public.comanda_itens;
CREATE POLICY "comanda_itens isolated by user" ON public.comanda_itens FOR ALL TO authenticated
  USING (
    mesa_id IN (SELECT id FROM mesas WHERE user_id = auth.uid() OR user_id IS NULL)
  )
  WITH CHECK (
    mesa_id IN (SELECT id FROM mesas WHERE user_id = auth.uid() OR user_id IS NULL)
    AND subscription_active()
  );

-- fornecedores
DROP POLICY IF EXISTS "fornecedores isolated by user" ON public.fornecedores;
CREATE POLICY "fornecedores isolated by user" ON public.fornecedores FOR ALL TO authenticated
  USING  (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() AND subscription_active());

-- parcelas_crediario (isola via venda pai)
DROP POLICY IF EXISTS "parcelas_crediario isolated by user" ON public.parcelas_crediario;
CREATE POLICY "parcelas_crediario isolated by user" ON public.parcelas_crediario FOR ALL TO authenticated
  USING (
    venda_id IN (SELECT id FROM vendas WHERE user_id = auth.uid() OR user_id IS NULL)
  )
  WITH CHECK (
    venda_id IN (SELECT id FROM vendas WHERE user_id = auth.uid() OR user_id IS NULL)
    AND subscription_active()
  );

-- ordens_servico
DROP POLICY IF EXISTS "ordens_servico isolated by user" ON public.ordens_servico;
CREATE POLICY "ordens_servico isolated by user" ON public.ordens_servico FOR ALL TO authenticated
  USING  (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() AND subscription_active());

-- os_itens (isola via OS pai)
DROP POLICY IF EXISTS "os_itens isolated by user" ON public.os_itens;
CREATE POLICY "os_itens isolated by user" ON public.os_itens FOR ALL TO authenticated
  USING (
    os_id IN (SELECT id FROM ordens_servico WHERE user_id = auth.uid() OR user_id IS NULL)
  )
  WITH CHECK (
    os_id IN (SELECT id FROM ordens_servico WHERE user_id = auth.uid() OR user_id IS NULL)
    AND subscription_active()
  );

-- veiculos
DROP POLICY IF EXISTS "veiculos isolated by user" ON public.veiculos;
CREATE POLICY "veiculos isolated by user" ON public.veiculos FOR ALL TO authenticated
  USING  (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() AND subscription_active());

-- quartos
DROP POLICY IF EXISTS "quartos isolated by user" ON public.quartos;
CREATE POLICY "quartos isolated by user" ON public.quartos FOR ALL TO authenticated
  USING  (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() AND subscription_active());

-- reservas
DROP POLICY IF EXISTS "reservas isolated by user" ON public.reservas;
CREATE POLICY "reservas isolated by user" ON public.reservas FOR ALL TO authenticated
  USING  (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() AND subscription_active());

-- reserva_consumos (isola via reserva pai)
DROP POLICY IF EXISTS "reserva_consumos isolated by user" ON public.reserva_consumos;
CREATE POLICY "reserva_consumos isolated by user" ON public.reserva_consumos FOR ALL TO authenticated
  USING (
    reserva_id IN (SELECT id FROM reservas WHERE user_id = auth.uid() OR user_id IS NULL)
  )
  WITH CHECK (
    reserva_id IN (SELECT id FROM reservas WHERE user_id = auth.uid() OR user_id IS NULL)
    AND subscription_active()
  );

-- movimentacoes_extras
DROP POLICY IF EXISTS "movimentacoes_extras isolated by user" ON public.movimentacoes_extras;
CREATE POLICY "movimentacoes_extras isolated by user" ON public.movimentacoes_extras FOR ALL TO authenticated
  USING  (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() AND subscription_active());

-- caixas
DROP POLICY IF EXISTS "caixas isolated by user" ON public.caixas;
CREATE POLICY "caixas isolated by user" ON public.caixas FOR ALL TO authenticated
  USING  (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() AND subscription_active());
