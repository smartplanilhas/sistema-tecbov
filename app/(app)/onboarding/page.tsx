import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingForm } from './onboarding-form'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: memberships } = await supabase
    .from('memberships')
    .select('tenant_id, tenants(slug)')
    .eq('user_id', user.id)
    .limit(1)

  if (memberships && memberships.length > 0) {
    const tenant = memberships[0].tenants as { slug: string } | null
    if (tenant?.slug) redirect(`/${tenant.slug}/dashboard`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40">
      <div className="w-full max-w-lg px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Tecbov</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure sua fazenda</p>
        </div>
        <div className="rounded-xl border bg-card p-8 shadow">
          <h2 className="text-xl font-semibold mb-1">Bem-vindo!</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Crie sua fazenda ou entre em uma fazenda existente.
          </p>
          <OnboardingForm userId={user.id} userEmail={user.email} />
        </div>
      </div>
    </div>
  )
}
