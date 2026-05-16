import { createAdminClient } from '@/lib/supabase/server'
import { LotesView } from './lotes-view'

export default async function LotesPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const { data: lotesRaw } = await admin
    .from('lotes')
    .select('id, nome, descricao, fase, meta_peso, data_prevista_saida, status')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })

  const lotes = lotesRaw ?? []

  // Contagem de animais e peso médio por lote via query
  const loteIds = lotes.map(l => l.id)
  let statsMap: Record<string, { total: number; peso_medio: number | null }> = {}

  if (loteIds.length > 0) {
    const { data: stats } = await admin
      .from('animals')
      .select('lote_atual_id, peso_atual')
      .in('lote_atual_id', loteIds)
      .eq('tenant_id', tenant.id)
      .eq('status', 'ativo')

    if (stats) {
      for (const loteId of loteIds) {
        const group = stats.filter(a => a.lote_atual_id === loteId)
        const comPeso = group.filter(a => a.peso_atual != null)
        statsMap[loteId] = {
          total: group.length,
          peso_medio: comPeso.length > 0
            ? comPeso.reduce((s, a) => s + (a.peso_atual as number), 0) / comPeso.length
            : null,
        }
      }
    }
  }

  const lotesComStats = lotes.map(l => ({
    ...l,
    total_animais: statsMap[l.id]?.total ?? 0,
    peso_medio:    statsMap[l.id]?.peso_medio ?? null,
  }))

  return <LotesView tenantSlug={tenantSlug} lotes={lotesComStats as any} />
}
