-- ────────────────────────────────────────────────────────────────────────────
-- 006_coa_simplified.sql
-- Simplifies the Chart of Accounts to a fixed 3-level structure:
--   Level 1: Fixed roots — "Receitas" (REVENUE) and "Despesas" (EXPENSE)
--   Level 2: Categories (always group, user-managed)
--   Level 3: Subitems (always analytical, user-managed — receives transactions)
-- Users cannot create root accounts; roots are auto-created per tenant.
-- ────────────────────────────────────────────────────────────────────────────

-- ── 1. Auto-initialize root accounts per tenant ──────────────────────────────

CREATE OR REPLACE FUNCTION initialize_coa_defaults(p_tenant_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM chart_of_accounts
    WHERE tenant_id = p_tenant_id AND parent_id IS NULL
  ) THEN
    RETURN;
  END IF;

  INSERT INTO chart_of_accounts
    (tenant_id, name, type, code, level, sort_order, parent_id, is_group, active)
  VALUES
    (p_tenant_id, 'Receitas', 'REVENUE', '1', 1, 1, NULL, true, true),
    (p_tenant_id, 'Despesas', 'EXPENSE', '2', 1, 2, NULL, true, true);
END;
$$;

GRANT EXECUTE ON FUNCTION initialize_coa_defaults(UUID) TO authenticated;

-- Trigger function
CREATE OR REPLACE FUNCTION trg_init_coa_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM initialize_coa_defaults(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenant_coa_defaults ON tenants;
CREATE TRIGGER trg_tenant_coa_defaults
  AFTER INSERT ON tenants
  FOR EACH ROW EXECUTE FUNCTION trg_init_coa_defaults();

-- Seed existing tenants that have no root accounts yet
DO $$
DECLARE t_id UUID;
BEGIN
  FOR t_id IN SELECT id FROM tenants LOOP
    PERFORM initialize_coa_defaults(t_id);
  END LOOP;
END;
$$;

-- ── 2. Updated create_coa_account ────────────────────────────────────────────
-- Root creation is blocked. Level and is_group are auto-determined.
-- Type is inherited from the parent (which ultimately comes from the level-1 root).

-- Drop first: return type changed from chart_of_accounts to UUID
DROP FUNCTION IF EXISTS create_coa_account(UUID, TEXT, TEXT, UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION create_coa_account(
  p_tenant_id UUID,
  p_name      TEXT,
  p_type      TEXT,     -- ignored: inherited from parent chain
  p_parent_id UUID,
  p_is_group  BOOLEAN   -- ignored: auto-determined by level
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_parent       chart_of_accounts%ROWTYPE;
  v_new_level    INTEGER;
  v_new_is_group BOOLEAN;
  v_next_sort    INTEGER;
  v_new_id       UUID;
BEGIN
  IF p_parent_id IS NULL THEN
    RAISE EXCEPTION 'Não é possível criar contas raiz. Use as categorias Receitas e Despesas existentes.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_tenant_id::text));

  SELECT * INTO v_parent
  FROM chart_of_accounts
  WHERE id = p_parent_id AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta pai não encontrada.';
  END IF;

  v_new_level := v_parent.level + 1;

  IF v_new_level > 3 THEN
    RAISE EXCEPTION 'Profundidade máxima de 3 níveis atingida.';
  END IF;

  -- Level 2 = category (group), level 3 = subitem (analytical)
  v_new_is_group := (v_new_level = 2);

  SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_next_sort
  FROM chart_of_accounts
  WHERE tenant_id = p_tenant_id AND parent_id = p_parent_id;

  INSERT INTO chart_of_accounts
    (tenant_id, name, type, code, level, sort_order, parent_id, is_group, active)
  VALUES
    (p_tenant_id, p_name, v_parent.type,
     v_parent.code || '.' || v_next_sort::text,
     v_new_level, v_next_sort, p_parent_id, v_new_is_group, true)
  RETURNING id INTO v_new_id;

  PERFORM regenerate_coa_codes(p_tenant_id);

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_coa_account(UUID, TEXT, TEXT, UUID, BOOLEAN) TO authenticated;

-- ── 3. Updated archive_coa_account — block level 1 ───────────────────────────

CREATE OR REPLACE FUNCTION archive_coa_account(p_account_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_account chart_of_accounts%ROWTYPE;
BEGIN
  SELECT * INTO v_account FROM chart_of_accounts WHERE id = p_account_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conta não encontrada.'; END IF;

  IF v_account.level = 1 THEN
    RAISE EXCEPTION 'As contas Receitas e Despesas não podem ser arquivadas.';
  END IF;

  IF NOT v_account.active THEN
    RAISE EXCEPTION 'Conta já está arquivada.';
  END IF;

  WITH RECURSIVE subtree AS (
    SELECT id FROM chart_of_accounts WHERE id = p_account_id
    UNION ALL
    SELECT c.id FROM chart_of_accounts c JOIN subtree s ON c.parent_id = s.id
  )
  UPDATE chart_of_accounts SET active = false WHERE id IN (SELECT id FROM subtree);
END;
$$;

GRANT EXECUTE ON FUNCTION archive_coa_account(UUID) TO authenticated;

-- ── 4. Updated unarchive_coa_account — restore account only (not subtree) ────

CREATE OR REPLACE FUNCTION unarchive_coa_account(p_account_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_account chart_of_accounts%ROWTYPE;
BEGIN
  SELECT * INTO v_account FROM chart_of_accounts WHERE id = p_account_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conta não encontrada.'; END IF;

  IF v_account.active THEN
    RAISE EXCEPTION 'Conta já está ativa.';
  END IF;

  UPDATE chart_of_accounts SET active = true WHERE id = p_account_id;
END;
$$;

GRANT EXECUTE ON FUNCTION unarchive_coa_account(UUID) TO authenticated;

-- ── 5. Updated delete_coa_account — block level 1 ────────────────────────────

CREATE OR REPLACE FUNCTION delete_coa_account(p_account_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_account      chart_of_accounts%ROWTYPE;
  v_child_count  INTEGER;
BEGIN
  SELECT * INTO v_account FROM chart_of_accounts WHERE id = p_account_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conta não encontrada.'; END IF;

  IF v_account.level = 1 THEN
    RAISE EXCEPTION 'As contas Receitas e Despesas não podem ser excluídas.';
  END IF;

  SELECT COUNT(*) INTO v_child_count
  FROM chart_of_accounts WHERE parent_id = p_account_id;

  IF v_child_count > 0 THEN
    RAISE EXCEPTION 'Não é possível excluir uma conta que possui subcontas. Exclua as subcontas primeiro.';
  END IF;

  DELETE FROM chart_of_accounts WHERE id = p_account_id;

  PERFORM regenerate_coa_codes(v_account.tenant_id);
END;
$$;

GRANT EXECUTE ON FUNCTION delete_coa_account(UUID) TO authenticated;
