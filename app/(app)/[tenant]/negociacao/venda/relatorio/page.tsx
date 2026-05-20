import { createAdminClient } from '@/lib/supabase/server'
import { RelatorioView } from './relatorio-view'

export default async function RelatorioVendasPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant: tenantSlug } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single()
  if (!tenant) return null

  const { data: items } = await admin
    .from('animal_sale_items')
    .select(`
      id, data, peso_venda, tipo_preco, valor_unitario, custo_total_snapshot,
      animal:animals(id, brinco, nome),
      lote:lotes(id, nome),
      tx:transactions(id, people(name))
    `)
    .eq('tenant_id', tenant.id)
    .order('data', { ascending: false })
    .limit(500)

  // Lista de lotes únicos para filtro
  const lotesSet = new Map<string, string>()
  const compradoresSet = new Map<string, string>()
  for (const item of (items ?? [])) {
    const lote = (item as any).lote
    if (lote?.id) lotesSet.set(lote.id, lote.nome)
    const comprador = (item as any).tx?.people?.name
    if (comprador) compradoresSet.set(comprador, comprador)
  }

  const lotes = Array.from(lotesSet.entries()).map(([id, nome]) => ({ id, nome }))
  const compradores = Array.from(compradoresSet.keys())

  return (
    <RelatorioView
      tenantSlug={tenantSlug}
      items={(items ?? []) as any[]}
      lotesFiltro={lotes}
      compradoresFiltro={compradores}
    />
  )
}
