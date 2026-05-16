CREATE TABLE IF NOT EXISTS system_alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  module      TEXT NOT NULL,
  severity    TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  title       TEXT NOT NULL,
  message     TEXT,
  link        TEXT,
  read        BOOLEAN NOT NULL DEFAULT false,
  resolved    BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS system_alerts_tenant_id_idx ON system_alerts (tenant_id);
CREATE INDEX IF NOT EXISTS system_alerts_resolved_idx  ON system_alerts (tenant_id, resolved);

ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant members can view alerts" ON system_alerts;
CREATE POLICY "tenant members can view alerts"
  ON system_alerts FOR SELECT
  USING (tenant_id IN (SELECT user_tenant_ids()));

DROP POLICY IF EXISTS "service role manages alerts" ON system_alerts;
CREATE POLICY "service role manages alerts"
  ON system_alerts FOR ALL
  USING (true)
  WITH CHECK (true);
