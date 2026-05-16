import { createAdminClient } from '@/lib/supabase/server'
import { CashFlowView } from './cash-flow-view'

export default async function FluxoCaixaPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>
  searchParams: Promise<{ month?: string; account_id?: string; pending?: string }>
}) {
  const { tenant: tenantSlug } = await params
  const { month, account_id, pending } = await searchParams

  const today = new Date()
  const targetMonth = month ?? today.toISOString().slice(0, 7)
  const [year, monthNum] = targetMonth.split('-').map(Number)
  const startDate = `${targetMonth}-01`
  const lastDay = new Date(year, monthNum, 0).getDate()
  const endDate = `${targetMonth}-${String(lastDay).padStart(2, '0')}`
  const includePending = pending === '1'

  const supabase = createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single()

  // Queries paralelas
  const accountsQ = supabase
    .from('financial_accounts')
    .select('id, name, balance')
    .eq('tenant_id', tenant!.id)
    .eq('active', true)
    .order('name')

  // Saldo inicial das contas selecionadas (balance = saldo de abertura da conta)
  let initBalQ = supabase
    .from('financial_accounts')
    .select('balance')
    .eq('tenant_id', tenant!.id)
    .eq('active', true)
  if (account_id) initBalQ = initBalQ.eq('id', account_id)

  // Transações COMPLETED antes do mês (para calcular saldo inicial do período)
  let priorQ = supabase
    .from('transactions')
    .select('type, amount')
    .eq('tenant_id', tenant!.id)
    .eq('status', 'COMPLETED')
    .lt('date', startDate)
    .in('type', ['INCOME', 'EXPENSE'])
  if (account_id) priorQ = priorQ.eq('account_id', account_id)

  // Transações do mês
  let monthQ = supabase
    .from('transactions')
    .select('date, type, amount, status')
    .eq('tenant_id', tenant!.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .in('type', ['INCOME', 'EXPENSE'])
    .order('date')
  if (account_id) monthQ = monthQ.eq('account_id', account_id)
  if (!includePending) {
    monthQ = monthQ.eq('status', 'COMPLETED')
  } else {
    monthQ = monthQ.in('status', ['COMPLETED', 'PENDING'])
  }

  const [
    { data: accounts },
    { data: initAccounts },
    { data: priorTxs },
    { data: monthTxs },
  ] = await Promise.all([accountsQ, initBalQ, priorQ, monthQ])

  const initialAccountBalance = (initAccounts ?? []).reduce((s, a) => s + Number(a.balance), 0)
  const priorNet = (priorTxs ?? []).reduce(
    (s, t) => s + (t.type === 'INCOME' ? Number(t.amount) : -Number(t.amount)),
    0,
  )
  const openingBalance = initialAccountBalance + priorNet

  return (
    <CashFlowView
      tenantSlug={tenantSlug}
      month={targetMonth}
      accounts={accounts ?? []}
      selectedAccountId={account_id ?? ''}
      includePending={includePending}
      openingBalance={openingBalance}
      transactions={(monthTxs ?? []) as { date: string; type: string; amount: number; status: string }[]}
      daysInMonth={lastDay}
    />
  )
}
