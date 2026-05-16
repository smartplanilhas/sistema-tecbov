import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

async function run() {
  // ── Tenant ──────────────────────────────────────────────────
  const { data: tenant } = await supabase
    .from('tenants').select('id').ilike('name', '%tecbov%').limit(1).single()
  if (!tenant) throw new Error('Tenant Tecbov não encontrado')
  const tenantId = tenant.id
  console.log('Tenant:', tenantId)

  // ── Conta bancária ───────────────────────────────────────────
  const { data: accounts } = await supabase
    .from('financial_accounts').select('id, is_default')
    .eq('tenant_id', tenantId).eq('active', true)
    .order('is_default', { ascending: false })
  const accountId = accounts?.[0]?.id
  if (!accountId) throw new Error('Nenhuma conta ativa encontrada')
  console.log('Conta:', accountId)

  // ── Categorias ───────────────────────────────────────────────
  const { data: cats } = await supabase
    .from('chart_of_accounts').select('id, name')
    .eq('tenant_id', tenantId).eq('is_group', false)
  const cat = (name) => cats?.find(c => c.name === name)?.id ?? null
  const venda    = cat('Venda de Produtos')
  const prestacao = cat('Prestação de Serviços')
  const aluguel  = cat('Aluguel')
  const energia  = cat('Energia')
  const frete    = cat('Frete')
  const comissoes = cat('Comissões')
  const telefone = cat('Telefone')
  const material = cat('Material de Escritório')
  console.log('Categorias:', { venda, prestacao, aluguel, frete })

  // ── Fornecedores ─────────────────────────────────────────────
  const { data: suppInserted } = await supabase.from('people').insert([
    { tenant_id: tenantId, name: 'Distribuidora Agropet Ltda',  document: '12.345.678/0001-90', phone: '(62) 3456-7890', email: 'compras@agropet.com.br',        is_supplier: true,  is_client: false },
    { tenant_id: tenantId, name: 'Nutrição Animal SA',           document: '98.765.432/0001-10', phone: '(62) 3234-5678', email: 'vendas@nutricaoanimal.com.br',  is_supplier: true,  is_client: false },
    { tenant_id: tenantId, name: 'Vacinas & Cia Agropecuária',   document: '45.678.901/0001-23', phone: '(62) 3345-6789', email: 'atendimento@vacinasecia.com',   is_supplier: true,  is_client: false },
    { tenant_id: tenantId, name: 'Transportadora Rural Express', document: '33.222.111/0001-44', phone: '(64) 3567-8901', email: 'frete@ruralexpress.com.br',     is_supplier: true,  is_client: false },
    { tenant_id: tenantId, name: 'Equipamentos Agro Brasil',     document: '77.888.999/0001-55', phone: '(62) 3678-9012', email: 'comercial@agrobrasil.com.br',   is_supplier: true,  is_client: false },
  ]).select('id, name')
  if (!suppInserted) throw new Error('Erro ao inserir fornecedores')
  console.log('Fornecedores inseridos:', suppInserted.length)

  // ── Clientes ─────────────────────────────────────────────────
  const { data: cliInserted } = await supabase.from('people').insert([
    { tenant_id: tenantId, name: 'Fazenda Santa Cruz',      document: '11.222.333/0001-66', phone: '(64) 99876-5432', email: 'gerencia@fazendasantacruz.com', is_supplier: false, is_client: true },
    { tenant_id: tenantId, name: 'Rancho Bom Retiro',       document: '22.333.444/0001-77', phone: '(62) 99765-4321', email: 'compras@bomretiro.com.br',      is_supplier: false, is_client: true },
    { tenant_id: tenantId, name: 'Agropecuária Vale Verde', document: '33.444.555/0001-88', phone: '(64) 99654-3210', email: 'financeiro@valeverde.com.br',   is_supplier: false, is_client: true },
    { tenant_id: tenantId, name: 'Confinamento São João',   document: '44.555.666/0001-99', phone: '(62) 99543-2109', email: 'admin@saojoao.agro',            is_supplier: false, is_client: true },
    { tenant_id: tenantId, name: 'Pecuária Horizonte MS',   document: '55.666.777/0001-00', phone: '(67) 99432-1098', email: 'contato@pecuariahorizonte.com', is_supplier: false, is_client: true },
  ]).select('id, name')
  if (!cliInserted) throw new Error('Erro ao inserir clientes')
  console.log('Clientes inseridos:', cliInserted.length)

  // Helper: find by name
  const pid = (name) => [...(suppInserted ?? []), ...(cliInserted ?? [])].find(p => p.name === name)?.id ?? null

  // ── Lançamentos ──────────────────────────────────────────────
  const txs = [
    // ── Fevereiro 2026 ──────────────────────────────────────────
    { type:'EXPENSE', person_id: pid('Distribuidora Agropet Ltda'),  category_id: material, amount: 18500.00, date:'2026-02-03', description:'Ração bovina e suplementos — fev',    status:'COMPLETED' },
    { type:'EXPENSE', person_id: pid('Nutrição Animal SA'),           category_id: material, amount:  4200.00, date:'2026-02-05', description:'Suplemento mineral — fevereiro',        status:'COMPLETED' },
    { type:'EXPENSE', person_id: pid('Vacinas & Cia Agropecuária'),   category_id: material, amount:  3150.00, date:'2026-02-07', description:'Vacinas febre aftosa — lote 1',         status:'COMPLETED' },
    { type:'EXPENSE', person_id: pid('Transportadora Rural Express'), category_id: frete,    amount:  2800.00, date:'2026-02-10', description:'Frete transferência de gado',            status:'COMPLETED' },
    { type:'EXPENSE', person_id: pid('Equipamentos Agro Brasil'),     category_id: material, amount:  6800.00, date:'2026-02-15', description:'Manutenção bebedouros e cochos',        status:'COMPLETED' },
    { type:'EXPENSE', person_id: null,                                category_id: aluguel,  amount:  3200.00, date:'2026-02-05', description:'Aluguel pasto arrendado — fev',         status:'COMPLETED' },
    { type:'EXPENSE', person_id: null,                                category_id: energia,  amount:   640.00, date:'2026-02-28', description:'Energia elétrica — fevereiro',          status:'COMPLETED' },
    { type:'EXPENSE', person_id: null,                                category_id: telefone, amount:   290.00, date:'2026-02-28', description:'Internet e telefonia — fev',            status:'COMPLETED' },
    { type:'INCOME',  person_id: pid('Fazenda Santa Cruz'),          category_id: venda,    amount: 45000.00, date:'2026-02-12', description:'Venda 15 bovinos — arroba',             status:'COMPLETED' },
    { type:'INCOME',  person_id: pid('Rancho Bom Retiro'),           category_id: venda,    amount: 28000.00, date:'2026-02-18', description:'Venda novilhas recria',                 status:'COMPLETED' },
    { type:'INCOME',  person_id: pid('Agropecuária Vale Verde'),     category_id: prestacao, amount:  5500.00, date:'2026-02-20', description:'Consultoria manejo nutricional',        status:'COMPLETED' },
    { type:'INCOME',  person_id: pid('Confinamento São João'),       category_id: venda,    amount: 32000.00, date:'2026-02-25', description:'Venda bois confinamento — 8 cab.',      status:'COMPLETED' },

    // ── Março 2026 ───────────────────────────────────────────────
    { type:'EXPENSE', person_id: pid('Distribuidora Agropet Ltda'),  category_id: material,  amount: 21300.00, date:'2026-03-04', description:'Ração bovina e sal mineral — mar',     status:'COMPLETED' },
    { type:'EXPENSE', person_id: pid('Nutrição Animal SA'),           category_id: material,  amount:  4800.00, date:'2026-03-06', description:'Suplemento proteico — março',          status:'COMPLETED' },
    { type:'EXPENSE', person_id: pid('Vacinas & Cia Agropecuária'),   category_id: material,  amount:  2900.00, date:'2026-03-08', description:'Vermífugos e antiparasitários',         status:'COMPLETED' },
    { type:'EXPENSE', person_id: pid('Transportadora Rural Express'), category_id: frete,     amount:  3400.00, date:'2026-03-12', description:'Frete compra de gado — MS',            status:'COMPLETED' },
    { type:'EXPENSE', person_id: pid('Equipamentos Agro Brasil'),     category_id: material,  amount: 12500.00, date:'2026-03-20', description:'Aquisição balança eletrônica',         status:'COMPLETED' },
    { type:'EXPENSE', person_id: null,                                category_id: aluguel,   amount:  3200.00, date:'2026-03-05', description:'Aluguel pasto arrendado — mar',        status:'COMPLETED' },
    { type:'EXPENSE', person_id: null,                                category_id: energia,   amount:   680.00, date:'2026-03-31', description:'Energia elétrica — março',             status:'COMPLETED' },
    { type:'EXPENSE', person_id: null,                                category_id: comissoes, amount:  1800.00, date:'2026-03-15', description:'Comissão corretor — compra gado',      status:'COMPLETED' },
    { type:'EXPENSE', person_id: null,                                category_id: telefone,  amount:   290.00, date:'2026-03-31', description:'Internet e telefonia — mar',           status:'COMPLETED' },
    { type:'INCOME',  person_id: pid('Pecuária Horizonte MS'),        category_id: venda,     amount: 67000.00, date:'2026-03-10', description:'Venda boi gordo — 20 cab.',            status:'COMPLETED' },
    { type:'INCOME',  person_id: pid('Fazenda Santa Cruz'),           category_id: prestacao, amount:  8500.00, date:'2026-03-14', description:'Consultoria genética rebanho',         status:'COMPLETED' },
    { type:'INCOME',  person_id: pid('Confinamento São João'),        category_id: venda,     amount: 41000.00, date:'2026-03-22', description:'Venda garrotes confinamento',          status:'COMPLETED' },
    { type:'INCOME',  person_id: pid('Agropecuária Vale Verde'),      category_id: venda,     amount: 19500.00, date:'2026-03-28', description:'Venda bezerros desmama',               status:'COMPLETED' },

    // ── Abril 2026 ───────────────────────────────────────────────
    { type:'EXPENSE', person_id: pid('Distribuidora Agropet Ltda'),  category_id: material,  amount: 23100.00, date:'2026-04-02', description:'Ração bovina — abril',                 status:'COMPLETED' },
    { type:'EXPENSE', person_id: pid('Nutrição Animal SA'),           category_id: material,  amount:  5200.00, date:'2026-04-04', description:'Suplemento proteico — abril',          status:'COMPLETED' },
    { type:'EXPENSE', person_id: pid('Vacinas & Cia Agropecuária'),   category_id: material,  amount:  4100.00, date:'2026-04-08', description:'Campanha vacinação IBR/BVD',           status:'COMPLETED' },
    { type:'EXPENSE', person_id: pid('Transportadora Rural Express'), category_id: frete,     amount:  2200.00, date:'2026-04-11', description:'Frete venda gado abate',               status:'COMPLETED' },
    { type:'EXPENSE', person_id: pid('Equipamentos Agro Brasil'),     category_id: material,  amount:  3500.00, date:'2026-04-18', description:'Manutenção curral e instalações',      status:'COMPLETED' },
    { type:'EXPENSE', person_id: null,                                category_id: aluguel,   amount:  3200.00, date:'2026-04-05', description:'Aluguel pasto arrendado — abr',        status:'COMPLETED' },
    { type:'EXPENSE', person_id: null,                                category_id: energia,   amount:   720.00, date:'2026-04-30', description:'Energia elétrica — abril',             status:'COMPLETED' },
    { type:'EXPENSE', person_id: null,                                category_id: comissoes, amount:  1200.00, date:'2026-04-22', description:'Comissão corretor — venda boi',        status:'COMPLETED' },
    { type:'EXPENSE', person_id: null,                                category_id: telefone,  amount:   290.00, date:'2026-04-30', description:'Internet e telefonia — abr',           status:'COMPLETED' },
    { type:'INCOME',  person_id: pid('Rancho Bom Retiro'),            category_id: venda,     amount: 55000.00, date:'2026-04-08', description:'Venda boi gordo frigorífico',          status:'COMPLETED' },
    { type:'INCOME',  person_id: pid('Pecuária Horizonte MS'),        category_id: venda,     amount: 38500.00, date:'2026-04-16', description:'Venda novilhas prenhas',               status:'COMPLETED' },
    { type:'INCOME',  person_id: pid('Fazenda Santa Cruz'),           category_id: prestacao, amount:  7200.00, date:'2026-04-22', description:'Consultoria manejo reprodutivo',       status:'COMPLETED' },
    { type:'INCOME',  person_id: pid('Agropecuária Vale Verde'),      category_id: prestacao, amount:  4800.00, date:'2026-04-25', description:'Treinamento equipe técnica',           status:'COMPLETED' },
    { type:'INCOME',  person_id: pid('Confinamento São João'),        category_id: venda,     amount:  2100.00, date:'2026-04-28', description:'Venda esterco / adubo orgânico',       status:'COMPLETED' },
  ].map(tx => ({ ...tx, tenant_id: tenantId, account_id: accountId }))

  const { error: txErr } = await supabase.from('transactions').insert(txs)
  if (txErr) throw new Error('Erro ao inserir lançamentos: ' + txErr.message)
  console.log(`Lançamentos inseridos: ${txs.length}`)
  console.log('Seed Tecbov concluído com sucesso!')
}

run().catch(e => { console.error(e.message); process.exit(1) })
