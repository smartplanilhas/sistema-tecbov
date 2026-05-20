import { createAdminClient } from '@/lib/supabase/server'
import { SaidaReportView } from './saida-report-view'

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

export default async function SaidaReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>
  searchParams: Promise<Record<string, string>>
}) {
  const { tenant: tenantSlug } = await params
  const p = await searchParams

  const hoje = new Date()
  const umAnoAtras = new Date(hoje)
  umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1)

  const de = p.de ?? toDateStr(umAnoAtras)
  const ate = p.ate ?? toDateStr(hoje)
  const statusFiltro = p.status ?? ''

  const admin = createAdminClient() as any

  const { data: tenant } = await admin
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) return null

  let query = admin
    .from('animals')
    .select('id, brinco, nome, sexo, status, data_saida, peso_inicial, data_peso_inicial, peso_atual, data_peso_atual, gmd_geral, gmd_geral_duracao, gmd_geral_ganho_peso, categorias_animal(nome), lotes(nome)')
    .eq('tenant_id', tenant.id)
    .in('status', ['vendido', 'abatido', 'morto', 'doado', 'extraviado'])
    .order('data_saida', { ascending: false })

  if (de)  query = query.gte('data_saida', de)
  if (ate) query = query.lte('data_saida', ate)
  if (statusFiltro) query = query.eq('status', statusFiltro)

  const { data: animais } = await query

  return (
    <SaidaReportView
      tenantSlug={tenantSlug}
      animais={(animais ?? []) as any[]}
      filtros={{ de, ate, status: statusFiltro }}
    />
  )
}
