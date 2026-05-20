-- Substitui categoria_id (→ categorias_custo global) por coa_account_id (→ chart_of_accounts por tenant)

ALTER TABLE custos_producao
  ADD COLUMN IF NOT EXISTS coa_account_id uuid REFERENCES chart_of_accounts(id);

ALTER TABLE custos_producao DROP COLUMN IF EXISTS categoria_id;

DROP TABLE IF EXISTS categorias_custo;
