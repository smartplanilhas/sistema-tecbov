CREATE TABLE plans (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  slug          text        NOT NULL UNIQUE,
  max_users     int         NOT NULL,
  price_monthly numeric(10,2),
  price_yearly  numeric(10,2),
  active        boolean     NOT NULL DEFAULT true,
  sort_order    int         NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE plan_modules (
  plan_id   uuid REFERENCES plans(id)   ON DELETE CASCADE,
  module_id text REFERENCES modules(id) ON DELETE CASCADE,
  PRIMARY KEY (plan_id, module_id)
);

INSERT INTO plans (name, slug, max_users, price_monthly, price_yearly, sort_order) VALUES
  ('Essência', 'essencia', 1,  79.00,  790.00, 1),
  ('Padrão',   'padrao',   3, 129.00, 1290.00, 2),
  ('Avançado', 'avancado', 5, 199.00, 1990.00, 3);

-- Todos os planos incluem o módulo financeiro
INSERT INTO plan_modules (plan_id, module_id)
SELECT id, 'financeiro' FROM plans;
