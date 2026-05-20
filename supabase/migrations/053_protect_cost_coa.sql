-- Protege contas de Custo de Produção (3, 3.1, 3.2 etc.) contra exclusão acidental

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

  IF v_account.code = '3' OR v_account.code LIKE '3.%' THEN
    RAISE EXCEPTION 'As contas de Custo de Produção são essenciais para o sistema e não podem ser excluídas.';
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
