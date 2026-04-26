-- PIX configuration columns on subscriptions table
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS pix_chave  text,
  ADD COLUMN IF NOT EXISTS pix_nome   text,
  ADD COLUMN IF NOT EXISTS pix_cidade text;
