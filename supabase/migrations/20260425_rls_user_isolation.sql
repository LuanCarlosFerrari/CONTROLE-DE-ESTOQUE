-- ── Adiciona user_id às tabelas que não têm (IF NOT EXISTS = seguro para reexecutar)
ALTER TABLE produtos     ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE clientes     ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE vendas       ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE mesas        ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Índices para queries filtradas por usuário
CREATE INDEX IF NOT EXISTS idx_produtos_user_id     ON produtos(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_user_id     ON clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_vendas_user_id       ON vendas(user_id);
CREATE INDEX IF NOT EXISTS idx_mesas_user_id        ON mesas(user_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_user_id ON fornecedores(user_id);

-- ── Remove políticas permissivas antigas ────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can do everything on produtos"      ON produtos;
DROP POLICY IF EXISTS "Authenticated users can do everything on clientes"      ON clientes;
DROP POLICY IF EXISTS "Authenticated users can do everything on vendas"        ON vendas;
DROP POLICY IF EXISTS "Authenticated users can do everything on venda_itens"   ON venda_itens;
DROP POLICY IF EXISTS "Authenticated users can do everything on mesas"         ON mesas;
DROP POLICY IF EXISTS "Authenticated users can do everything on comanda_itens" ON comanda_itens;
DROP POLICY IF EXISTS "Authenticated users can do everything on fornecedores"  ON fornecedores;
DROP POLICY IF EXISTS "authenticated can manage parcelas_crediario"            ON parcelas_crediario;

-- ── Novas políticas com isolamento por user_id ──────────────────────────────
-- user_id IS NULL cobre dados legados (criados antes da coluna existir)

CREATE POLICY "produtos isolated by user"
  ON produtos FOR ALL TO authenticated
  USING  (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "clientes isolated by user"
  ON clientes FOR ALL TO authenticated
  USING  (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "vendas isolated by user"
  ON vendas FOR ALL TO authenticated
  USING  (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid());

-- venda_itens não tem user_id direto — protege via tabela pai
CREATE POLICY "venda_itens isolated by user"
  ON venda_itens FOR ALL TO authenticated
  USING (
    venda_id IN (SELECT id FROM vendas WHERE user_id = auth.uid() OR user_id IS NULL)
  )
  WITH CHECK (
    venda_id IN (SELECT id FROM vendas WHERE user_id = auth.uid() OR user_id IS NULL)
  );

CREATE POLICY "mesas isolated by user"
  ON mesas FOR ALL TO authenticated
  USING  (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid());

-- comanda_itens protege via mesa pai
CREATE POLICY "comanda_itens isolated by user"
  ON comanda_itens FOR ALL TO authenticated
  USING (
    mesa_id IN (SELECT id FROM mesas WHERE user_id = auth.uid() OR user_id IS NULL)
  )
  WITH CHECK (
    mesa_id IN (SELECT id FROM mesas WHERE user_id = auth.uid() OR user_id IS NULL)
  );

CREATE POLICY "fornecedores isolated by user"
  ON fornecedores FOR ALL TO authenticated
  USING  (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid());

-- parcelas_crediario protege via venda pai
CREATE POLICY "parcelas_crediario isolated by user"
  ON parcelas_crediario FOR ALL TO authenticated
  USING (
    venda_id IN (SELECT id FROM vendas WHERE user_id = auth.uid() OR user_id IS NULL)
  )
  WITH CHECK (
    venda_id IN (SELECT id FROM vendas WHERE user_id = auth.uid() OR user_id IS NULL)
  );
