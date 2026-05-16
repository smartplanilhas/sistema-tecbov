-- ────────────────────────────────────────────────────────────────────────────
-- 008_financial_account_default.sql
-- Adds is_default to financial_accounts.
-- Auto-creates "Caixa Interno" on new tenant creation.
-- Backfills existing tenants.
-- ────────────────────────────────────────────────────────────────────────────

-- ── 1. Add column ─────────────────────────────────────────────────────────────

ALTER TABLE financial_accounts
  ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT false;

-- ── 2. Trigger: enforce single default per tenant ─────────────────────────────

CREATE OR REPLACE FUNCTION trg_enforce_single_default_account()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE financial_accounts
  SET is_default = false
  WHERE tenant_id = NEW.tenant_id
    AND id != NEW.id
    AND is_default = true;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_financial_account_one_default
  AFTER INSERT OR UPDATE OF is_default ON financial_accounts
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION trg_enforce_single_default_account();

-- ── 3. Initialize "Caixa Interno" per new tenant ──────────────────────────────

CREATE OR REPLACE FUNCTION initialize_financial_account_defaults(p_tenant_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM financial_accounts WHERE tenant_id = p_tenant_id) THEN
    RETURN;
  END IF;

  INSERT INTO financial_accounts (tenant_id, name, type, balance, is_default, active)
  VALUES (p_tenant_id, 'Caixa Interno', 'CASH', 0, true, true);
END;
$$;

GRANT EXECUTE ON FUNCTION initialize_financial_account_defaults(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION trg_init_financial_account_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM initialize_financial_account_defaults(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenant_financial_account_defaults ON tenants;
CREATE TRIGGER trg_tenant_financial_account_defaults
  AFTER INSERT ON tenants
  FOR EACH ROW EXECUTE FUNCTION trg_init_financial_account_defaults();

-- ── 4. Backfill existing tenants ──────────────────────────────────────────────

-- Create "Caixa Interno" for tenants with no accounts yet
DO $$
DECLARE t_id UUID;
BEGIN
  FOR t_id IN SELECT id FROM tenants LOOP
    PERFORM initialize_financial_account_defaults(t_id);
  END LOOP;
END;
$$;

-- Set the earliest account as default for tenants with accounts but still no default
UPDATE financial_accounts
SET is_default = true
WHERE id IN (
  SELECT DISTINCT ON (tenant_id) id
  FROM financial_accounts
  WHERE tenant_id NOT IN (
    SELECT tenant_id FROM financial_accounts WHERE is_default = true
  )
  ORDER BY tenant_id, created_at
);
