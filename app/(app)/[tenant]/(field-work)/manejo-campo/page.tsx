import { createAdminClient } from '@/lib/supabase/server'
import { CampoView } from './campo-view'

export default async function ManejoCampoPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const [animaisRes, lotesRes, locaisRes] = await Promise.all([
    admin
      .from('animals')
      .select('id, brinco, rfid, nome, raca, data_nascimento, lote_atual_id, local_atual_id, peso_atual, sexo, categorias_animal(nome)')
      .eq('tenant_id', tenant.id)
      .eq('status', 'ativo')
      .order('brinco'),
    admin
      .from('lotes')
      .select('id, nome')
      .eq('tenant_id', tenant.id)
      .eq('status', 'ativo')
      .order('nome'),
    admin
      .from('locais')
      .select('id, nome')
      .eq('tenant_id', tenant.id)
      .order('nome'),
  ])

  const animais = (animaisRes.data ?? []).map((a: any) => ({
    id:              a.id,
    brinco:          a.brinco          ?? null,
    rfid:            a.rfid            ?? null,
    nome:            a.nome            ?? null,
    raca:            a.raca            ?? null,
    data_nascimento: a.data_nascimento ?? null,
    lote_atual_id:   a.lote_atual_id   ?? null,
    local_atual_id:  a.local_atual_id  ?? null,
    peso_atual:      a.peso_atual      ?? null,
    sexo:            a.sexo,
    categoria:       a.categorias_animal?.nome ?? null,
  }))

  const lotes  = (lotesRes.data  ?? []) as { id: string; nome: string }[]
  const locais = (locaisRes.data ?? []) as { id: string; nome: string }[]

  return (
    <CampoView
      tenantSlug={tenantSlug}
      animais={animais}
      lotes={lotes}
      locais={locais}
    />
  )
}
