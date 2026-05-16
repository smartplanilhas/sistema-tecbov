import { createAdminClient } from '@/lib/supabase/server'
import { AnimaisView } from './animais-view'

export default async function AnimaisPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const [animalsRes, fazendasRes, categoriasRes, racasRes, lotesRes, locaisRes, proprietariosRes] = await Promise.all([
    admin
      .from('animals')
      .select(`
        id, brinco, nome, raca_id, status, sexo,
        lote_atual_id, local_atual_id, proprietario_id,
        data_nascimento,
        peso_atual, data_peso_atual, gmd_ultimo, gmd_geral, total_pesagens,
        categorias_animal(nome),
        fazendas(nome),
        racas(nome)
      `)
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false }),
    admin.from('fazendas').select('id, nome').eq('tenant_id', tenant.id).eq('ativa', true).order('nome'),
    admin.from('categorias_animal').select('id, nome, sexo, ordem')
      .or(`tenant_id.is.null,tenant_id.eq.${tenant.id}`)
      .order('ordem'),
    admin.from('racas').select('id, nome')
      .or(`tenant_id.is.null,tenant_id.eq.${tenant.id}`)
      .eq('ativa', true)
      .order('nome'),
    admin.from('lotes').select('id, nome').eq('tenant_id', tenant.id).eq('status', 'ativo').order('nome'),
    admin.from('locais').select('id, nome').eq('tenant_id', tenant.id).eq('status', 'ativo').order('nome'),
    admin.from('proprietarios').select('id, nome').eq('tenant_id', tenant.id).order('nome'),
  ])

  const fazendas = fazendasRes.data ?? []

  return (
    <AnimaisView
      tenantSlug={tenantSlug}
      animals={(animalsRes.data ?? []) as any}
      multiFazenda={fazendas.length > 1}
      fazendas={fazendas}
      categorias={(categoriasRes.data ?? []) as any}
      racas={(racasRes.data ?? []) as any}
      lotes={(lotesRes.data ?? []) as any}
      locais={(locaisRes.data ?? []) as any}
      proprietarios={(proprietariosRes.data ?? []) as any}
    />
  )
}
