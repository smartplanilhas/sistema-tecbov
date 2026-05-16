import { createAdminClient } from '@/lib/supabase/server'
import { DREView } from './dre-view'

export default async function DREPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>
  searchParams: Promise<{ month?: string }>
}) {
  const { tenant: tenantSlug } = await params
  const { month } = await searchParams

  const today = new Date()
  const targetMonth = month ?? today.toISOString().slice(0, 7)
  const [year, monthNum] = targetMonth.split('-').map(Number)
  const startDate = `${targetMonth}-01`
  const lastDay = new Date(year, monthNum, 0).getDate()
  const endDate = `${targetMonth}-${String(lastDay).padStart(2, '0')}`

  const supabase = createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single()

  const [{ data: coa }, { data: txData }] = await Promise.all([
    supabase
      .from('chart_of_accounts')
      .select('id, code, name, type, parent_id, is_group, level')
      .eq('tenant_id', tenant!.id)
      .in('type', ['REVENUE', 'EXPENSE'])
      .order('code'),
    supabase
      .from('transactions')
      .select('category_id, type, amount')
      .eq('tenant_id', tenant!.id)
      .eq('status', 'COMPLETED')
      .gte('date', startDate)
      .lte('date', endDate)
      .in('type', ['INCOME', 'EXPENSE']),
  ])

  const sumByCategory: Record<string, number> = {}
  for (const tx of txData ?? []) {
    if (!tx.category_id) continue
    sumByCategory[tx.category_id] = (sumByCategory[tx.category_id] ?? 0) + Number(tx.amount)
  }

  return (
    <DREView
      month={targetMonth}
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
