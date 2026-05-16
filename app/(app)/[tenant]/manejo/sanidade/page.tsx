import { createAdminClient } from '@/lib/supabase/server'
import { SanidadePageView } from './sanidade-page-view'

export default async function SanidadePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params
  const admin = createAdminClient()
  const db = admin as any

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const { data: eventosData } = await db
    .from('sanidade_eventos')
    .select('id, tipo, data, descricao, dados, observacoes, animals(brinco, nome)')
    .eq('tenant_id', tenant.id)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200)

  const eventos = (eventosData ?? []).map((ev: any) => ({
    id: ev.id,
    tipo: ev.tipo,
    data: ev.data,
    descricao: ev.descricao,
    dados: ev.dados ?? {},
    observacoes: ev.observacoes,
    animal: ev.animals ?? null,
  }))

  return <SanidadePageView tenantSlug={tenantSlug} eventos={eventos} />
}
