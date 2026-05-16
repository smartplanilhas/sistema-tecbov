ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS due_date     DATE,
  ADD COLUMN IF NOT EXISTS payment_date DATE;
