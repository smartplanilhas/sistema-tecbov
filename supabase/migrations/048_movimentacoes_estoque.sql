CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  produto_id     uuid    NOT NULL REFERENCES produtos_estoque(id),
  tipo           text    NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  quantidade     numeric(12,3) NOT NULL CHECK (quantidade > 0),
  valor_unitario numeric(12,4),
  data           date    NOT NULL DEFAULT CURRENT_DATE,
  motivo         text,
  lote_id        uuid    REFERENCES lotes(id),
  animal_id      uuid    REFERENCES animals(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_tenant  ON movimentacoes_estoque(tenant_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_produto ON movimentacoes_estoque(produto_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_data    ON movimentacoes_estoque(tenant_id, data DESC);
