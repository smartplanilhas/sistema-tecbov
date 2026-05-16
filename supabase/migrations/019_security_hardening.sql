-- ============================================================
-- 019_security_hardening.sql
-- Fecha todas as brechas de RLS + auditoria + validações
-- ============================================================

-- =====================
-- 1. HABILITAR RLS nas tabelas que estão abertas
-- =====================

ALTER TABLE tenants                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_alerts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tenant_transaction_counters ENABLE ROW LEVEL SECURITY;

-- =====================
-- 2. TENANTS — adicionar DELETE e corrigir INSERT (limite por usuário)
-- =====================

CREATE OR REPLACE FUNCTION user_admin_tenant_count()
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM memberships
  WHERE user_id = auth.uid() AND role = 'admin'
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "tenants_insert" ON tenants;
CREATE POLICY "tenants_insert_limited" ON tenants
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_admin_tenant_count() < 10
  );

CREATE POLICY "tenants_delete_admin" ON tenants
  FOR DELETE USING (is_tenant_admin(id));

-- =====================
-- 3. MEMBERSHIPS — bloquear auto-escalada de role
-- =====================

CREATE POLICY "memberships_update_admin_only" ON memberships
  FOR UPDATE
  USING (is_tenant_admin(tenant_id))
  WITH CHECK (is_tenant_admin(tenant_id));

-- =====================
-- 4. FINANCIAL ACCOUNTS — DELETE faltava
-- =====================

CREATE POLICY "financial_accounts_delete_admin" ON financial_accounts
  FOR DELETE USING (is_tenant_admin(tenant_id));

-- =====================
-- 5. PEOPLE — DELETE restrito a admin
-- =====================

DROP POLICY IF EXISTS "people_delete" ON people;
CREATE POLICY "people_delete_admin" ON people
  FOR DELETE USING (is_tenant_admin(tenant_id));

-- =====================
-- 6. SYSTEM_ALERTS / TENANT_TRANSACTION_COUNTERS
--    Sem policies = acesso negado a anon/authenticated
--    Service role (SECURITY DEFINER) continua funcionando
-- =====================

-- =====================
-- 7. CROSS-TENANT VALIDATION
-- =====================

CREATE OR REPLACE FUNCTION validate_transaction_tenant()
RETURNS TRIGGER AS $$
DECLARE
  acct_tenant UUID;
BEGIN
  IF NEW.account_id IS NOT NULL THEN
    SELECT tenant_id INTO acct_tenant
    FROM financial_accounts
    WHERE id = NEW.account_id;

    IF acct_tenant IS DISTINCT FROM NEW.tenant_id THEN
      RAISE EXCEPTION 'security violation: account_id belongs to a different tenant';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_validate_transaction_tenant ON transactions;
CREATE TRIGGER trg_validate_transaction_tenant
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION validate_transaction_tenant();

-- =====================
-- 8. AUDIT LOG
-- =====================

CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        REFERENCES tenants(id) ON DELETE SET NULL,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT        NOT NULL,
  table_name  TEXT        NOT NULL,
  record_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user   ON audit_log(user_id,   created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_select_admin" ON audit_log
  FOR SELECT USING (is_tenant_admin(tenant_id));

CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log(tenant_id, user_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    COALESCE(
      (CASE WHEN TG_OP <> 'DELETE' THEN (NEW::jsonb->>'tenant_id')::UUID ELSE NULL END),
      (OLD::jsonb->>'tenant_id')::UUID
    ),
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(
      (CASE WHEN TG_OP <> 'DELETE' THEN (NEW::jsonb->>'id')::UUID ELSE NULL END),
      (OLD::jsonb->>'id')::UUID
    ),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_memberships ON memberships;
CREATE TRIGGER trg_audit_memberships
  AFTER INSERT OR UPDATE OR DELETE ON memberships
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_transactions ON transactions;
CREATE TRIGGER trg_audit_transactions
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();
