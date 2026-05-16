CREATE TABLE lotes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fazenda_id          UUID REFERENCES fazendas(id) ON DELETE SET NULL,
  nome                TEXT NOT NULL,
  descricao           TEXT,
  fase                TEXT CHECK (fase IN ('desmama','cria','recria','engorda','terminacao','matrizes','reprodutores')),
  meta_peso           NUMERIC(8,3),
  data_prevista_saida DATE,
  observacoes         TEXT,
  status              TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','encerrado')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lotes_tenant   ON lotes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lotes_fazenda  ON lotes(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_lotes_status   ON lotes(tenant_id, status);

ALTER TABLE lotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lotes_select" ON lotes FOR SELECT
  USING (tenant_id IN (SELECT user_tenant_ids()));

CREATE POLICY "lotes_all" ON lotes FOR ALL
  USING (tenant_id IN (SELECT user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT user_tenant_ids()));

-- Conecta animals → lotes (a coluna já existe como UUID sem FK)
ALTER TABLE animals
  ADD CONSTRAINT animals_lote_atual_id_fkey
  FOREIGN KEY (lote_atual_id) REFERENCES lotes(id) ON DELETE SET NULL;
