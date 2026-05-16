-- ────────────────────────────────────────────────────────────────────────────
-- 009_transactions_person.sql
-- Adds person_id FK to transactions (supplier for EXPENSE, customer for INCOME).
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE transactions
  ADD COLUMN person_id UUID REFERENCES people(id) ON DELETE SET NULL;
