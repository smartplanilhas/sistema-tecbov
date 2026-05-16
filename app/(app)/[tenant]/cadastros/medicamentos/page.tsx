import { createAdminClient } from '@/lib/supabase/server'
import { MedicamentosView } from './medicamentos-view'

export default async function MedicamentosPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params
  const db = createAdminClient() as any

  const { data: tenant } = await db.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const { data: medicamentos } = await db
    .from('medicamentos')
    .select('id, nome, unidade, dias_carencia, instrucoes_uso, status')
    .eq('tenant_id', tenant.id)
    .order('nome')

  return <MedicamentosView tenantSlug={tenantSlug} medicamentos={medicamentos ?? []} />
}
