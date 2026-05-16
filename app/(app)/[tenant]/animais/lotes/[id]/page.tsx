import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { LoteDetailView } from '../lote-detail-view'

export default async function LoteDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>
}) {
  const { tenant: tenantSlug, id } = await params
  const admin = createAdminClient()

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const [loteRes, animaisRes, availableRes] = await Promise.all([
    admin
      .from('lotes')
      .select('id, nome, descricao, fase, meta_peso, data_prevista_saida, observacoes, status')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .single(),

    // Animais neste lote
    admin
      .from('animals')
      .select('id, brinco, nome, status, sexo, peso_atual, categorias_animal(nome), racas(nome)')
      .eq('lote_atual_id', id)
      .eq('tenant_id', tenant.id)
      .order('brinco'),

    // Animais ativos sem lote (disponíveis para adicionar)
    admin
      .from('animals')
      .select('id, brinco, nome, status, sexo, peso_atual, categorias_animal(nome), racas(nome)')
      .eq('tenant_id', tenant.id)
      .eq('status', 'ativo')
      .is('lote_atual_id', null)
      .order('brinco'),
  ])

  if (!loteRes.data) notFound()

  return (
    <LoteDetailView
      tenantSlug={tenantSlug}
      lote={loteRes.data as any}
      animais={(animaisRes.data ?? []) as any}
      available={(availableRes.data ?? []) as any}
    />
  )
}
