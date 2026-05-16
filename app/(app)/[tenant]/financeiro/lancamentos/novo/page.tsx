import { createAdminClient } from '@/lib/supabase/server'
import { TransactionForm } from './transaction-form'
import { notFound } from 'next/navigation'

export default async function NovoLancamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>
  searchParams: Promise<{ type?: string; returnTab?: string; returnMonth?: string }>
}) {
  const { tenant: tenantSlug } = await params
  const { type, returnTab, returnMonth } = await searchParams

  if (type !== 'EXPENSE' && type !== 'INCOME') notFound()

  const supabase = createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) notFound()

  const [
    { data: accounts },
    { data: categories },
    { data: costCenters },
    { data: people },
    { data: paymentMethods },
  ] = await Promise.all([
    supabase
      .from('financial_accounts')
      .select('id, name, is_default')
      .eq('tenant_id', tenant.id)
      .eq('active', true)
      .order('name'),
    supabase
      .from('chart_of_accounts')
      .select('id, name, type, parent_id, is_group')
      .eq('tenant_id', tenant.id)
      .eq('active', true),
    supabase
      .from('cost_centers')
      .select('id, name')
      .eq('tenant_id', tenant.id)
      .eq('active', true)
      .order('name'),
    type === 'EXPENSE'
      ? supabase.from('people').select('id, name').eq('tenant_id', tenant.id).eq('is_supplier', true).eq('active', true).order('name')
      : supabase.from('people').select('id, name').eq('tenant_id', tenant.id).eq('is_client', true).eq('active', true).order('name'),
    supabase
      .from('payment_methods')
      .select('id, name')
      .eq('tenant_id', tenant.id)
      .eq('active', true)
      .order('name'),
  ])

  const defaultAccountId = (accounts ?? []).find((a) => a.is_default)?.id

  return (
    <TransactionForm
      type={type}
      tenantId={tenant.id}
      tenantSlug={tenantSlug}
      accounts={accounts ?? []}
      categories={categories ?? []}
      costCenters={costCenters ?? []}
      people={people ?? []}
      paymentMethods={paymentMethods ?? []}
      defaultAccountId={defaultAccountId}
      returnTab={returnTab}
      returnMonth={returnMonth}
    />
  )
}
