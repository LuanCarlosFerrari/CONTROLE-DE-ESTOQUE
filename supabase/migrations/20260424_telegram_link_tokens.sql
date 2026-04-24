CREATE TABLE IF NOT EXISTS telegram_link_tokens (
  token      text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '15 minutes',
  used_at    timestamptz
);

CREATE OR REPLACE FUNCTION create_telegram_link_token(p_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO telegram_link_tokens (user_id)
  VALUES (p_user_id)
  RETURNING token;
$$;
