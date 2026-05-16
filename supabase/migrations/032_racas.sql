CREATE TABLE IF NOT EXISTS racas (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- null = padrão global
  nome       TEXT NOT NULL,
  ativa      BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_racas_tenant ON racas(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_racas_global_nome ON racas(lower(nome)) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_racas_tenant_nome ON racas(tenant_id, lower(nome)) WHERE tenant_id IS NOT NULL;

ALTER TABLE racas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "racas visíveis" ON racas;
CREATE POLICY "racas visíveis"
  ON racas FOR SELECT
  USING (tenant_id IS NULL OR tenant_id IN (SELECT user_tenant_ids()));

DROP POLICY IF EXISTS "tenant members can manage racas" ON racas;
CREATE POLICY "tenant members can manage racas"
  ON racas FOR ALL
  USING (tenant_id IN (SELECT user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT user_tenant_ids()));

-- Seed global
INSERT INTO racas (nome) VALUES
  ('Nelore'), ('Angus'), ('Brangus'), ('Brahman'), ('Senepol')
ON CONFLICT DO NOTHING;

ALTER TABLE animals ADD COLUMN IF NOT EXISTS raca_id UUID REFERENCES racas(id) ON DELETE SET NULL;
ALTER TABLE animals DROP COLUMN IF EXISTS raca;
