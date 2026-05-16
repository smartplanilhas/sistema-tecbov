CREATE TABLE IF NOT EXISTS sanidade_eventos (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  animal_id     UUID        NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  tipo          TEXT        NOT NULL CHECK (tipo IN ('vacinacao','vermifugacao','medicacao','procedimento','exame','outro')),
  data          DATE        NOT NULL,
  descricao     TEXT        NOT NULL,
  dados         JSONB       NOT NULL DEFAULT '{}',
  observacoes   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON sanidade_eventos(tenant_id);
CREATE INDEX ON sanidade_eventos(animal_id);
CREATE INDEX ON sanidade_eventos(data DESC);

ALTER TABLE sanidade_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON sanidade_eventos
  USING (tenant_id IN (SELECT id FROM tenants));
