-- ── Adiciona user_id às tabelas de oficina, hotel e caixa que ainda não têm
ALTER TABLE ordens_servico     ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE veiculos           ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE quartos            ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE reservas           ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE movimentacoes_extras ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ordens_servico_user_id ON ordens_servico(user_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_user_id       ON veiculos(user_id);
CREATE INDEX IF NOT EXISTS idx_quartos_user_id        ON quartos(user_id);
CREATE INDEX IF NOT EXISTS idx_reservas_user_id       ON reservas(user_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_user_id  ON movimentacoes_extras(user_id);

-- ── Habilitar RLS nas tabelas que ainda não têm
ALTER TABLE ordens_servico      ENABLE ROW LEVEL SECURITY;
ALTER TABLE veiculos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE quartos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_itens            ENABLE ROW LEVEL SECURITY;
ALTER TABLE reserva_consumos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE caixas              ENABLE ROW LEVEL SECURITY;

-- ── Remove políticas permissivas antigas
DROP POLICY IF EXISTS "Authenticated users can do everything on ordens_servico"      ON ordens_servico;
DROP POLICY IF EXISTS "Authenticated users can do everything on veiculos"            ON veiculos;
DROP POLICY IF EXISTS "Authenticated users can do everything on quartos"             ON quartos;
DROP POLICY IF EXISTS "Authenticated users can do everything on reservas"            ON reservas;
DROP POLICY IF EXISTS "Authenticated users can do everything on movimentacoes_extras" ON movimentacoes_extras;
DROP POLICY IF EXISTS "Authenticated users can do everything on os_itens"            ON os_itens;
DROP POLICY IF EXISTS "Authenticated users can do everything on reserva_consumos"    ON reserva_consumos;
DROP POLICY IF EXISTS "Authenticated users can do everything on caixas"              ON caixas;

-- ── Novas políticas com isolamento por user_id
-- user_id IS NULL cobre dados legados criados antes da coluna existir

CREATE POLICY "ordens_servico isolated by user"
  ON ordens_servico FOR ALL TO authenticated
  USING  (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "veiculos isolated by user"
  ON veiculos FOR ALL TO authenticated
  USING  (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "quartos isolated by user"
  ON quartos FOR ALL TO authenticated
  USING  (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reservas isolated by user"
  ON reservas FOR ALL TO authenticated
  USING  (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "movimentacoes_extras isolated by user"
  ON movimentacoes_extras FOR ALL TO authenticated
  USING  (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "caixas isolated by user"
  ON caixas FOR ALL TO authenticated
  USING  (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid());

-- os_itens protege via ordens_servico pai
CREATE POLICY "os_itens isolated by user"
  ON os_itens FOR ALL TO authenticated
  USING (
    os_id IN (SELECT id FROM ordens_servico WHERE user_id = auth.uid() OR user_id IS NULL)
  )
  WITH CHECK (
    os_id IN (SELECT id FROM ordens_servico WHERE user_id = auth.uid() OR user_id IS NULL)
  );

-- reserva_consumos protege via reservas pai
CREATE POLICY "reserva_consumos isolated by user"
  ON reserva_consumos FOR ALL TO authenticated
  USING (
    reserva_id IN (SELECT id FROM reservas WHERE user_id = auth.uid() OR user_id IS NULL)
  )
  WITH CHECK (
    reserva_id IN (SELECT id FROM reservas WHERE user_id = auth.uid() OR user_id IS NULL)
  );
