import { createAdminClient } from '@/lib/supabase/server'
import { ExtratoView } from './extrato-view'

export default async function ExtratoPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>
  searchParams: Promise<{ start?: string; end?: string }>
}) {
  const { tenant: tenantSlug } = await params
  const { start: qStart, end: qEnd } = await searchParams

  const now = new Date()
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const today = now.toISOString().split('T')[0]
  const start = qStart || firstDay
  const end = qEnd || today

  const supabase = createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('slug', tenantSlug)
    .single()

  const [{ data: accounts }, { data: transactions }] = await Promise.all([
    supabase
      .from('financial_accounts')
      .select('id, name')
      .eq('tenant_id', tenant!.id)
      .eq('active', true)
      .order('name'),
    supabase
      .from('transactions')
      .select('id, date, type, amount, status, description, transfer_id, financial_accounts(name), chart_of_accounts(name), people(name)')
      .eq('tenant_id', tenant!.id)
      .gte('date', start)
      .lte('date', end)
      .neq('status', 'CANCELLED')
      .order('date', { ascending: true })
      .limit(2000),
  ])

  return (
    <ExtratoView
      tenantName={tenant!.name}
      accounts={accounts ?? []}
      transactions={(transactions ?? []) as unknown as Parameters<typeof ExtratoView>[0]['transactions']}
      start={start}
      end={end}
    />
  )
}
