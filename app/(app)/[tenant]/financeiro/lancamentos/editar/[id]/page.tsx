import { createAdminClient } from '@/lib/supabase/server'
import { TransactionEditForm } from './transaction-edit-form'
import { notFound } from 'next/navigation'

export default async function EditarLancamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string; id: string }>
  searchParams: Promise<{ returnTab?: string; returnMonth?: string }>
}) {
  const { tenant: tenantSlug, id } = await params
  const { returnTab, returnMonth } = await searchParams
  const supabase = createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) notFound()

  const { data: transaction } = await supabase
    .from('transactions')
    .select('id, type, account_id, category_id, cost_center_id, person_id, payment_method_id, reference_document, amount, date, due_date, payment_date, description, status')
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .single()
  if (!transaction) notFound()

  const type = transaction.type as 'EXPENSE' | 'INCOME'

  const [
    { data: accounts },
    { data: categories },
    { data: costCenters },
    { data: people },
    { data: paymentMethods },
  ] = await Promise.all([
    supabase.from('financial_accounts').select('id, name, is_default').eq('tenant_id', tenant.id).eq('active', true).order('name'),
    supabase.from('chart_of_accounts').select('id, name, type, parent_id, is_group').eq('tenant_id', tenant.id).eq('active', true),
    supabase.from('cost_centers').select('id, name').eq('tenant_id', tenant.id).eq('active', true).order('name'),
    type === 'EXPENSE'
      ? supabase.from('people').select('id, name').eq('tenant_id', tenant.id).eq('is_supplier', true).eq('active', true).order('name')
      : supabase.from('people').select('id, name').eq('tenant_id', tenant.id).eq('is_client', true).eq('active', true).order('name'),
    supabase.from('payment_methods').select('id, name').eq('tenant_id', tenant.id).eq('active', true).order('name'),
  ])

  return (
    <TransactionEditForm
      transaction={transaction}
      tenantSlug={tenantSlug}
      accounts={accounts ?? []}
      categories={categories ?? []}
      costCenters={costCenters ?? []}
      people={people ?? []}
      paymentMethods={paymentMethods ?? []}
      returnTab={returnTab}
      returnMonth={returnMonth}
    />
  )
}
