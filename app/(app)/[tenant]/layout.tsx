import { redirect, notFound } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { SidebarProvider } from '@/components/layout/sidebar-context'
import { SubscriptionBlocked } from '@/components/layout/subscription-blocked'

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenant: string }>
}) {
  const { tenant: tenantSlug } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: tenant } = await admin
    .from('tenants')
    .select('id, name, slug, parent_id')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) notFound()

  const [{ data: membership }, parentResult] = await Promise.all([
    admin
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant.id)
      .single(),
    tenant.parent_id
      ? admin.from('tenants').select('name, slug').eq('id', tenant.parent_id).single()
      : Promise.resolve({ data: null }),
  ])

  if (!membership) redirect('/onboarding')

  const parentTenant = parentResult.data ?? null

  const { data: subscription } = await admin
    .from('tenant_subscriptions')
    .select('status, trial_ends_at, current_period_end')
    .eq('tenant_id', tenant.id)
    .single()

  const now = new Date()
  const isBlocked = !subscription
    || (subscription.status === 'trial'
        ? !subscription.trial_ends_at || new Date(subscription.trial_ends_at) < now
        : subscription.status !== 'active'
          || (!!subscription.current_period_end && new Date(subscription.current_period_end) < now))

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar tenantSlug={tenant.slug} tenantName={tenant.name} parentTenant={parentTenant} />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header userEmail={user.email ?? ''} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background" style={{ backgroundColor: '#F4F7FA' }}>
            {isBlocked ? (
              <SubscriptionBlocked
                status={subscription?.status ?? 'blocked'}
                tenantName={tenant.name}
                trialEndsAt={subscription?.trial_ends_at}
              />
            ) : children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
