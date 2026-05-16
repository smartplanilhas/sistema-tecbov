-- ============================================================
-- 015_recurrences.sql
-- Módulo de recorrência: templates de lançamentos periódicos
-- ============================================================

CREATE TABLE IF NOT EXISTS recurrences (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type                  TEXT NOT NULL CHECK (type IN ('PAYABLE','RECEIVABLE')),
  description           TEXT NOT NULL,
  amount                NUMERIC(15,2) NOT NULL,
  frequency             TEXT NOT NULL CHECK (frequency IN ('DAILY','WEEKLY','BIWEEKLY','MONTHLY','QUARTERLY','SEMIANNUAL','YEARLY')),
  interval              INTEGER NOT NULL DEFAULT 1 CHECK (interval > 0),
  start_date            DATE NOT NULL,
  end_date              DATE,
  max_occurrences       INTEGER CHECK (max_occurrences > 0),
  person_id             UUID REFERENCES people(id) ON DELETE SET NULL,
  category_id           UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  cost_center_id        UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
  financial_account_id  UUID REFERENCES financial_accounts(id) ON DELETE SET NULL,
  payment_method_id     UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
  active                BOOLEAN NOT NULL DEFAULT true,
  last_generated_date   DATE,
  total_generated       INTEGER NOT NULL DEFAULT 0,
  created_by            UUID REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- Vincular parcelas geradas de volta à regra de recorrência
ALTER TABLE payables
  ADD COLUMN IF NOT EXISTS recurrence_id UUID REFERENCES recurrences(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES people(id) ON DELETE SET NULL;

ALTER TABLE receivables
  ADD COLUMN IF NOT EXISTS recurrence_id UUID REFERENCES recurrences(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES people(id) ON DELETE SET NULL;

-- Índices
CREATE INDEX IF NOT EXISTS idx_recurrences_tenant        ON recurrences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recurrences_active        ON recurrences(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_recurrences_next_gen      ON recurrences(tenant_id, last_generated_date) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_payables_recurrence       ON payables(recurrence_id) WHERE recurrence_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_receivables_recurrence    ON receivables(recurrence_id) WHERE recurrence_id IS NOT NULL;

-- RLS
ALTER TABLE recurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recurrences_select" ON recurrences
  FOR SELECT USING (tenant_id IN (SELECT user_tenant_ids()));

CREATE POLICY "recurrences_insert" ON recurrences
  FOR INSERT WITH CHECK (tenant_id IN (SELECT user_tenant_ids()));

CREATE POLICY "recurrences_update" ON recurrences
  FOR UPDATE USING (tenant_id IN (SELECT user_tenant_ids()));

CREATE POLICY "recurrences_delete_admin" ON recurrences
  FOR DELETE USING (is_tenant_admin(tenant_id));
