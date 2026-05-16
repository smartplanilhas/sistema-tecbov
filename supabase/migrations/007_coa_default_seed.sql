-- ────────────────────────────────────────────────────────────────────────────
-- 007_coa_default_seed.sql
-- Extends initialize_coa_defaults with a full 3-level default hierarchy.
-- Also backfills existing tenants that only have root accounts.
-- ────────────────────────────────────────────────────────────────────────────

-- ── 1. Updated initialize_coa_defaults ──────────────────────────────────────

CREATE OR REPLACE FUNCTION initialize_coa_defaults(p_tenant_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_receitas_id  UUID;
  v_despesas_id  UUID;
  v_rec_op_id    UUID;
  v_desp_op_id   UUID;
  v_desp_vend_id UUID;
BEGIN
  IF EXISTS (
    SELECT 1 FROM chart_of_accounts
    WHERE tenant_id = p_tenant_id AND parent_id IS NULL
  ) THEN
    RETURN;
  END IF;

  -- Level 1: roots
  INSERT INTO chart_of_accounts
    (tenant_id, name, type, code, level, sort_order, parent_id, is_group, active)
  VALUES (p_tenant_id, 'Receitas', 'REVENUE', '1', 1, 1, NULL, true, true)
  RETURNING id INTO v_receitas_id;

  INSERT INTO chart_of_accounts
    (tenant_id, name, type, code, level, sort_order, parent_id, is_group, active)
  VALUES (p_tenant_id, 'Despesas', 'EXPENSE', '2', 1, 2, NULL, true, true)
  RETURNING id INTO v_despesas_id;

  -- Level 2: categories
  INSERT INTO chart_of_accounts
    (tenant_id, name, type, code, level, sort_order, parent_id, is_group, active)
  VALUES (p_tenant_id, 'Receita Operacional', 'REVENUE', '1.1', 2, 1, v_receitas_id, true, true)
  RETURNING id INTO v_rec_op_id;

  INSERT INTO chart_of_accounts
    (tenant_id, name, type, code, level, sort_order, parent_id, is_group, active)
  VALUES (p_tenant_id, 'Despesas Operacionais', 'EXPENSE', '2.1', 2, 1, v_despesas_id, true, true)
  RETURNING id INTO v_desp_op_id;

  INSERT INTO chart_of_accounts
    (tenant_id, name, type, code, level, sort_order, parent_id, is_group, active)
  VALUES (p_tenant_id, 'Despesas com Vendas', 'EXPENSE', '2.2', 2, 2, v_despesas_id, true, true)
  RETURNING id INTO v_desp_vend_id;

  -- Level 3: Receita Operacional
  INSERT INTO chart_of_accounts
    (tenant_id, name, type, code, level, sort_order, parent_id, is_group, active)
  VALUES
    (p_tenant_id, 'Venda de Produtos',     'REVENUE', '1.1.1', 3, 1, v_rec_op_id, false, true),
    (p_tenant_id, 'Prestação de Serviços', 'REVENUE', '1.1.2', 3, 2, v_rec_op_id, false, true);

  -- Level 3: Despesas Operacionais
  INSERT INTO chart_of_accounts
    (tenant_id, name, type, code, level, sort_order, parent_id, is_group, active)
  VALUES
    (p_tenant_id, 'Aluguel',                'EXPENSE', '2.1.1', 3, 1, v_desp_op_id, false, true),
    (p_tenant_id, 'Energia',                'EXPENSE', '2.1.2', 3, 2, v_desp_op_id, false, true),
    (p_tenant_id, 'Água',                   'EXPENSE', '2.1.3', 3, 3, v_desp_op_id, false, true),
    (p_tenant_id, 'Telefone',               'EXPENSE', '2.1.4', 3, 4, v_desp_op_id, false, true),
    (p_tenant_id, 'Limpeza',                'EXPENSE', '2.1.5', 3, 5, v_desp_op_id, false, true),
    (p_tenant_id, 'Material de Escritório', 'EXPENSE', '2.1.6', 3, 6, v_desp_op_id, false, true);

  -- Level 3: Despesas com Vendas
  INSERT INTO chart_of_accounts
    (tenant_id, name, type, code, level, sort_order, parent_id, is_group, active)
  VALUES
    (p_tenant_id, 'Frete',     'EXPENSE', '2.2.1', 3, 1, v_desp_vend_id, false, true),
    (p_tenant_id, 'Embalagem', 'EXPENSE', '2.2.2', 3, 2, v_desp_vend_id, false, true),
    (p_tenant_id, 'Comissões', 'EXPENSE', '2.2.3', 3, 3, v_desp_vend_id, false, true);
END;
$$;

-- ── 2. Backfill existing tenants that only have root accounts ────────────────

DO $$
DECLARE
  t_id           UUID;
  v_receitas_id  UUID;
  v_despesas_id  UUID;
  v_rec_op_id    UUID;
  v_desp_op_id   UUID;
  v_desp_vend_id UUID;
BEGIN
  FOR t_id IN
    SELECT DISTINCT tenant_id FROM chart_of_accounts WHERE parent_id IS NULL
  LOOP
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM chart_of_accounts WHERE tenant_id = t_id AND level = 2
    );

    SELECT id INTO v_receitas_id FROM chart_of_accounts
    WHERE tenant_id = t_id AND type = 'REVENUE' AND parent_id IS NULL;

    SELECT id INTO v_despesas_id FROM chart_of_accounts
    WHERE tenant_id = t_id AND type = 'EXPENSE' AND parent_id IS NULL;

    INSERT INTO chart_of_accounts
      (tenant_id, name, type, code, level, sort_order, parent_id, is_group, active)
    VALUES (t_id, 'Receita Operacional', 'REVENUE', '1.1', 2, 1, v_receitas_id, true, true)
    RETURNING id INTO v_rec_op_id;

    INSERT INTO chart_of_accounts
      (tenant_id, name, type, code, level, sort_order, parent_id, is_group, active)
    VALUES (t_id, 'Despesas Operacionais', 'EXPENSE', '2.1', 2, 1, v_despesas_id, true, true)
    RETURNING id INTO v_desp_op_id;

    INSERT INTO chart_of_accounts
      (tenant_id, name, type, code, level, sort_order, parent_id, is_group, active)
    VALUES (t_id, 'Despesas com Vendas', 'EXPENSE', '2.2', 2, 2, v_despesas_id, true, true)
    RETURNING id INTO v_desp_vend_id;

    INSERT INTO chart_of_accounts
      (tenant_id, name, type, code, level, sort_order, parent_id, is_group, active)
    VALUES
      (t_id, 'Venda de Produtos',     'REVENUE', '1.1.1', 3, 1, v_rec_op_id, false, true),
      (t_id, 'Prestação de Serviços', 'REVENUE', '1.1.2', 3, 2, v_rec_op_id, false, true);

    INSERT INTO chart_of_accounts
      (tenant_id, name, type, code, level, sort_order, parent_id, is_group, active)
    VALUES
      (t_id, 'Aluguel',                'EXPENSE', '2.1.1', 3, 1, v_desp_op_id, false, true),
      (t_id, 'Energia',                'EXPENSE', '2.1.2', 3, 2, v_desp_op_id, false, true),
      (t_id, 'Água',                   'EXPENSE', '2.1.3', 3, 3, v_desp_op_id, false, true),
      (t_id, 'Telefone',               'EXPENSE', '2.1.4', 3, 4, v_desp_op_id, false, true),
      (t_id, 'Limpeza',                'EXPENSE', '2.1.5', 3, 5, v_desp_op_id, false, true),
      (t_id, 'Material de Escritório', 'EXPENSE', '2.1.6', 3, 6, v_desp_op_id, false, true);

    INSERT INTO chart_of_accounts
      (tenant_id, name, type, code, level, sort_order, parent_id, is_group, active)
    VALUES
      (t_id, 'Frete',     'EXPENSE', '2.2.1', 3, 1, v_desp_vend_id, false, true),
      (t_id, 'Embalagem', 'EXPENSE', '2.2.2', 3, 2, v_desp_vend_id, false, true),
      (t_id, 'Comissões', 'EXPENSE', '2.2.3', 3, 3, v_desp_vend_id, false, true);
  END LOOP;
END;
$$;
