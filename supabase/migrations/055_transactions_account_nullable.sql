-- Permite registros de venda sem conta bancária (quando lançamento financeiro é opcional)
ALTER TABLE transactions ALTER COLUMN account_id DROP NOT NULL;
