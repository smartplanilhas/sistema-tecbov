-- Habilitar RLS em todas as tabelas
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivables ENABLE ROW LEVEL SECURITY;

-- =====================
-- FUNÇÕES AUXILIARES
-- =====================

-- Retorna os tenant_ids do usuário autenticado (ignora RLS)
CREATE OR REPLACE FUNCTION user_tenant_ids()
RETURNS SETOF UUID AS $$
  SELECT tenant_id FROM memberships WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Verifica se usuário é admin de um tenant (ignora RLS)
CREATE OR REPLACE FUNCTION is_tenant_admin(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
      AND tenant_id = p_tenant_id
      AND role = 'admin'
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Verifica se um tenant ainda não tem membros (bootstrap do onboarding)
CREATE OR REPLACE FUNCTION tenant_has_no_members(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
  SELECT NOT EXISTS (SELECT 1 FROM memberships WHERE tenant_id = p_tenant_id)
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- =====================
-- TENANTS
-- =====================

-- Qualquer usuário autenticado pode ver apenas seus tenants
CREATE POLICY "tenants_select" ON tenants
  FOR SELECT USING (id IN (SELECT user_tenant_ids()));

-- Qualquer usuário autenticado pode criar um tenant
CREATE POLICY "tenants_insert" ON tenants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Apenas admins podem atualizar os dados do tenant
CREATE POLICY "tenants_update_admin" ON tenants
  FOR UPDATE USING (is_tenant_admin(id));

-- =====================
-- MEMBERSHIPS
-- =====================

CREATE POLICY "memberships_select" ON memberships
  FOR SELECT USING (user_id = auth.uid() OR tenant_id IN (SELECT user_tenant_ids()));

-- Permite inserir membership quando:
-- 1. O usuário está criando a própria membership (user_id = auth.uid()), E
-- 2. O tenant não tem membros ainda (bootstrap) OU o usuário já é admin do tenant
CREATE POLICY "memberships_insert" ON memberships
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (
      tenant_has_no_members(tenant_id)
      OR is_tenant_admin(tenant_id)
    )
  );

CREATE POLICY "memberships_delete_admin" ON memberships
  FOR DELETE USING (is_tenant_admin(tenant_id));

-- =====================
-- CHART OF ACCOUNTS
-- =====================

CREATE POLICY "coa_select" ON chart_of_accounts
  FOR SELECT USING (tenant_id IN (SELECT user_tenant_ids()));

CREATE POLICY "coa_insert_admin" ON chart_of_accounts
  FOR INSERT WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "coa_update_admin" ON chart_of_accounts
  FOR UPDATE USING (is_tenant_admin(tenant_id));

CREATE POLICY "coa_delete_admin" ON chart_of_accounts
  FOR DELETE USING (is_tenant_admin(tenant_id));

-- =====================
-- COST CENTERS
-- =====================

CREATE POLICY "cost_centers_select" ON cost_centers
  FOR SELECT USING (tenant_id IN (SELECT user_tenant_ids()));

CREATE POLICY "cost_centers_insert_admin" ON cost_centers
  FOR INSERT WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "cost_centers_update_admin" ON cost_centers
  FOR UPDATE USING (is_tenant_admin(tenant_id));

CREATE POLICY "cost_centers_delete_admin" ON cost_centers
  FOR DELETE USING (is_tenant_admin(tenant_id));

-- =====================
-- FINANCIAL ACCOUNTS
-- =====================

CREATE POLICY "financial_accounts_select" ON financial_accounts
  FOR SELECT USING (tenant_id IN (SELECT user_tenant_ids()));

CREATE POLICY "financial_accounts_insert_admin" ON financial_accounts
  FOR INSERT WITH CHECK (is_tenant_admin(tenant_id));

CREATE POLICY "financial_accounts_update_admin" ON financial_accounts
  FOR UPDATE USING (is_tenant_admin(tenant_id));

-- =====================
-- TRANSACTIONS
-- =====================

CREATE POLICY "transactions_select" ON transactions
  FOR SELECT USING (tenant_id IN (SELECT user_tenant_ids()));

CREATE POLICY "transactions_insert" ON transactions
  FOR INSERT WITH CHECK (tenant_id IN (SELECT user_tenant_ids()));

CREATE POLICY "transactions_update_admin" ON transactions
  FOR UPDATE USING (is_tenant_admin(tenant_id));

CREATE POLICY "transactions_delete_admin" ON transactions
  FOR DELETE USING (is_tenant_admin(tenant_id));

-- =====================
-- PAYABLES
-- =====================

CREATE POLICY "payables_select" ON payables
  FOR SELECT USING (tenant_id IN (SELECT user_tenant_ids()));

CREATE POLICY "payables_insert" ON payables
  FOR INSERT WITH CHECK (tenant_id IN (SELECT user_tenant_ids()));

CREATE POLICY "payables_update" ON payables
  FOR UPDATE USING (tenant_id IN (SELECT user_tenant_ids()));

CREATE POLICY "payables_delete_admin" ON payables
  FOR DELETE USING (is_tenant_admin(tenant_id));

-- =====================
-- RECEIVABLES
-- =====================

CREATE POLICY "receivables_select" ON receivables
  FOR SELECT USING (tenant_id IN (SELECT user_tenant_ids()));

CREATE POLICY "receivables_insert" ON receivables
  FOR INSERT WITH CHECK (tenant_id IN (SELECT user_tenant_ids()));

CREATE POLICY "receivables_update" ON receivables
  FOR UPDATE USING (tenant_id IN (SELECT user_tenant_ids()));

CREATE POLICY "receivables_delete_admin" ON receivables
  FOR DELETE USING (is_tenant_admin(tenant_id));
