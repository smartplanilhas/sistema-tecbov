import { createAdminClient } from '@/lib/supabase/server'
import { VendaAnimaisView } from '../venda-view'

export default async function NovaVendaPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant: tenantSlug } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const [animaisRes, lotesRes, accountsRes, compradoresRes] = await Promise.all([
    admin
      .from('animals')
      .select(`
        id, brinco, nome, peso_atual, sexo, lote_atual_id,
        categorias_animal(nome)
      `)
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
      .from('financial_accounts')
      .select('id, name')
      .eq('tenant_id', tenant.id)
      .eq('active', true)
      .order('name'),
    admin
      .from('people')
      .select('id, name')
      .eq('tenant_id', tenant.id)
      .eq('is_client', true)
      .eq('active', true)
      .order('name'),
  ])

  const animais = (animaisRes.data ?? []).map((a: any) => ({
    id:            a.id,
    brinco:        a.brinco,
    nome:          a.nome,
    peso_atual:    a.peso_atual,
    sexo:          a.sexo,
    lote_atual_id: a.lote_atual_id,
    categoria:     a.categorias_animal?.nome ?? null,
  }))

  return (
    <VendaAnimaisView
      tenantSlug={tenantSlug}
      animais={animais}
      lotes={(lotesRes.data ?? []) as any}
      accounts={(accountsRes.data ?? []) as any}
      compradores={(compradoresRes.data ?? []) as any}
    />
  )
}
