-- ────────────────────────────────────────────────────────────────────────────
-- 011_payment_methods_seed.sql
-- Seeds default payment methods on new tenant creation.
-- Backfills existing tenants without any payment methods.
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION initialize_payment_method_defaults(p_tenant_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM payment_methods WHERE tenant_id = p_tenant_id) THEN
    RETURN;
  END IF;

  INSERT INTO payment_methods (tenant_id, name, active)
  VALUES
    (p_tenant_id, 'Dinheiro',             true),
    (p_tenant_id, 'PIX',                  true),
    (p_tenant_id, 'Cartão de Débito',     true),
    (p_tenant_id, 'Cartão de Crédito',    true),
    (p_tenant_id, 'Transferência Bancária', true);
END;
$$;

GRANT EXECUTE ON FUNCTION initialize_payment_method_defaults(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION trg_init_payment_method_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM initialize_payment_method_defaults(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenant_payment_method_defaults ON tenants;
CREATE TRIGGER trg_tenant_payment_method_defaults
  AFTER INSERT ON tenants
  FOR EACH ROW EXECUTE FUNCTION trg_init_payment_method_defaults();

-- Backfill existing tenants without payment methods
DO $$
DECLARE t_id UUID;
BEGIN
  FOR t_id IN SELECT id FROM tenants LOOP
    PERFORM initialize_payment_method_defaults(t_id);
  END LOOP;
END;
$$;
