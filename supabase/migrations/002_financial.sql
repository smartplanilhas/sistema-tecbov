-- Plano de Contas (Chart of Accounts)
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')),
  parent_id   UUID REFERENCES chart_of_accounts(id),
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

-- Centros de Custo
CREATE TABLE IF NOT EXISTS cost_centers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Contas Bancárias/Financeiras
CREATE TABLE IF NOT EXISTS financial_accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('CHECKING','SAVINGS','CASH','CREDIT_CARD','INVESTMENT')),
  bank        TEXT,
  balance     NUMERIC(15,2) NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Lançamentos financeiros
CREATE TABLE IF NOT EXISTS transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id      UUID NOT NULL REFERENCES financial_accounts(id),
  category_id     UUID REFERENCES chart_of_accounts(id),
  cost_center_id  UUID REFERENCES cost_centers(id),
  type            TEXT NOT NULL CHECK (type IN ('INCOME','EXPENSE','TRANSFER')),
  amount          NUMERIC(15,2) NOT NULL,
  date            DATE NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','COMPLETED','CANCELLED')),
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Contas a Pagar
CREATE TABLE IF NOT EXISTS payables (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier        TEXT NOT NULL,
  description     TEXT,
  amount          NUMERIC(15,2) NOT NULL,
  due_date        DATE NOT NULL,
  paid_date       DATE,
  status          TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','PAID','OVERDUE','CANCELLED')),
  transaction_id  UUID REFERENCES transactions(id),
  cost_center_id  UUID REFERENCES cost_centers(id),
  category_id     UUID REFERENCES chart_of_accounts(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Contas a Receber
CREATE TABLE IF NOT EXISTS receivables (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer        TEXT NOT NULL,
  description     TEXT,
  amount          NUMERIC(15,2) NOT NULL,
  due_date        DATE NOT NULL,
  received_date   DATE,
  status          TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','RECEIVED','OVERDUE','CANCELLED')),
  transaction_id  UUID REFERENCES transactions(id),
  category_id     UUID REFERENCES chart_of_accounts(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Índices de performance por tenant
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_tenant ON chart_of_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cost_centers_tenant ON cost_centers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financial_accounts_tenant ON financial_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_payables_tenant ON payables(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payables_due_date ON payables(tenant_id, due_date);
CREATE INDEX IF NOT EXISTS idx_receivables_tenant ON receivables(tenant_id);
CREATE INDEX IF NOT EXISTS idx_receivables_due_date ON receivables(tenant_id, due_date);
