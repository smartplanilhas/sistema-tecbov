import { createAdminClient } from '@/lib/supabase/server'
import { PersonsView } from './persons-view'

export default async function PessoasPage({
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

  if (!tenant) return null

  const { data: people } = await supabase
    .from('people')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('name')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pessoas</h1>
        <p className="text-muted-foreground text-sm mt-1">Clientes e fornecedores</p>
      </div>
      <PersonsView tenantId={tenant.id} people={people ?? []} />
    </div>
  )
}
