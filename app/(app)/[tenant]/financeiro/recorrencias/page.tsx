import { createAdminClient } from '@/lib/supabase/server'
import { RecurrencesView } from './recurrences-view'

export default async function RecorrenciasPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant: tenantSlug } = await params
  const supabase = createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single()

  const [
    { data: recurrences },
    { data: people },
    { data: expenseCategories },
    { data: revenueCategories },
    { data: costCenters },
    { data: financialAccounts },
    { data: paymentMethods },
  ] = await Promise.all([
    supabase
      .from('recurrences')
      .select('*')
      .eq('tenant_id', tenant!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('people')
      .select('id, name')
      .eq('tenant_id', tenant!.id)
      .eq('active', true)
      .order('name'),
    supabase
      .from('chart_of_accounts')
      .select('id, name')
      .eq('tenant_id', tenant!.id)
      .eq('type', 'EXPENSE')
      .eq('active', true)
      .order('name'),
    supabase
      .from('chart_of_accounts')
      .select('id, name')
      .eq('tenant_id', tenant!.id)
      .eq('type', 'REVENUE')
      .eq('active', true)
      .order('name'),
    supabase
      .from('cost_centers')
      .select('id, name')
      .eq('tenant_id', tenant!.id)
      .eq('active', true)
      .order('name'),
    supabase
      .from('financial_accounts')
      .select('id, name')
      .eq('tenant_id', tenant!.id)
      .eq('active', true)
      .order('name'),
    supabase
      .from('payment_methods')
      .select('id, name')
      .eq('tenant_id', tenant!.id)
      .eq('active', true)
      .order('name'),
  ])

  return (
    <RecurrencesView
      tenantId={tenant!.id}
      recurrences={recurrences ?? []}
      people={people ?? []}
      expenseCategories={expenseCategories ?? []}
      revenueCategories={revenueCategories ?? []}
      costCenters={costCenters ?? []}
      financialAccounts={financialAccounts ?? []}
      paymentMethods={paymentMethods ?? []}
    />
  )
}
