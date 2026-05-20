ALTER TABLE transactions
  ADD COLUMN lote_id   UUID REFERENCES lotes(id)   ON DELETE SET NULL,
  ADD COLUMN animal_id UUID REFERENCES animals(id)  ON DELETE SET NULL;

CREATE INDEX idx_transactions_lote   ON transactions(lote_id)   WHERE lote_id   IS NOT NULL;
CREATE INDEX idx_transactions_animal ON transactions(animal_id) WHERE animal_id IS NOT NULL;
