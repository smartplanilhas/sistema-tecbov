CREATE TABLE reproducao_estacoes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome        TEXT        NOT NULL,
  descricao   TEXT,
  data_inicio DATE        NOT NULL,
  data_fim    DATE        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX reproducao_estacoes_tenant_idx ON reproducao_estacoes(tenant_id);
