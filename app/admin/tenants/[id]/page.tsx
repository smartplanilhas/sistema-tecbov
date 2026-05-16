import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { TenantDetailView } from './tenant-detail-view'

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()

  const [{ data: tenant }, { data: members }, { data: subscription }, { data: plans }] = await Promise.all([
    admin.from('tenants').select('id, name, slug, short_id, created_at').eq('id', id).single(),
    admin.from('memberships').select('user_id, role').eq('tenant_id', id),
    admin.from('tenant_subscriptions')
      .select('status, plan_id, extra_users, trial_ends_at, current_period_start, current_period_end, notes, plans(id, name, max_users)')
      .eq('tenant_id', id)
      .single(),
    admin.from('plans').select('id, name, max_users, price_monthly').eq('active', true).order('sort_order'),
  ])

  if (!tenant) notFound()

  // Fetch member emails from auth
  const memberUsers = await Promise.all(
    (members ?? []).map(async m => {
      const { data } = await admin.auth.admin.getUserById(m.user_id)
      return { ...m, email: data.user?.email ?? '' }
    })
  )

  return (
    <TenantDetailView
      tenant={tenant}
      members={memberUsers}
      subscription={subscription as Parameters<typeof TenantDetailView>[0]['subscription']}
      plans={plans ?? []}
    />
  )
}
