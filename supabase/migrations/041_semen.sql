CREATE TABLE semen (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Identificação do touro
  nome_touro     TEXT        NOT NULL,
  registro_rgd   TEXT,
  raca           TEXT,
  apelido_codigo TEXT,
  central_coleta TEXT,
  grau_sangue    TEXT,
  tipo           TEXT        NOT NULL DEFAULT 'convencional', -- convencional | sexado_macho | sexado_femea

  -- Armazenamento
  qtd_doses      INTEGER,
  botijao        TEXT,
  caneca         TEXT,

  -- Dados zootécnicos (DEPs)
  dep_pn         NUMERIC(6,2),
  dep_pd         NUMERIC(6,2),
  dep_ps         NUMERIC(6,2),
  dep_musculo    NUMERIC(6,2),
  dep_acabamento NUMERIC(6,2),

  -- Dados do pai
  pai_nome       TEXT,
  pai_rgd        TEXT,

  observacoes    TEXT,
  status         TEXT        NOT NULL DEFAULT 'ativo',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX semen_tenant_idx ON semen(tenant_id);
CREATE INDEX semen_status_idx ON semen(tenant_id, status);

ALTER TABLE semen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant members can manage semen"
  ON semen FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.tenant_id = semen.tenant_id
        AND memberships.user_id = auth.uid()
    )
  );
