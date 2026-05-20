CREATE TABLE animal_sale_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  animal_id            UUID NOT NULL REFERENCES animals(id),
  transaction_id       UUID REFERENCES transactions(id) ON DELETE SET NULL,
  grupo_id             UUID,
  lote_saida_id        UUID REFERENCES lotes(id),
  data                 DATE NOT NULL,
  peso_venda           NUMERIC(8,3),
  tipo_preco           TEXT CHECK (tipo_preco IN ('por_animal','por_kg')),
  valor_unitario       NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_total_snapshot NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_asi_tenant ON animal_sale_items(tenant_id);
CREATE INDEX idx_asi_animal ON animal_sale_items(animal_id);
CREATE INDEX idx_asi_tx     ON animal_sale_items(transaction_id);
CREATE INDEX idx_asi_grupo  ON animal_sale_items(grupo_id) WHERE grupo_id IS NOT NULL;
CREATE INDEX idx_asi_lote   ON animal_sale_items(lote_saida_id) WHERE lote_saida_id IS NOT NULL;
CREATE INDEX idx_asi_data   ON animal_sale_items(tenant_id, data DESC);

ALTER TABLE animal_sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asi_select" ON animal_sale_items
  FOR SELECT USING (tenant_id IN (SELECT user_tenant_ids()));
CREATE POLICY "asi_insert" ON animal_sale_items
  FOR INSERT WITH CHECK (tenant_id IN (SELECT user_tenant_ids()));
CREATE POLICY "asi_delete" ON animal_sale_items
  FOR DELETE USING (tenant_id IN (SELECT user_tenant_ids()));
