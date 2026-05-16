-- ============================================================
-- 005_coa_v2.sql — Plano de Contas hierárquico
-- Adiciona: level, sort_order, is_group
-- Funções: create_coa_account, move_coa_account,
--          archive_coa_account, delete_coa_account
-- ============================================================

-- 1. Novas colunas
ALTER TABLE chart_of_accounts
  ADD COLUMN IF NOT EXISTS level      INTEGER,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER,
  ADD COLUMN IF NOT EXISTS is_group   BOOLEAN NOT NULL DEFAULT true;

-- 2. Backfill: level = número de segmentos do código
UPDATE chart_of_accounts
SET level = cardinality(string_to_array(code, '.'))
WHERE level IS NULL;

UPDATE chart_of_accounts SET level = 1 WHERE level IS NULL;

-- 3. Backfill: sort_order = último segmento numérico do código
UPDATE chart_of_accounts
SET sort_order = (
  CASE
    WHEN code ~ '^\d+(\.\d+)*$' THEN
      (string_to_array(code, '.'))[cardinality(string_to_array(code, '.'))]::INTEGER
    ELSE 0
  END
)
WHERE sort_order IS NULL;

UPDATE chart_of_accounts SET sort_order = 0 WHERE sort_order IS NULL;

-- 4. Tornar colunas NOT NULL e adicionar constraint de profundidade
ALTER TABLE chart_of_accounts
  ALTER COLUMN level      SET NOT NULL,
  ALTER COLUMN level      SET DEFAULT 1,
  ALTER COLUMN sort_order SET NOT NULL,
  ALTER COLUMN sort_order SET DEFAULT 0;

ALTER TABLE chart_of_accounts
  ADD CONSTRAINT coa_level_check CHECK (level BETWEEN 1 AND 3);

-- 5. Índices para travessia eficiente da árvore
CREATE INDEX IF NOT EXISTS idx_coa_parent   ON chart_of_accounts(tenant_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_coa_sort     ON chart_of_accounts(tenant_id, parent_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_coa_code     ON chart_of_accounts(tenant_id, code);

-- ============================================================
-- FUNÇÃO: regenerate_coa_codes
-- Renumera recursivamente todos os códigos de um tenant
-- Deve ser chamada apenas de dentro de funções SECURITY DEFINER
-- ============================================================
CREATE OR REPLACE FUNCTION regenerate_coa_codes(
  p_tenant_id   UUID,
  p_parent_id   UUID    DEFAULT NULL,
  p_parent_code TEXT    DEFAULT '',
  p_parent_lvl  INTEGER DEFAULT 0
) RETURNS void AS $$
DECLARE
  v_rec      RECORD;
  v_pos      INTEGER := 0;
  v_code     TEXT;
  v_level    INTEGER;
BEGIN
  FOR v_rec IN (
    SELECT id FROM chart_of_accounts
    WHERE  tenant_id = p_tenant_id
      AND  (
             (p_parent_id IS NULL AND parent_id IS NULL)
             OR parent_id = p_parent_id
           )
    ORDER BY sort_order, created_at
  ) LOOP
    v_pos   := v_pos + 1;
    v_level := p_parent_lvl + 1;
    v_code  := CASE WHEN p_parent_code = '' THEN v_pos::TEXT
                    ELSE p_parent_code || '.' || v_pos END;

    UPDATE chart_of_accounts
    SET    code = v_code, level = v_level, sort_order = v_pos
    WHERE  id = v_rec.id;

    PERFORM regenerate_coa_codes(p_tenant_id, v_rec.id, v_code, v_level);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FUNÇÃO: create_coa_account
-- Cria conta com código automático, prevenindo race conditions
-- via advisory lock por tenant.
-- ============================================================
CREATE OR REPLACE FUNCTION create_coa_account(
  p_tenant_id UUID,
  p_name      TEXT,
  p_type      TEXT,
  p_parent_id UUID    DEFAULT NULL,
  p_is_group  BOOLEAN DEFAULT true
) RETURNS chart_of_accounts AS $$
DECLARE
  v_level      INTEGER;
  v_sort_order INTEGER;
  v_code       TEXT;
  v_parent_code TEXT;
  v_parent_lvl  INTEGER;
  v_result      chart_of_accounts;
BEGIN
  -- Somente admins do tenant podem criar contas
  IF NOT is_tenant_admin(p_tenant_id) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;

  -- Lock por tenant: evita race condition em criação simultânea
  PERFORM pg_advisory_xact_lock(hashtext(p_tenant_id::text));

  IF p_parent_id IS NOT NULL THEN
    -- Busca e trava o pai para garantir consistência
    SELECT code, level INTO v_parent_code, v_parent_lvl
    FROM   chart_of_accounts
    WHERE  id = p_parent_id AND tenant_id = p_tenant_id AND is_group = true
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Conta pai não encontrada ou não é um grupo';
    END IF;

    IF v_parent_lvl >= 3 THEN
      RAISE EXCEPTION 'Profundidade máxima de 3 níveis atingida';
    END IF;

    v_level      := v_parent_lvl + 1;
    SELECT COALESCE(MAX(sort_order), 0) + 1
    INTO   v_sort_order
    FROM   chart_of_accounts
    WHERE  tenant_id = p_tenant_id AND parent_id = p_parent_id;

    v_code := v_parent_code || '.' || v_sort_order;
  ELSE
    -- Conta raiz
    SELECT COALESCE(MAX(sort_order), 0) + 1
    INTO   v_sort_order
    FROM   chart_of_accounts
    WHERE  tenant_id = p_tenant_id AND parent_id IS NULL;

    v_level := 1;
    v_code  := v_sort_order::TEXT;
  END IF;

  INSERT INTO chart_of_accounts
    (tenant_id, code, name, type, parent_id, level, sort_order, is_group, active)
  VALUES
    (p_tenant_id, v_code, p_name, p_type, p_parent_id, v_level, v_sort_order, p_is_group, true)
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNÇÃO: move_coa_account
-- Move/reordena conta na árvore.
-- p_before_id = inserir antes desta conta (NULL = no final)
-- ============================================================
CREATE OR REPLACE FUNCTION move_coa_account(
  p_account_id   UUID,
  p_new_parent_id UUID,
  p_before_id    UUID DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_tenant_id     UUID;
  v_old_code      TEXT;
  v_old_level     INTEGER;
  v_new_level     INTEGER;
  v_parent_level  INTEGER;
  v_subtree_depth INTEGER;
  v_sort_order    INTEGER;
BEGIN
  SELECT tenant_id, code, level
  INTO   v_tenant_id, v_old_code, v_old_level
  FROM   chart_of_accounts WHERE id = p_account_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Conta não encontrada'; END IF;
  IF NOT is_tenant_admin(v_tenant_id) THEN RAISE EXCEPTION 'Permissão negada'; END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_tenant_id::text));

  -- Valida novo pai
  IF p_new_parent_id IS NOT NULL THEN
    SELECT level INTO v_parent_level
    FROM   chart_of_accounts
    WHERE  id = p_new_parent_id AND tenant_id = v_tenant_id AND is_group = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Conta pai destino não encontrada ou não é um grupo';
    END IF;
    v_new_level := v_parent_level + 1;
  ELSE
    v_new_level := 1;
  END IF;

  -- Impede mover conta para dentro do próprio subgrupo
  IF p_new_parent_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM chart_of_accounts
    WHERE  id = p_new_parent_id AND tenant_id = v_tenant_id
      AND  (code = v_old_code OR code LIKE v_old_code || '.%')
  ) THEN
    RAISE EXCEPTION 'Não é possível mover uma conta para dentro de si mesma';
  END IF;

  -- Verifica se a movimentação não ultrapassa 3 níveis
  SELECT COALESCE(MAX(level) - v_old_level, 0)
  INTO   v_subtree_depth
  FROM   chart_of_accounts
  WHERE  tenant_id = v_tenant_id
    AND  (id = p_account_id OR code LIKE v_old_code || '.%');

  IF v_new_level + v_subtree_depth > 3 THEN
    RAISE EXCEPTION 'A movimentação ultrapassaria o limite de 3 níveis hierárquicos';
  END IF;

  -- Calcula sort_order de inserção
  IF p_before_id IS NOT NULL THEN
    SELECT sort_order INTO v_sort_order
    FROM   chart_of_accounts WHERE id = p_before_id AND tenant_id = v_tenant_id;

    -- Abre espaço para a conta inserida
    UPDATE chart_of_accounts
    SET    sort_order = sort_order + 1
    WHERE  tenant_id = v_tenant_id
      AND  (parent_id = p_new_parent_id OR (parent_id IS NULL AND p_new_parent_id IS NULL))
      AND  id != p_account_id
      AND  sort_order >= v_sort_order;
  ELSE
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_sort_order
    FROM   chart_of_accounts
    WHERE  tenant_id = v_tenant_id
      AND  (parent_id = p_new_parent_id OR (parent_id IS NULL AND p_new_parent_id IS NULL))
      AND  id != p_account_id;
  END IF;

  UPDATE chart_of_accounts
  SET    parent_id = p_new_parent_id, sort_order = v_sort_order
  WHERE  id = p_account_id;

  -- Renumera tudo do root (garante consistência total)
  PERFORM regenerate_coa_codes(v_tenant_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNÇÃO: archive_coa_account
-- Desativa conta. Bloqueia se tiver subcontas ativas.
-- ============================================================
CREATE OR REPLACE FUNCTION archive_coa_account(p_account_id UUID)
RETURNS void AS $$
DECLARE v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM chart_of_accounts WHERE id = p_account_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conta não encontrada'; END IF;
  IF NOT is_tenant_admin(v_tenant_id) THEN RAISE EXCEPTION 'Permissão negada'; END IF;

  IF EXISTS (
    SELECT 1 FROM chart_of_accounts
    WHERE  parent_id = p_account_id AND active = true LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Não é possível arquivar uma conta com subcontas ativas';
  END IF;

  UPDATE chart_of_accounts SET active = false WHERE id = p_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNÇÃO: unarchive_coa_account
-- Reativa conta arquivada.
-- ============================================================
CREATE OR REPLACE FUNCTION unarchive_coa_account(p_account_id UUID)
RETURNS void AS $$
DECLARE v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM chart_of_accounts WHERE id = p_account_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conta não encontrada'; END IF;
  IF NOT is_tenant_admin(v_tenant_id) THEN RAISE EXCEPTION 'Permissão negada'; END IF;

  UPDATE chart_of_accounts SET active = true WHERE id = p_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNÇÃO: delete_coa_account
-- Exclui conta somente se não houver subcontas nem lançamentos.
-- ============================================================
CREATE OR REPLACE FUNCTION delete_coa_account(p_account_id UUID)
RETURNS void AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM chart_of_accounts WHERE id = p_account_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conta não encontrada'; END IF;
  IF NOT is_tenant_admin(v_tenant_id) THEN RAISE EXCEPTION 'Permissão negada'; END IF;

  IF EXISTS (
    SELECT 1 FROM chart_of_accounts WHERE parent_id = p_account_id LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Não é possível excluir conta com subcontas';
  END IF;

  IF EXISTS (SELECT 1 FROM transactions  WHERE category_id = p_account_id LIMIT 1)
  OR EXISTS (SELECT 1 FROM payables      WHERE category_id = p_account_id LIMIT 1)
  OR EXISTS (SELECT 1 FROM receivables   WHERE category_id = p_account_id LIMIT 1)
  THEN
    RAISE EXCEPTION 'Conta possui lançamentos. Use Arquivar para desativá-la.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_tenant_id::text));
  DELETE FROM chart_of_accounts WHERE id = p_account_id;
  PERFORM regenerate_coa_codes(v_tenant_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- GRANTS — apenas as funções públicas
-- ============================================================
GRANT EXECUTE ON FUNCTION create_coa_account   TO authenticated;
GRANT EXECUTE ON FUNCTION move_coa_account     TO authenticated;
GRANT EXECUTE ON FUNCTION archive_coa_account  TO authenticated;
GRANT EXECUTE ON FUNCTION unarchive_coa_account TO authenticated;
GRANT EXECUTE ON FUNCTION delete_coa_account   TO authenticated;
