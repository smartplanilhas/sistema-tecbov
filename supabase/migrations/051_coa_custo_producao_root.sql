-- Move "Custo de Produção" para raiz separada (type='COST') na DRE
-- Remove as entradas 2.3.* criadas pela migration 050 (que ficavam sob Despesas)
-- e recria como Level 1 independente para exibição correta na DRE

-- ── 1. Adiciona 'COST' ao CHECK de type ──────────────────────────────────────

ALTER TABLE chart_of_accounts
  DROP CONSTRAINT IF EXISTS chart_of_accounts_type_check;

ALTER TABLE chart_of_accounts
  ADD CONSTRAINT chart_of_accounts_type_check
    CHECK (type IN ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE','COST'));

-- ── 2. Remove entradas da migration 050 (Custo de Produção sob Despesas) ─────

DO $$
DECLARE
  t_id UUID;
  cp_id UUID;
BEGIN
  FOR t_id IN
    SELECT DISTINCT tenant_id FROM chart_of_accounts WHERE parent_id IS NULL
  LOOP
    SELECT id INTO cp_id
    FROM chart_of_accounts
    WHERE tenant_id = t_id
      AND name = 'Custo de Produção'
      AND type = 'EXPENSE'
      AND level = 2;

    IF cp_id IS NOT NULL THEN
      DELETE FROM chart_of_accounts
      WHERE tenant_id = t_id
        AND (id = cp_id OR parent_id = cp_id);
    END IF;
  END LOOP;
END;
$$;

-- ── 3. Backfill: insere raiz COST em todos os tenants existentes ─────────────

DO $$
DECLARE
  t_id UUID;
  v_custo_prod_id UUID;
BEGIN
  FOR t_id IN
    SELECT DISTINCT tenant_id FROM chart_of_accounts WHERE parent_id IS NULL
  LOOP
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM chart_of_accounts
      WHERE tenant_id = t_id AND type = 'COST' AND parent_id IS NULL
    );

    INSERT INTO chart_of_accounts
      (tenant_id, name, type, code, level, sort_order, parent_id, is_group, active)
    VALUES (t_id, 'Custo de Produção', 'COST', '3', 1, 3, NULL, true, true)
    RETURNING id INTO v_custo_prod_id;

    INSERT INTO chart_of_accounts
      (tenant_id, name, type, code, level, sort_order, parent_id, is_group, active)
    VALUES
      (t_id, 'Alimentação',    'COST', '3.1', 2, 1, v_custo_prod_id, false, true),
      (t_id, 'Sanidade',       'COST', '3.2', 2, 2, v_custo_prod_id, false, true),
      (t_id, 'Mão de Obra',    'COST', '3.3', 2, 3, v_custo_prod_id, false, true),
      (t_id, 'Transporte',     'COST', '3.4', 2, 4, v_custo_prod_id, false, true),
      (t_id, 'Infraestrutura', 'COST', '3.5', 2, 5, v_custo_prod_id, false, true),
      (t_id, 'Compra',         'COST', '3.6', 2, 6, v_custo_prod_id, false, true),
      (t_id, 'Outros Custos',  'COST', '3.7', 2, 7, v_custo_prod_id, false, true);
  END LOOP;
END;
$$;

-- ── 4. Atualiza initialize_coa_defaults para novos tenants ───────────────────

CREATE OR REPLACE FUNCTION initialize_coa_defaults(p_tenant_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_receitas_id    UUID;
  v_despesas_id    UUID;
  v_custo_prod_id  UUID;
  v_rec_op_id      UUID;
  v_desp_op_id     UUID;
  v_desp_vend_id   UUID;
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

  INSERT INTO chart_of_accounts
    (tenant_id, name, type, code, level, sort_order, parent_id, is_group, active)
  VALUES (p_tenant_id, 'Custo de Produção', 'COST', '3', 1, 3, NULL, true, true)
  RETURNING id INTO v_custo_prod_id;

  -- Level 2: Receita Operacional
  INSERT INTO chart_of_accounts
    (tenant_id, name, type, code, level, sort_order, parent_id, is_group, active)
  VALUES (p_tenant_id, 'Receita Operacional', 'REVENUE', '1.1', 2, 1, v_receitas_id, true, true)
  RETURNING id INTO v_rec_op_id;

  -- Level 2: Despesas
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

  -- Level 2: Custo de Produção (contas analíticas diretas)
  INSERT INTO chart_of_accounts
    (tenant_id, name, type, code, level, sort_order, parent_id, is_group, active)
  VALUES
    (p_tenant_id, 'Alimentação',    'COST', '3.1', 2, 1, v_custo_prod_id, false, true),
    (p_tenant_id, 'Sanidade',       'COST', '3.2', 2, 2, v_custo_prod_id, false, true),
    (p_tenant_id, 'Mão de Obra',    'COST', '3.3', 2, 3, v_custo_prod_id, false, true),
    (p_tenant_id, 'Transporte',     'COST', '3.4', 2, 4, v_custo_prod_id, false, true),
    (p_tenant_id, 'Infraestrutura', 'COST', '3.5', 2, 5, v_custo_prod_id, false, true),
    (p_tenant_id, 'Compra',         'COST', '3.6', 2, 6, v_custo_prod_id, false, true),
    (p_tenant_id, 'Outros Custos',  'COST', '3.7', 2, 7, v_custo_prod_id, false, true);
END;
$$;

-- ── 5. Protege roots COST em archive/delete (mesma lógica de REVENUE/EXPENSE) ─

CREATE OR REPLACE FUNCTION archive_coa_account(p_account_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_account chart_of_accounts%ROWTYPE;
BEGIN
  SELECT * INTO v_account FROM chart_of_accounts WHERE id = p_account_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conta não encontrada.'; END IF;

  IF v_account.level = 1 THEN
    RAISE EXCEPTION 'As contas raiz não podem ser arquivadas.';
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

CREATE OR REPLACE FUNCTION delete_coa_account(p_account_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_account     chart_of_accounts%ROWTYPE;
  v_child_count INTEGER;
BEGIN
  SELECT * INTO v_account FROM chart_of_accounts WHERE id = p_account_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conta não encontrada.'; END IF;

  IF v_account.level = 1 THEN
    RAISE EXCEPTION 'As contas raiz não podem ser excluídas.';
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
