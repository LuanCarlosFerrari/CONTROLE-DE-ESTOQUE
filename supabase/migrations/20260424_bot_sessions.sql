-- Tabela de sessões do bot Telegram
CREATE TABLE IF NOT EXISTS bot_sessions (
  chat_id   bigint PRIMARY KEY,
  state     text    NOT NULL DEFAULT 'UNLINKED',
  user_id   uuid    REFERENCES auth.users(id) ON DELETE CASCADE,
  context   jsonb   NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RPC para buscar user_id pelo e-mail (Edge Function não acessa auth.users diretamente)
CREATE OR REPLACE FUNCTION get_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
$$;
