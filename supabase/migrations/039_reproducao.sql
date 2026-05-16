CREATE TABLE reproducao_eventos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  animal_id   UUID        NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  tipo        TEXT        NOT NULL, -- 'inseminacao' | 'monta_natural' | 'diagnostico' | 'parto'
  data        DATE        NOT NULL,
  dados       JSONB       NOT NULL DEFAULT '{}',
  observacoes TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON reproducao_eventos (animal_id, data DESC, created_at DESC);
CREATE INDEX ON reproducao_eventos (tenant_id, data DESC);
CREATE INDEX ON reproducao_eventos (tenant_id, tipo);
