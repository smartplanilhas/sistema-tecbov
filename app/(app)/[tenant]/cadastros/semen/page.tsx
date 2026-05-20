import { createAdminClient } from '@/lib/supabase/server'
import { SemenView } from './semen-view'

export default async function SemenPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const { data: semens } = await (admin as any)
    .from('semen')
    .select('id, nome_touro, registro_rgd, raca, apelido_codigo, central_coleta, tipo, qtd_doses, status')
    .eq('tenant_id', tenant.id)
    .order('nome_touro')

  return <SemenView tenantSlug={tenantSlug} semens={semens ?? []} />
}
