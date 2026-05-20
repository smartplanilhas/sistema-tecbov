import { createAdminClient } from '@/lib/supabase/server'
import { InventarioReportView } from './inventario-report-view'

export default async function InventarioReportPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant: tenantSlug } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const db = admin as any

  const [animaisRes, lotesRes, locaisRes] = await Promise.all([
    db
      .from('animals')
      .select('id, sexo, lote_atual_id, local_atual_id, categorias_animal(nome), racas(nome)')
      .eq('tenant_id', tenant.id)
      .eq('status', 'ativo'),
    db.from('lotes').select('id, nome').eq('tenant_id', tenant.id),
    db.from('locais').select('id, nome').eq('tenant_id', tenant.id),
  ])

  const loteMap  = new Map<string, string>((lotesRes.data  ?? []).map((l: any) => [l.id, l.nome]))
  const localMap = new Map<string, string>((locaisRes.data ?? []).map((l: any) => [l.id, l.nome]))

  const animais = ((animaisRes.data ?? []) as any[]).map((a: any) => ({
    id:        a.id as string,
    sexo:      a.sexo as string,
    raca:      (a.racas as { nome: string } | null)?.nome ?? null,
    categoria: (a.categorias_animal as { nome: string } | null)?.nome ?? null,
    lote:      loteMap.get(a.lote_atual_id)  ?? null,
    local:     localMap.get(a.local_atual_id) ?? null,
  }))

  return <InventarioReportView tenantSlug={tenantSlug} animais={animais} />
}
