-- Ativa a assinatura de um usuário por N meses.
-- SECURITY DEFINER → roda como 'postgres', passa pelo trigger guard_subscription_fields.
-- Chamada pela Edge Function activate-user (service role) — nunca pelo cliente.
CREATE OR REPLACE FUNCTION public.activate_subscription(
  p_user_id uuid,
  p_months  int DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.subscriptions
  SET
    status               = 'active',
    -- Prolonga a partir do fim atual se ainda ativo, senão a partir de agora
    subscription_ends_at = GREATEST(COALESCE(subscription_ends_at, now()), now())
                           + (p_months || ' months')::interval
  WHERE user_id = p_user_id;
END;
$$;
