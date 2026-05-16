-- ────────────────────────────────────────────────────────────────────────────
-- 010_payment_methods.sql
-- Formas de pagamento por tenant.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE payment_methods (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                 TEXT        NOT NULL,
  financial_account_id UUID        REFERENCES financial_accounts(id) ON DELETE SET NULL,
  active               BOOLEAN     NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payment_methods_tenant_idx ON payment_methods(tenant_id);

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_methods_select" ON payment_methods
  FOR SELECT USING (tenant_id IN (SELECT user_tenant_ids()));

CREATE POLICY "payment_methods_insert_admin" ON payment_methods
  FOR INSERT WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "payment_methods_update_admin" ON payment_methods
  FOR UPDATE USING (is_tenant_admin(tenant_id));

CREATE POLICY "payment_methods_delete_admin" ON payment_methods
  FOR DELETE USING (is_tenant_admin(tenant_id));
