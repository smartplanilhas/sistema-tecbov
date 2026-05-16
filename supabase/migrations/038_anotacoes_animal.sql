CREATE TABLE anotacoes_animal (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  animal_id  UUID        NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  data       DATE        NOT NULL DEFAULT CURRENT_DATE,
  tipo       TEXT        NOT NULL DEFAULT 'geral',
  texto      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON anotacoes_animal (animal_id, data DESC, created_at DESC);
CREATE INDEX ON anotacoes_animal (tenant_id);
