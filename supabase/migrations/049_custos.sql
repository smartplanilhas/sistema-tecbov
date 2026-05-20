-- Categorias de custo (padrão global, sem tenant)
CREATE TABLE IF NOT EXISTS categorias_custo (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome  text NOT NULL,
  ordem int  NOT NULL DEFAULT 0
);

INSERT INTO categorias_custo (nome, ordem) VALUES
  ('Alimentação',    1),
  ('Sanidade',       2),
  ('Mão de obra',    3),
  ('Transporte',     4),
  ('Infraestrutura', 5),
  ('Compra',         6),
  ('Outros',         7)
ON CONFLICT DO NOTHING;

-- Registro principal de custo de produção
CREATE TABLE IF NOT EXISTS custos_producao (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  data                    date NOT NULL DEFAULT CURRENT_DATE,
  descricao               text NOT NULL,
  valor_total             numeric(12,2) NOT NULL CHECK (valor_total > 0),
  tipo                    text NOT NULL CHECK (tipo IN ('individual', 'coletivo')),
  categoria_id            uuid REFERENCES categorias_custo(id),
  origem                  text NOT NULL CHECK (origem IN (
                            'estoque',
                            'protocolo_alimentar',
                            'pastagem',
                            'lancamento_direto',
                            'manejo_sanitario'
                          )),
  -- Vínculo alvo (mutuamente exclusivos por tipo)
  lote_id                 uuid REFERENCES lotes(id)   ON DELETE SET NULL,
  animal_id               uuid REFERENCES animals(id) ON DELETE SET NULL,
  -- Rastreabilidade da origem
  movimentacao_estoque_id uuid REFERENCES movimentacoes_estoque(id) ON DELETE SET NULL,
  -- Metadados do rateio
  metodo_rateio           text CHECK (metodo_rateio IN ('por_cabeca', 'por_peso')),
  qtd_animais_rateio      int,
  observacao              text,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custos_producao_tenant  ON custos_producao(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custos_producao_lote    ON custos_producao(lote_id);
CREATE INDEX IF NOT EXISTS idx_custos_producao_animal  ON custos_producao(animal_id);
CREATE INDEX IF NOT EXISTS idx_custos_producao_mov     ON custos_producao(movimentacao_estoque_id);
CREATE INDEX IF NOT EXISTS idx_custos_producao_data    ON custos_producao(tenant_id, data DESC);

-- Linhas de rateio por animal (geradas a partir de custo coletivo)
CREATE TABLE IF NOT EXISTS rateio_custos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custo_id        uuid NOT NULL REFERENCES custos_producao(id) ON DELETE CASCADE,
  animal_id       uuid NOT NULL REFERENCES animals(id)         ON DELETE CASCADE,
  valor_rateado   numeric(12,2) NOT NULL,
  peso_referencia numeric(8,3),  -- peso do animal no momento (futuro: método por_peso)
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rateio_custos_custo  ON rateio_custos(custo_id);
CREATE INDEX IF NOT EXISTS idx_rateio_custos_animal ON rateio_custos(animal_id);

-- Cache de custo total nas tabelas existentes
ALTER TABLE lotes   ADD COLUMN IF NOT EXISTS custo_total numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE animals ADD COLUMN IF NOT EXISTS custo_total numeric(12,2) NOT NULL DEFAULT 0;
