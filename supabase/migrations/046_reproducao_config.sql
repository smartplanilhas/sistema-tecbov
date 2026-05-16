CREATE TABLE IF NOT EXISTS reproducao_config (
  tenant_id     uuid    PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  dias_lactacao integer NOT NULL DEFAULT 210
);

ALTER TABLE reproducao_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON reproducao_config
  USING (tenant_id IN (SELECT id FROM tenants WHERE slug = current_setting('app.tenant_slug', true)));
