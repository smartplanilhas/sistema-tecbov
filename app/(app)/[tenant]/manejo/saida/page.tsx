import { createAdminClient } from '@/lib/supabase/server'
import { SaidaAnimaisView } from './saida-view'

export default async function SaidaAnimaisPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const [animaisRes, lotesRes] = await Promise.all([
    admin
      .from('animals')
      .select('id, brinco, nome, peso_atual, sexo, lote_atual_id, categorias_animal(nome)')
      .eq('tenant_id', tenant.id)
      .eq('status', 'ativo')
      .order('brinco'),
    admin
      .from('lotes')
      .select('id, nome')
      .eq('tenant_id', tenant.id)
      .eq('status', 'ativo')
      .order('nome'),
  ])

  const animais = (animaisRes.data ?? []).map((a: any) => ({
    id:           a.id,
    brinco:       a.brinco,
    nome:         a.nome,
    peso_atual:   a.peso_atual,
    sexo:         a.sexo,
    lote_atual_id: a.lote_atual_id,
    categoria:    a.categorias_animal?.nome ?? null,
  }))

  return (
    <SaidaAnimaisView
      tenantSlug={tenantSlug}
      animais={animais}
      lotes={(lotesRes.data ?? []) as { id: string; nome: string }[]}
    />
  )
}
