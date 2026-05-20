import { createAdminClient } from '@/lib/supabase/server'
import { GanhoPesoReportView } from './ganho-peso-report-view'

export default async function GanhoPesoReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>
  searchParams: Promise<Record<string, string>>
}) {
  const { tenant: tenantSlug } = await params
  const p = await searchParams

  const loteId       = p.lote_id ?? ''
  const sexo         = p.sexo ?? ''
  const minPesagens  = Number(p.min_pesagens ?? '2')

  const admin = createAdminClient() as any

  const { data: tenant } = await admin
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) return null

  let query = admin
    .from('animals')
    .select('id, brinco, nome, sexo, peso_inicial, data_peso_inicial, peso_atual, data_peso_atual, gmd_geral, gmd_geral_duracao, gmd_geral_ganho_peso, total_pesagens, categorias_animal(nome), lotes(nome)')
    .eq('tenant_id', tenant.id)
    .eq('status', 'ativo')
    .not('gmd_geral', 'is', null)
    .order('gmd_geral', { ascending: false })

  if (loteId) query = query.eq('lote_atual_id', loteId)
  if (sexo)   query = query.eq('sexo', sexo)

  const [{ data: animais }, { data: lotes }] = await Promise.all([
    query,
    admin.from('lotes').select('id, nome').eq('tenant_id', tenant.id).eq('status', 'ativo').order('nome'),
  ])

  const animaisFiltrados = (animais ?? []).filter(
    (a: any) => (a.total_pesagens ?? 0) >= minPesagens
  )

  return (
    <GanhoPesoReportView
      tenantSlug={tenantSlug}
      animais={animaisFiltrados as any[]}
      lotes={(lotes ?? []) as { id: string; nome: string }[]}
      filtros={{ loteId, sexo, minPesagens }}
    />
  )
}
