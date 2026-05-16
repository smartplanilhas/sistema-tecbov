CREATE TABLE movimentacoes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  animal_id         UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,

  -- Tipo de evento
  tipo              TEXT NOT NULL CHECK (tipo IN (
    'entrada',           -- animal entrou no sistema com lote/local já definidos
    'saida',             -- animal saiu (vendido, morto, transferido)
    'mudanca_lote',      -- apenas lote mudou
    'mudanca_local',     -- apenas local mudou
    'mudanca_lote_local' -- ambos mudaram simultaneamente
  )),

  -- Estado anterior (NULL = sem lote/local antes)
  lote_anterior_id  UUID REFERENCES lotes(id) ON DELETE SET NULL,
  local_anterior_id UUID REFERENCES locais(id) ON DELETE SET NULL,

  -- Estado novo (NULL = saiu do lote/local)
  lote_novo_id      UUID REFERENCES lotes(id) ON DELETE SET NULL,
  local_novo_id     UUID REFERENCES locais(id) ON DELETE SET NULL,

  -- Quando aconteceu
  data              DATE NOT NULL,

  -- Agrupa vários animais movidos juntos
  grupo_id          UUID,

  motivo            TEXT,
  observacoes       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para queries de rastreabilidade
CREATE INDEX idx_mov_animal_data   ON movimentacoes(animal_id, data DESC, created_at DESC);
CREATE INDEX idx_mov_tenant_data   ON movimentacoes(tenant_id, data DESC);
CREATE INDEX idx_mov_grupo         ON movimentacoes(grupo_id) WHERE grupo_id IS NOT NULL;
CREATE INDEX idx_mov_lote_novo     ON movimentacoes(lote_novo_id, data) WHERE lote_novo_id IS NOT NULL;
CREATE INDEX idx_mov_local_novo    ON movimentacoes(local_novo_id, data) WHERE local_novo_id IS NOT NULL;
CREATE INDEX idx_mov_lote_anterior ON movimentacoes(lote_anterior_id, data) WHERE lote_anterior_id IS NOT NULL;

ALTER TABLE movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "movs_select" ON movimentacoes FOR SELECT
  USING (tenant_id IN (SELECT user_tenant_ids()));
CREATE POLICY "movs_insert" ON movimentacoes FOR INSERT
  WITH CHECK (tenant_id IN (SELECT user_tenant_ids()));
CREATE POLICY "movs_delete" ON movimentacoes FOR DELETE
  USING (tenant_id IN (SELECT user_tenant_ids()));

-- ─── Função: estado do animal em qualquer data ────────────────────────────────

CREATE OR REPLACE FUNCTION fn_animal_estado_em(p_animal_id UUID, p_data DATE)
RETURNS TABLE(lote_id UUID, local_id UUID)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT lote_novo_id, local_novo_id
  FROM movimentacoes
  WHERE animal_id = p_animal_id
    AND data <= p_data
  ORDER BY data DESC, created_at DESC
  LIMIT 1;
$$;

-- ─── Função: animais em um lote em uma data ────────────────────────────────────
-- Retorna os animal_ids que estavam no lote p_lote_id na data p_data

CREATE OR REPLACE FUNCTION fn_animais_em_lote_em(p_lote_id UUID, p_data DATE)
RETURNS TABLE(animal_id UUID)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT DISTINCT ON (m.animal_id) m.animal_id
  FROM movimentacoes m
  WHERE m.data <= p_data
  ORDER BY m.animal_id, m.data DESC, m.created_at DESC
  -- Filter: last known state for each animal must have lote = p_lote_id
  -- (done in application layer or via subquery below)
$$ ;

-- Versão mais precisa usando subquery lateral
CREATE OR REPLACE FUNCTION fn_animais_em_lote_em(p_lote_id UUID, p_data DATE)
RETURNS TABLE(animal_id UUID)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT a.id
  FROM animals a
  CROSS JOIN LATERAL (
    SELECT lote_novo_id
    FROM movimentacoes m
    WHERE m.animal_id = a.id AND m.data <= p_data
    ORDER BY m.data DESC, m.created_at DESC
    LIMIT 1
  ) last_state
  WHERE last_state.lote_novo_id = p_lote_id
    AND a.tenant_id = (SELECT tenant_id FROM lotes WHERE id = p_lote_id);
$$;

-- ─── Função: animais em um local em uma data ──────────────────────────────────

CREATE OR REPLACE FUNCTION fn_animais_em_local_em(p_local_id UUID, p_data DATE)
RETURNS TABLE(animal_id UUID)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT a.id
  FROM animals a
  CROSS JOIN LATERAL (
    SELECT local_novo_id
    FROM movimentacoes m
    WHERE m.animal_id = a.id AND m.data <= p_data
    ORDER BY m.data DESC, m.created_at DESC
    LIMIT 1
  ) last_state
  WHERE last_state.local_novo_id = p_local_id
    AND a.tenant_id = (SELECT tenant_id FROM locais WHERE id = p_local_id);
$$;
