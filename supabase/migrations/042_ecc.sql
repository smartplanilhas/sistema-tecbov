CREATE TABLE ecc_registros (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  animal_id   UUID         NOT NULL REFERENCES animals(id) ON DELETE CASCADE,

  data        DATE         NOT NULL,
  escore      NUMERIC(3,1) NOT NULL CHECK (escore >= 1.0 AND escore <= 9.0),
  avaliador   TEXT,
  observacoes TEXT,

  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX ecc_tenant_idx ON ecc_registros(tenant_id);
CREATE INDEX ecc_animal_idx ON ecc_registros(animal_id);
CREATE INDEX ecc_data_idx   ON ecc_registros(tenant_id, data DESC);

ALTER TABLE ecc_registros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant members can manage ecc"
  ON ecc_registros FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.tenant_id = ecc_registros.tenant_id
        AND memberships.user_id = auth.uid()
    )
  );
