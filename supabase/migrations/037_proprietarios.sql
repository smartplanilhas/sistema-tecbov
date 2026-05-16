CREATE TABLE IF NOT EXISTS proprietarios (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE proprietarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prop_select" ON proprietarios;
CREATE POLICY "prop_select" ON proprietarios FOR SELECT
  USING (tenant_id IN (SELECT user_tenant_ids()));

DROP POLICY IF EXISTS "prop_insert" ON proprietarios;
CREATE POLICY "prop_insert" ON proprietarios FOR INSERT
  WITH CHECK (tenant_id IN (SELECT user_tenant_ids()));

DROP POLICY IF EXISTS "prop_update" ON proprietarios;
CREATE POLICY "prop_update" ON proprietarios FOR UPDATE
  USING (tenant_id IN (SELECT user_tenant_ids()));

DROP POLICY IF EXISTS "prop_delete" ON proprietarios;
CREATE POLICY "prop_delete" ON proprietarios FOR DELETE
  USING (tenant_id IN (SELECT user_tenant_ids()));
