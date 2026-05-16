import { createAdminClient } from '@/lib/supabase/server'
import { MonthlyFlowView } from './monthly-flow-view'

export default async function FluxoMensalPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>
  searchParams: Promise<{ year?: string; account_id?: string; pending?: string }>
}) {
  const { tenant: tenantSlug } = await params
  const { year: yearParam, account_id, pending } = await searchParams

  const year = yearParam ? parseInt(yearParam) : new Date().getFullYear()
  const startDate    = `${year}-01-01`
  const endDate      = `${year}-12-31`
  const includePending = pending === '1'

  const supabase = createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single()

  let txQ = supabase
    .from('transactions')
    .select('category_id, amount, date')
    .eq('tenant_id', tenant!.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .in('type', ['INCOME', 'EXPENSE'])

  if (includePending) {
    txQ = txQ.in('status', ['COMPLETED', 'PENDING'])
  } else {
    txQ = txQ.eq('status', 'COMPLETED')
  }
  if (account_id) txQ = txQ.eq('account_id', account_id)

  const [{ data: coa }, { data: accounts }, { data: txData }] = await Promise.all([
    supabase
      .from('chart_of_accounts')
      .select('id, code, name, type, parent_id, is_group, level')
      .eq('tenant_id', tenant!.id)
      .in('type', ['REVENUE', 'EXPENSE'])
      .order('code'),
    supabase
      .from('financial_accounts')
      .select('id, name')
      .eq('tenant_id', tenant!.id)
      .eq('active', true)
      .order('name'),
    txQ,
  ])

  // Aggregate: sumByCategory[categoryId] = [jan, feb, ..., dec] (0-indexed)
  const sumByCategory: Record<string, number[]> = {}
  for (const tx of txData ?? []) {
    if (!tx.category_id) continue
    const monthIdx = parseInt(tx.date.split('-')[1]) - 1
    if (!sumByCategory[tx.category_id]) sumByCategory[tx.category_id] = Array(12).fill(0)
    sumByCategory[tx.category_id][monthIdx] += Number(tx.amount)
  }

  return (
    <MonthlyFlowView
      year={year}
      selectedAccountId={account_id ?? ''}
      includePending={includePending}
      accounts={(accounts ?? []) as { id: string; name: string }[]}
      coa={(coa ?? []) as {
        id: string
        code: string
        name: string
        type: string
        parent_id: string | null
        is_group: boolean
        level: number
      }[]}
      sumByCategory={sumByCategory}
    />
  )
}
