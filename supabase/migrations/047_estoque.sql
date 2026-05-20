-- Tipos de uso (padrão do sistema, sem tenant)
CREATE TABLE IF NOT EXISTS tipos_uso_estoque (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome  text NOT NULL,
  ordem int  NOT NULL DEFAULT 0
);

INSERT INTO tipos_uso_estoque (nome, ordem) VALUES
  ('Alimentação', 1),
  ('Sanidade',    2),
  ('Operacional', 3),
  ('Outro',       4)
ON CONFLICT DO NOTHING;

-- Categorias de produto (global tenant_id=null, ou por tenant)
CREATE TABLE IF NOT EXISTS categorias_estoque (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  nome      text NOT NULL,
  ativa     boolean NOT NULL DEFAULT true
);

-- Categorias padrão globais
INSERT INTO categorias_estoque (tenant_id, nome) VALUES
  (null, 'Ração'),
  (null, 'Sal Mineral'),
  (null, 'Suplementos'),
  (null, 'Manutenção'),
  (null, 'Material de Escritório')
ON CONFLICT DO NOTHING;

-- Produtos de estoque
CREATE TABLE IF NOT EXISTS produtos_estoque (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  codigo           text    NOT NULL,
  descricao        text    NOT NULL,
  unidade          text,
  valor_medio      numeric(12,4),
  controla_estoque boolean NOT NULL DEFAULT true,
  saldo_atual      numeric(12,3) NOT NULL DEFAULT 0,
  estoque_minimo   numeric(12,3),
  categoria_id     uuid    REFERENCES categorias_estoque(id),
  tipo_uso_id      uuid    REFERENCES tipos_uso_estoque(id),
  observacao       text,
  ativo            boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_produtos_estoque_tenant ON produtos_estoque(tenant_id);
