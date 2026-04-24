-- Add user_id to caixas so each user has their own cash register
ALTER TABLE caixas ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Index for fast lookup by user + date
CREATE INDEX IF NOT EXISTS caixas_user_id_data_idx ON caixas(user_id, data);
