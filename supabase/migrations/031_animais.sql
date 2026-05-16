-- ─── categorias_animal ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS categorias_animal (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- null = padrão global
  nome       TEXT NOT NULL,
  sexo       TEXT NOT NULL CHECK (sexo IN ('M', 'F')),
  ordem      INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categorias_animal_tenant ON categorias_animal(tenant_id);

ALTER TABLE categorias_animal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "global and tenant categories visible" ON categorias_animal;
CREATE POLICY "global and tenant categories visible"
  ON categorias_animal FOR SELECT
  USING (tenant_id IS NULL OR tenant_id IN (SELECT user_tenant_ids()));

DROP POLICY IF EXISTS "tenant members can manage custom categories" ON categorias_animal;
CREATE POLICY "tenant members can manage custom categories"
  ON categorias_animal FOR ALL
  USING (tenant_id IN (SELECT user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT user_tenant_ids()));

-- Seed global
INSERT INTO categorias_animal (nome, sexo, ordem) VALUES
  ('Bezerro', 'M', 1),
  ('Bezerra', 'F', 2),
  ('Garrote', 'M', 3),
  ('Novilha', 'F', 4),
  ('Boi',     'M', 5),
  ('Touro',   'M', 6),
  ('Vaca',    'F', 7)
ON CONFLICT DO NOTHING;

-- ─── animals ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS animals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fazenda_id   UUID NOT NULL REFERENCES fazendas(id),
  categoria_id UUID REFERENCES categorias_animal(id),

  -- Identificação
  brinco       TEXT,
  identificador TEXT,
  sisbov       TEXT,
  registro     TEXT,
  rfid         TEXT,
  nome         TEXT,
  raca         TEXT,

  -- Sexo (preenchido automaticamente via categoria, armazenado para filtros)
  sexo         TEXT NOT NULL CHECK (sexo IN ('M', 'F')),

  -- Origem
  origem       TEXT CHECK (origem IN ('compra', 'nascimento', 'transferencia')),
  fornecedor_origem_id UUID,  -- FK futura → people

  -- Status
  status       TEXT NOT NULL DEFAULT 'ativo'
                 CHECK (status IN ('ativo', 'vendido', 'morto', 'transferido')),

  -- Datas
  data_nascimento DATE,
  data_compra     DATE,
  data_entrada    DATE,
  data_saida      DATE,
  data_desmama    DATE,

  -- Localização / propriedade (FKs futuras)
  local_atual_id       UUID,  -- → locais
  proprietario_atual_id UUID, -- → pessoas
  lote_atual_id        UUID,  -- → lotes

  -- Filiação
  pai_id UUID REFERENCES animals(id) ON DELETE SET NULL,
  mae_id UUID REFERENCES animals(id) ON DELETE SET NULL,

  -- Cache de peso (atualizado por trigger)
  peso_inicial       NUMERIC(8,3),
  data_peso_inicial  DATE,
  peso_atual         NUMERIC(8,3),
  data_peso_atual    DATE,
  total_pesagens     INTEGER NOT NULL DEFAULT 0,

  -- GMD (atualizado por trigger)
  gmd_geral             NUMERIC(8,3),
  gmd_geral_duracao     INTEGER,
  gmd_geral_ganho_peso  NUMERIC(8,3),
  gmd_ultimo            NUMERIC(8,3),
  gmd_ultimo_duracao    INTEGER,
  gmd_ultimo_ganho_peso NUMERIC(8,3),

  observacoes TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_animals_tenant       ON animals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_animals_fazenda      ON animals(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_animals_categoria    ON animals(categoria_id);
CREATE INDEX IF NOT EXISTS idx_animals_status       ON animals(tenant_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_animals_brinco ON animals(tenant_id, fazenda_id, brinco)
  WHERE brinco IS NOT NULL;

ALTER TABLE animals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant members can select animals" ON animals;
CREATE POLICY "tenant members can select animals"
  ON animals FOR SELECT
  USING (tenant_id IN (SELECT user_tenant_ids()));

DROP POLICY IF EXISTS "tenant members can manage animals" ON animals;
CREATE POLICY "tenant members can manage animals"
  ON animals FOR ALL
  USING (tenant_id IN (SELECT user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT user_tenant_ids()));

-- ─── pesagens ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pesagens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  animal_id  UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  fazenda_id UUID REFERENCES fazendas(id),

  peso       NUMERIC(8,3) NOT NULL CHECK (peso > 0),
  data       DATE NOT NULL,
  tipo       TEXT NOT NULL DEFAULT 'controle'
               CHECK (tipo IN ('entrada', 'controle', 'saida', 'venda')),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pesagens_animal ON pesagens(animal_id, data);
CREATE INDEX IF NOT EXISTS idx_pesagens_tenant ON pesagens(tenant_id);

ALTER TABLE pesagens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant members can select pesagens" ON pesagens;
CREATE POLICY "tenant members can select pesagens"
  ON pesagens FOR SELECT
  USING (tenant_id IN (SELECT user_tenant_ids()));

DROP POLICY IF EXISTS "tenant members can manage pesagens" ON pesagens;
CREATE POLICY "tenant members can manage pesagens"
  ON pesagens FOR ALL
  USING (tenant_id IN (SELECT user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT user_tenant_ids()));

-- ─── Trigger: atualiza resumo de peso e GMD no animal ─────────────────────────

CREATE OR REPLACE FUNCTION fn_update_animal_weight_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_animal_id UUID;
  v_total     INTEGER;
  v_first_peso NUMERIC; v_first_data DATE;
  v_last_peso  NUMERIC; v_last_data  DATE;
  v_prev_peso  NUMERIC; v_prev_data  DATE;
BEGIN
  v_animal_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.animal_id ELSE NEW.animal_id END;

  SELECT COUNT(*) INTO v_total FROM pesagens WHERE animal_id = v_animal_id;

  IF v_total = 0 THEN
    UPDATE animals SET
      peso_inicial = NULL, data_peso_inicial = NULL,
      peso_atual   = NULL, data_peso_atual   = NULL,
      total_pesagens = 0,
      gmd_geral = NULL, gmd_geral_duracao = NULL, gmd_geral_ganho_peso = NULL,
      gmd_ultimo = NULL, gmd_ultimo_duracao = NULL, gmd_ultimo_ganho_peso = NULL,
      updated_at = now()
    WHERE id = v_animal_id;
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT peso, data INTO v_first_peso, v_first_data
    FROM pesagens WHERE animal_id = v_animal_id ORDER BY data ASC,  created_at ASC  LIMIT 1;

  SELECT peso, data INTO v_last_peso, v_last_data
    FROM pesagens WHERE animal_id = v_animal_id ORDER BY data DESC, created_at DESC LIMIT 1;

  SELECT peso, data INTO v_prev_peso, v_prev_data
    FROM pesagens WHERE animal_id = v_animal_id ORDER BY data DESC, created_at DESC LIMIT 1 OFFSET 1;

  UPDATE animals SET
    peso_inicial      = v_first_peso,
    data_peso_inicial = v_first_data,
    peso_atual        = v_last_peso,
    data_peso_atual   = v_last_data,
    total_pesagens    = v_total,

    gmd_geral_ganho_peso = CASE WHEN v_total >= 2 THEN v_last_peso - v_first_peso ELSE NULL END,
    gmd_geral_duracao    = CASE WHEN v_total >= 2 THEN (v_last_data - v_first_data) ELSE NULL END,
    gmd_geral = CASE
      WHEN v_total >= 2 AND (v_last_data - v_first_data) > 0
      THEN ROUND((v_last_peso - v_first_peso) / (v_last_data - v_first_data), 3)
      ELSE NULL END,

    gmd_ultimo_ganho_peso = CASE WHEN v_prev_data IS NOT NULL THEN v_last_peso - v_prev_peso ELSE NULL END,
    gmd_ultimo_duracao    = CASE WHEN v_prev_data IS NOT NULL THEN (v_last_data - v_prev_data) ELSE NULL END,
    gmd_ultimo = CASE
      WHEN v_prev_data IS NOT NULL AND (v_last_data - v_prev_data) > 0
      THEN ROUND((v_last_peso - v_prev_peso) / (v_last_data - v_prev_data), 3)
      ELSE NULL END,

    updated_at = now()
  WHERE id = v_animal_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_animal_weight_summary ON pesagens;
CREATE TRIGGER trg_animal_weight_summary
AFTER INSERT OR UPDATE OR DELETE ON pesagens
FOR EACH ROW EXECUTE FUNCTION fn_update_animal_weight_summary();
