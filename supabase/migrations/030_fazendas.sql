CREATE TABLE IF NOT EXISTS fazendas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  cidade      TEXT,
  estado      TEXT,
  area_ha     NUMERIC(10,2),
  ativa       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fazendas_tenant_id ON fazendas(tenant_id);

ALTER TABLE fazendas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant members can select fazendas" ON fazendas;
CREATE POLICY "tenant members can select fazendas"
  ON fazendas FOR SELECT
  USING (tenant_id IN (SELECT user_tenant_ids()));

DROP POLICY IF EXISTS "tenant members can manage fazendas" ON fazendas;
CREATE POLICY "tenant members can manage fazendas"
  ON fazendas FOR ALL
  USING (tenant_id IN (SELECT user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT user_tenant_ids()));

-- Cria uma fazenda padrão para cada tenant que ainda não tem nenhuma
INSERT INTO fazendas (tenant_id, nome)
SELECT id, name FROM tenants
WHERE id NOT IN (SELECT DISTINCT tenant_id FROM fazendas);
