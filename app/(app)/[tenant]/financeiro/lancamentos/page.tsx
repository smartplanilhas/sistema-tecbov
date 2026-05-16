import { createAdminClient } from '@/lib/supabase/server'
import { TransactionsView } from './transactions-view'

export default async function LancamentosPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>
  searchParams: Promise<{ tab?: string; month?: string }>
}) {
  const { tenant: tenantSlug } = await params
  const { tab, month } = await searchParams
  const supabase = createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single()

  const [
    { data: transactions },
    { data: transfers },
    { data: categories },
    { data: paymentMethods },
    { data: recurrences },
    { data: costCenters },
    { data: people },
    { data: accounts },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, financial_accounts(name), people(name)')
      .eq('tenant_id', tenant!.id)
      .in('type', ['INCOME', 'EXPENSE'])
      .order('date', { ascending: false })
      .limit(500),
    supabase
      .from('transactions')
      .select('id, transfer_id, date, amount, status, description, financial_accounts(name)')
      .eq('tenant_id', tenant!.id)
      .eq('type', 'TRANSFER')
      .order('date', { ascending: false })
      .limit(500),
    supabase
      .from('chart_of_accounts')
      .select('id, name, type, parent_id, is_group')
      .eq('tenant_id', tenant!.id)
      .eq('active', true)
      .in('type', ['EXPENSE', 'REVENUE']),
    supabase
      .from('payment_methods')
      .select('id, name')
      .eq('tenant_id', tenant!.id)
      .eq('active', true)
      .order('name'),
    supabase
      .from('recurrences')
      .select('*, chart_of_accounts(name), financial_accounts(name), people(name)')
      .eq('tenant_id', tenant!.id)
      .eq('active', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('cost_centers')
      .select('id, name')
      .eq('tenant_id', tenant!.id)
      .eq('active', true)
      .order('name'),
    supabase
      .from('people')
      .select('id, name')
      .eq('tenant_id', tenant!.id)
      .order('name'),
    supabase
      .from('financial_accounts')
      .select('id, name')
      .eq('tenant_id', tenant!.id)
      .eq('active', true)
      .order('name'),
  ])

  const initialTab = tab === 'INCOME' ? 'INCOME' : tab === 'RECURRENCE' ? 'RECURRENCE' : 'EXPENSE'

  return (
    <TransactionsView
      tenantSlug={tenantSlug}
      tenantId={tenant!.id}
      transactions={(transactions ?? []) as Parameters<typeof TransactionsView>[0]['transactions']}
      categories={categories ?? []}
      paymentMethods={paymentMethods ?? []}
      recurrences={(recurrences ?? []) as unknown as Parameters<typeof TransactionsView>[0]['recurrences']}
      costCenters={costCenters ?? []}
      people={people ?? []}
      accounts={accounts ?? []}
      transfers={(transfers ?? []) as Parameters<typeof TransactionsView>[0]['transfers']}
      initialTab={initialTab as Parameters<typeof TransactionsView>[0]['initialTab']}
      initialMonth={month}
    />
  )
}
