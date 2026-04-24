-- ── Config ────────────────────────────────────────────────────────────────
ALTER DATABASE postgres SET app.notify_secret = 'notify_stk_eX7pK2mQ';

-- ── RPC: parcelas vencidas por usuário (via join com vendas) ──────────────
CREATE OR REPLACE FUNCTION get_parcelas_vencidas_usuario(p_user_id uuid)
RETURNS TABLE(
  cliente_nome    text,
  valor           numeric,
  data_vencimento date,
  numero          integer,
  total_parcelas  integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.cliente_nome, p.valor, p.data_vencimento, p.numero, p.total_parcelas
  FROM parcelas_crediario p
  JOIN vendas v ON v.id = p.venda_id
  WHERE v.user_id = p_user_id
    AND p.status = 'pendente'
    AND p.data_vencimento <= CURRENT_DATE
  ORDER BY p.data_vencimento
  LIMIT 10;
$$;

-- ── Helper: chama a Edge Function telegram-notify via pg_net ──────────────
CREATE OR REPLACE FUNCTION notify_telegram(
  p_user_id uuid,
  p_type    text,
  p_payload jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_secret text := current_setting('app.notify_secret', true);
  v_url    text := 'https://ucmxycxqpzyiucdidvit.supabase.co/functions/v1/telegram-notify';
BEGIN
  PERFORM net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',    'application/json',
      'X-Notify-Secret', v_secret
    ),
    body    := jsonb_build_object(
      'type',    p_type,
      'user_id', p_user_id,
      'payload', p_payload
    )
  );
END;
$$;

-- ── Trigger: estoque baixo ─────────────────────────────────────────────────
-- Dispara apenas quando a quantidade cruza o limite mínimo para baixo
CREATE OR REPLACE FUNCTION trg_fn_estoque_baixo()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.estoque_minimo IS NOT NULL
     AND NEW.quantidade  <= NEW.estoque_minimo
     AND OLD.quantidade  >  OLD.estoque_minimo
  THEN
    PERFORM notify_telegram(
      NEW.user_id,
      'estoque_baixo',
      jsonb_build_object(
        'nome',           NEW.nome,
        'quantidade',     NEW.quantidade,
        'estoque_minimo', NEW.estoque_minimo
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_estoque_baixo ON produtos;
CREATE TRIGGER tg_estoque_baixo
  AFTER UPDATE ON produtos
  FOR EACH ROW EXECUTE FUNCTION trg_fn_estoque_baixo();

-- ── Trigger: nova OS aberta ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_fn_nova_os()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_veiculo text;
BEGIN
  SELECT vc.placa || ' · ' || vc.modelo
  INTO v_veiculo
  FROM veiculos vc
  WHERE vc.id = NEW.veiculo_id;

  PERFORM notify_telegram(
    NEW.user_id,
    'nova_os',
    jsonb_build_object(
      'numero',  NEW.numero,
      'status',  NEW.status,
      'veiculo', COALESCE(v_veiculo, '')
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_nova_os ON ordens_servico;
CREATE TRIGGER tg_nova_os
  AFTER INSERT ON ordens_servico
  FOR EACH ROW EXECUTE FUNCTION trg_fn_nova_os();

-- ── pg_cron: resumo matinal 8h BRT (= 11:00 UTC) ─────────────────────────
DO $$
BEGIN
  PERFORM cron.unschedule('resumo-matinal');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'resumo-matinal',
  '0 11 * * *',
  $$SELECT notify_telegram(NULL, 'resumo_matinal', '{}')$$
);
