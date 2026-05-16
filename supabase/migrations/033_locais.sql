-- Tabela de locais (pastos, currais, confinamentos, etc.)
CREATE TABLE IF NOT EXISTS locais (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fazenda_id  UUID        REFERENCES fazendas(id) ON DELETE SET NULL,
  nome        TEXT        NOT NULL,
  tipo        TEXT        CHECK (tipo IN ('pasto','curral','confinamento','mangueira','baia','outro')),
  area_ha     NUMERIC(10,2),
  sistema     TEXT        CHECK (sistema IN ('rotacionado','continuo')),
  status      TEXT        NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  observacoes TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE locais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "locais_select" ON locais;
CREATE POLICY "locais_select" ON locais FOR SELECT USING (tenant_id IN (SELECT user_tenant_ids()));
DROP POLICY IF EXISTS "locais_insert" ON locais;
CREATE POLICY "locais_insert" ON locais FOR INSERT WITH CHECK (tenant_id IN (SELECT user_tenant_ids()));
DROP POLICY IF EXISTS "locais_update" ON locais;
CREATE POLICY "locais_update" ON locais FOR UPDATE USING (tenant_id IN (SELECT user_tenant_ids()));
DROP POLICY IF EXISTS "locais_delete" ON locais;
CREATE POLICY "locais_delete" ON locais FOR DELETE USING (tenant_id IN (SELECT user_tenant_ids()));
