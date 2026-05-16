import { createAdminClient } from '@/lib/supabase/server'
import { SettingsView } from './settings-view'

export default async function ConfiguracoesPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant: tenantSlug } = await params
  const supabase = createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug, parent_id')
    .eq('slug', tenantSlug)
    .single()

  const db = supabase as any
  const [
    { data: accounts },
    { data: members },
    { data: filiais },
    { data: coa },
    { data: costCenters },
    { data: paymentMethods },
    { data: subscription },
    { data: proprietarios },
    { data: reproducaoConfigRaw },
  ] = await Promise.all([
    supabase.from('financial_accounts').select('*').eq('tenant_id', tenant!.id).order('name'),
    supabase.from('memberships').select('role, user_id').eq('tenant_id', tenant!.id),
    supabase.from('tenants').select('id, name, slug').eq('parent_id', tenant!.id).order('name'),
    supabase.from('chart_of_accounts').select('*').eq('tenant_id', tenant!.id).order('code'),
    supabase.from('cost_centers').select('*').eq('tenant_id', tenant!.id).order('name'),
    supabase.from('payment_methods')
      .select('id, name, active, financial_account_id, financial_accounts(name)')
      .eq('tenant_id', tenant!.id)
      .order('name'),
    supabase.from('tenant_subscriptions')
      .select('*, plans(id, name, slug, max_users)')
      .eq('tenant_id', tenant!.id)
      .single(),
    supabase.from('proprietarios').select('id, nome').eq('tenant_id', tenant!.id).order('nome'),
    db.from('reproducao_config').select('dias_lactacao').eq('tenant_id', tenant!.id).maybeSingle(),
  ])

  const reproducaoConfig = { dias_lactacao: (reproducaoConfigRaw as any)?.dias_lactacao ?? 210 }

  return (
    <SettingsView
      tenant={tenant!}
      accounts={accounts ?? []}
      members={members ?? []}
      filiais={filiais ?? []}
      coa={coa ?? []}
      costCenters={costCenters ?? []}
      proprietarios={(proprietarios ?? []) as { id: string; nome: string }[]}
      reproducaoConfig={reproducaoConfig}
      paymentMethods={(paymentMethods ?? []) as {
        id: string
        name: string
        active: boolean
        financial_account_id: string | null
        financial_accounts: { name: string } | null
      }[]}
      subscription={subscription as {
        id: string
        status: 'trial' | 'active' | 'past_due' | 'blocked' | 'cancelled'
        trial_ends_at: string | null
        current_period_end: string | null
        extra_users: number
        notes: string | null
        plan_id: string | null
        plans: { id: string; name: string; slug: string; max_users: number } | null
      } | null}
    />
  )
}
