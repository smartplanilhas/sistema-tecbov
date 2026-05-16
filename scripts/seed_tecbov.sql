DO $$
DECLARE
  v_tenant_id     UUID;
  v_account_id    UUID;

  -- Suppliers
  v_agropet       UUID;
  v_nutricao      UUID;
  v_vacinas       UUID;
  v_transportadora UUID;
  v_equipamentos  UUID;

  -- Customers
  v_fazenda_cruz  UUID;
  v_rancho        UUID;
  v_vale_verde    UUID;
  v_sao_joao      UUID;
  v_horizonte     UUID;

  -- Categories
  v_venda_prod    UUID;
  v_prestacao     UUID;
  v_aluguel       UUID;
  v_energia       UUID;
  v_frete         UUID;
  v_comissoes     UUID;
  v_telefone      UUID;
  v_material      UUID;
BEGIN

  -- ── Tenant ────────────────────────────────────────────────────
  SELECT id INTO v_tenant_id FROM tenants WHERE name ILIKE '%tecbov%' LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant Tecbov não encontrado';
  END IF;

  -- ── Conta bancária ────────────────────────────────────────────
  SELECT id INTO v_account_id
  FROM financial_accounts
  WHERE tenant_id = v_tenant_id AND active = true
  ORDER BY is_default DESC NULLS LAST, created_at
  LIMIT 1;

  -- ── Categorias ────────────────────────────────────────────────
  SELECT id INTO v_venda_prod  FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND name = 'Venda de Produtos'     AND is_group = false;
  SELECT id INTO v_prestacao   FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND name = 'Prestação de Serviços' AND is_group = false;
  SELECT id INTO v_aluguel     FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND name = 'Aluguel'               AND is_group = false;
  SELECT id INTO v_energia     FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND name = 'Energia'               AND is_group = false;
  SELECT id INTO v_frete       FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND name = 'Frete'                 AND is_group = false;
  SELECT id INTO v_comissoes   FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND name = 'Comissões'             AND is_group = false;
  SELECT id INTO v_telefone    FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND name = 'Telefone'              AND is_group = false;
  SELECT id INTO v_material    FROM chart_of_accounts WHERE tenant_id = v_tenant_id AND name = 'Material de Escritório' AND is_group = false;

  -- ── Fornecedores ──────────────────────────────────────────────
  INSERT INTO people (tenant_id, name, document, phone, email, is_supplier, is_client, active)
  VALUES
    (v_tenant_id, 'Distribuidora Agropet Ltda',   '12.345.678/0001-90', '(62) 3456-7890', 'compras@agropet.com.br',        true, false, true),
    (v_tenant_id, 'Nutrição Animal SA',            '98.765.432/0001-10', '(62) 3234-5678', 'vendas@nutricaoanimal.com.br',  true, false, true),
    (v_tenant_id, 'Vacinas & Cia Agropecuária',    '45.678.901/0001-23', '(62) 3345-6789', 'atendimento@vacinasecia.com',   true, false, true),
    (v_tenant_id, 'Transportadora Rural Express',  '33.222.111/0001-44', '(64) 3567-8901', 'frete@ruralexpress.com.br',     true, false, true),
    (v_tenant_id, 'Equipamentos Agro Brasil',      '77.888.999/0001-55', '(62) 3678-9012', 'comercial@agrobrasil.com.br',   true, false, true);

  -- ── Clientes ─────────────────────────────────────────────────
  INSERT INTO people (tenant_id, name, document, phone, email, is_supplier, is_client, active)
  VALUES
    (v_tenant_id, 'Fazenda Santa Cruz',       '11.222.333/0001-66', '(64) 99876-5432', 'gerencia@fazendasantacruz.com', false, true, true),
    (v_tenant_id, 'Rancho Bom Retiro',        '22.333.444/0001-77', '(62) 99765-4321', 'compras@bomretiro.com.br',      false, true, true),
    (v_tenant_id, 'Agropecuária Vale Verde',  '33.444.555/0001-88', '(64) 99654-3210', 'financeiro@valeverde.com.br',   false, true, true),
    (v_tenant_id, 'Confinamento São João',    '44.555.666/0001-99', '(62) 99543-2109', 'admin@saojoao.agro',            false, true, true),
    (v_tenant_id, 'Pecuária Horizonte MS',    '55.666.777/0001-00', '(67) 99432-1098', 'contato@pecuariahorizonte.com', false, true, true);

  -- ── IDs das pessoas inseridas ────────────────────────────────
  SELECT id INTO v_agropet        FROM people WHERE tenant_id = v_tenant_id AND name = 'Distribuidora Agropet Ltda';
  SELECT id INTO v_nutricao       FROM people WHERE tenant_id = v_tenant_id AND name = 'Nutrição Animal SA';
  SELECT id INTO v_vacinas        FROM people WHERE tenant_id = v_tenant_id AND name = 'Vacinas & Cia Agropecuária';
  SELECT id INTO v_transportadora FROM people WHERE tenant_id = v_tenant_id AND name = 'Transportadora Rural Express';
  SELECT id INTO v_equipamentos   FROM people WHERE tenant_id = v_tenant_id AND name = 'Equipamentos Agro Brasil';
  SELECT id INTO v_fazenda_cruz   FROM people WHERE tenant_id = v_tenant_id AND name = 'Fazenda Santa Cruz';
  SELECT id INTO v_rancho         FROM people WHERE tenant_id = v_tenant_id AND name = 'Rancho Bom Retiro';
  SELECT id INTO v_vale_verde     FROM people WHERE tenant_id = v_tenant_id AND name = 'Agropecuária Vale Verde';
  SELECT id INTO v_sao_joao       FROM people WHERE tenant_id = v_tenant_id AND name = 'Confinamento São João';
  SELECT id INTO v_horizonte      FROM people WHERE tenant_id = v_tenant_id AND name = 'Pecuária Horizonte MS';

  -- ── Lançamentos — Fevereiro 2026 ─────────────────────────────
  INSERT INTO transactions (tenant_id, type, account_id, person_id, category_id, amount, date, description, status)
  VALUES
    -- Despesas
    (v_tenant_id,'EXPENSE',v_account_id, v_agropet,        v_material, 18500.00,'2026-02-03','Ração bovina e suplementos — fev','COMPLETED'),
    (v_tenant_id,'EXPENSE',v_account_id, v_nutricao,        v_material,  4200.00,'2026-02-05','Suplemento mineral — fevereiro','COMPLETED'),
    (v_tenant_id,'EXPENSE',v_account_id, v_vacinas,         v_material,  3150.00,'2026-02-07','Vacinas febre aftosa — lote 1','COMPLETED'),
    (v_tenant_id,'EXPENSE',v_account_id, v_transportadora,  v_frete,     2800.00,'2026-02-10','Frete transferência de gado','COMPLETED'),
    (v_tenant_id,'EXPENSE',v_account_id, v_equipamentos,    v_material,  6800.00,'2026-02-15','Manutenção bebedouros e cochos','COMPLETED'),
    (v_tenant_id,'EXPENSE',v_account_id, NULL,              v_aluguel,   3200.00,'2026-02-05','Aluguel pasto arrendado — fev','COMPLETED'),
    (v_tenant_id,'EXPENSE',v_account_id, NULL,              v_energia,    640.00,'2026-02-28','Energia elétrica — fevereiro','COMPLETED'),
    (v_tenant_id,'EXPENSE',v_account_id, NULL,              v_telefone,   290.00,'2026-02-28','Internet e telefonia — fev','COMPLETED'),
    -- Receitas
    (v_tenant_id,'INCOME', v_account_id, v_fazenda_cruz,   v_venda_prod, 45000.00,'2026-02-12','Venda 15 bovinos — arroba','COMPLETED'),
    (v_tenant_id,'INCOME', v_account_id, v_rancho,          v_venda_prod, 28000.00,'2026-02-18','Venda novilhas recria','COMPLETED'),
    (v_tenant_id,'INCOME', v_account_id, v_vale_verde,      v_prestacao,   5500.00,'2026-02-20','Consultoria manejo nutricional','COMPLETED'),
    (v_tenant_id,'INCOME', v_account_id, v_sao_joao,        v_venda_prod, 32000.00,'2026-02-25','Venda bois confinamento — 8 cab.','COMPLETED'),

  -- ── Lançamentos — Março 2026 ──────────────────────────────────
    -- Despesas
    (v_tenant_id,'EXPENSE',v_account_id, v_agropet,         v_material,  21300.00,'2026-03-04','Ração bovina e sal mineral — mar','COMPLETED'),
    (v_tenant_id,'EXPENSE',v_account_id, v_nutricao,         v_material,   4800.00,'2026-03-06','Suplemento proteico — março','COMPLETED'),
    (v_tenant_id,'EXPENSE',v_account_id, v_vacinas,          v_material,   2900.00,'2026-03-08','Vermífugos e antiparasitários','COMPLETED'),
    (v_tenant_id,'EXPENSE',v_account_id, v_transportadora,   v_frete,      3400.00,'2026-03-12','Frete compra de gado — MS','COMPLETED'),
    (v_tenant_id,'EXPENSE',v_account_id, v_equipamentos,     v_material,  12500.00,'2026-03-20','Aquisição balança eletrônica','COMPLETED'),
    (v_tenant_id,'EXPENSE',v_account_id, NULL,               v_aluguel,    3200.00,'2026-03-05','Aluguel pasto arrendado — mar','COMPLETED'),
    (v_tenant_id,'EXPENSE',v_account_id, NULL,               v_energia,     680.00,'2026-03-31','Energia elétrica — março','COMPLETED'),
    (v_tenant_id,'EXPENSE',v_account_id, NULL,               v_comissoes,   1800.00,'2026-03-15','Comissão corretor — compra gado','COMPLETED'),
    (v_tenant_id,'EXPENSE',v_account_id, NULL,               v_telefone,    290.00,'2026-03-31','Internet e telefonia — mar','COMPLETED'),
    -- Receitas
    (v_tenant_id,'INCOME', v_account_id, v_horizonte,        v_venda_prod, 67000.00,'2026-03-10','Venda boi gordo — 20 cab.','COMPLETED'),
    (v_tenant_id,'INCOME', v_account_id, v_fazenda_cruz,     v_prestacao,   8500.00,'2026-03-14','Consultoria genética rebanho','COMPLETED'),
    (v_tenant_id,'INCOME', v_account_id, v_sao_joao,         v_venda_prod, 41000.00,'2026-03-22','Venda garrotes confinamento','COMPLETED'),
    (v_tenant_id,'INCOME', v_account_id, v_vale_verde,       v_venda_prod, 19500.00,'2026-03-28','Venda bezerros desmama','COMPLETED'),

  -- ── Lançamentos — Abril 2026 ──────────────────────────────────
    -- Despesas
    (v_tenant_id,'EXPENSE',v_account_id, v_agropet,          v_material,  23100.00,'2026-04-02','Ração bovina — abril','COMPLETED'),
    (v_tenant_id,'EXPENSE',v_account_id, v_nutricao,          v_material,   5200.00,'2026-04-04','Suplemento proteico — abril','COMPLETED'),
    (v_tenant_id,'EXPENSE',v_account_id, v_vacinas,           v_material,   4100.00,'2026-04-08','Campanha vacinação IBR/BVD','COMPLETED'),
    (v_tenant_id,'EXPENSE',v_account_id, v_transportadora,    v_frete,      2200.00,'2026-04-11','Frete venda gado abate','COMPLETED'),
    (v_tenant_id,'EXPENSE',v_account_id, v_equipamentos,      v_material,   3500.00,'2026-04-18','Manutenção curral e instalações','COMPLETED'),
    (v_tenant_id,'EXPENSE',v_account_id, NULL,                v_aluguel,    3200.00,'2026-04-05','Aluguel pasto arrendado — abr','COMPLETED'),
    (v_tenant_id,'EXPENSE',v_account_id, NULL,                v_energia,     720.00,'2026-04-30','Energia elétrica — abril','COMPLETED'),
    (v_tenant_id,'EXPENSE',v_account_id, NULL,                v_comissoes,  1200.00,'2026-04-22','Comissão corretor — venda boi','COMPLETED'),
    (v_tenant_id,'EXPENSE',v_account_id, NULL,                v_telefone,    290.00,'2026-04-30','Internet e telefonia — abr','COMPLETED'),
    -- Receitas
    (v_tenant_id,'INCOME', v_account_id, v_rancho,            v_venda_prod, 55000.00,'2026-04-08','Venda boi gordo frigorífico','COMPLETED'),
    (v_tenant_id,'INCOME', v_account_id, v_horizonte,         v_venda_prod, 38500.00,'2026-04-16','Venda novilhas prenhas','COMPLETED'),
    (v_tenant_id,'INCOME', v_account_id, v_fazenda_cruz,      v_prestacao,   7200.00,'2026-04-22','Consultoria manejo reprodutivo','COMPLETED'),
    (v_tenant_id,'INCOME', v_account_id, v_vale_verde,        v_prestacao,   4800.00,'2026-04-25','Treinamento equipe técnica','COMPLETED'),
    (v_tenant_id,'INCOME', v_account_id, v_sao_joao,          v_venda_prod,  2100.00,'2026-04-28','Venda esterco / adubo orgânico','COMPLETED');

  RAISE NOTICE 'Tecbov seed OK — tenant: %, conta: %', v_tenant_id, v_account_id;
END;
$$;
