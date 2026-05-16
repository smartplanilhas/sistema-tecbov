CREATE TABLE IF NOT EXISTS medicamentos (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  nome            TEXT        NOT NULL,
  dias_carencia   INTEGER     CHECK (dias_carencia >= 0),
  instrucoes_uso  TEXT,

  status          TEXT        NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medicamentos_tenant ON medicamentos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_medicamentos_status ON medicamentos(tenant_id, status);

ALTER TABLE medicamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant members can manage medicamentos"
  ON medicamentos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.tenant_id = medicamentos.tenant_id
        AND memberships.user_id = auth.uid()
    )
  );
