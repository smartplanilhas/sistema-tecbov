-- Adiciona coluna number à tabela transactions com auto-incremento por tenant

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS number BIGINT;

-- Backfill: numera os registros existentes por tenant, ordenando por created_at
UPDATE transactions t
SET number = subq.rn
FROM (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at, id) AS rn
  FROM transactions
  WHERE number IS NULL
) subq
WHERE t.id = subq.id;

-- Garante NOT NULL e unicidade por tenant
ALTER TABLE transactions ALTER COLUMN number SET NOT NULL;
ALTER TABLE transactions ADD CONSTRAINT transactions_number_tenant_unique UNIQUE (tenant_id, number);

-- Trigger que gera o próximo número por tenant automaticamente
CREATE OR REPLACE FUNCTION set_transaction_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT COALESCE(MAX(number), 0) + 1 INTO NEW.number
  FROM transactions
  WHERE tenant_id = NEW.tenant_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_transaction_number
BEFORE INSERT ON transactions
FOR EACH ROW WHEN (NEW.number IS NULL)
EXECUTE FUNCTION set_transaction_number();
