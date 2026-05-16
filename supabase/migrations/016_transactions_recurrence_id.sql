ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS recurrence_id UUID REFERENCES recurrences(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_recurrence ON transactions(recurrence_id) WHERE recurrence_id IS NOT NULL;
