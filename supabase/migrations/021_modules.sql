CREATE TABLE modules (
  id          text    PRIMARY KEY,
  name        text    NOT NULL,
  description text,
  active      boolean NOT NULL DEFAULT true
);

INSERT INTO modules (id, name, description) VALUES
  ('financeiro', 'Financeiro',  'Lançamentos, contas a pagar/receber, fluxo de caixa e DRE'),
  ('frota',      'Frota',       'Gestão de veículos e frotas'),
  ('vendas',     'Vendas',      'Módulo de vendas e faturamento'),
  ('crm',        'CRM',         'Gestão de relacionamento com clientes');
