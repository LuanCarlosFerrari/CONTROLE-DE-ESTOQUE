-- Recria notify_telegram usando current_setting quando disponível, ou fallback seguro
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
  v_secret text := current_setting('app.notify_secret',   true);
  v_base   text := current_setting('app.supabase_url',    true);
  v_url    text;
BEGIN
  v_url := coalesce(v_base, 'https://ucmxycxqpzyiucdidvit.supabase.co')
           || '/functions/v1/telegram-notify';

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
