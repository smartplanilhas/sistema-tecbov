import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { AnaliseView } from './analise-view'

export default async function AnalisePage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>
}) {
  const { tenant: tenantSlug, id } = await params
  const admin = createAdminClient() as any

  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return null

  const [loteRes, animaisRes, custosRes, vendasRes, saidaMovsRes] = await Promise.all([
    admin
      .from('lotes')
      .select('id, nome, fase, meta_peso, data_inicio, data_prevista_saida, status')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .single(),

    admin
      .from('animals')
      .select('id, peso_atual, peso_inicial, gmd_geral, valor_compra')
      .eq('lote_atual_id', id)
      .eq('tenant_id', tenant.id),

    admin
      .from('custos_producao')
      .select('valor_total, coa_account_id')
      .eq('lote_id', id)
      .eq('tenant_id', tenant.id),

    admin
      .from('animal_sale_items')
      .select('valor_unitario, peso_venda')
      .eq('lote_saida_id', id)
      .eq('tenant_id', tenant.id),

    admin
      .from('movimentacoes')
      .select('animal_id')
      .eq('lote_anterior_id', id)
      .eq('tipo', 'saida')
      .eq('tenant_id', tenant.id),
  ])

  if (!loteRes.data) notFound()

  // Inclui animais que saíram deste lote (mesma lógica da visão de detalhe)
  const currentIds = new Set((animaisRes.data ?? []).map((a: any) => a.id))
  const exitIds = [...new Set(
    (saidaMovsRes.data ?? []).map((m: any) => m.animal_id).filter(Boolean)
  )].filter((aid): aid is string => typeof aid === 'string' && !currentIds.has(aid))

  let exitedAnimais: any[] = []
  if (exitIds.length > 0) {
    const { data } = await admin
      .from('animals')
      .select('id, peso_atual, peso_inicial, gmd_geral, valor_compra')
      .in('id', exitIds)
      .eq('tenant_id', tenant.id)
    exitedAnimais = data ?? []
  }

  const todosAnimais = [...(animaisRes.data ?? []), ...exitedAnimais]
  const animalIds: string[] = todosAnimais.map((a: any) => a.id)
  const coaIds: string[] = [...new Set<string>(
    (custosRes.data ?? []).map((c: any) => c.coa_account_id).filter(Boolean)
  )]

  const [pesagensRes, coaRes] = await Promise.all([
    animalIds.length > 0
      ? admin
          .from('pesagens')
          .select('peso, data')
          .in('animal_id', animalIds)
          .eq('tenant_id', tenant.id)
          .order('data', { ascending: true })
      : Promise.resolve({ data: [] }),
    coaIds.length > 0
      ? admin.from('chart_of_accounts').select('id, name').in('id', coaIds)
      : Promise.resolve({ data: [] }),
  ])

  const coaMap = new Map<string, string>(
    ((coaRes.data ?? []) as any[]).map((c: any) => [c.id as string, c.name as string])
  )

  const custos = ((custosRes.data ?? []) as any[]).map((c: any) => ({
    valor_total:    c.valor_total as number,
    nome_categoria: (c.coa_account_id ? coaMap.get(c.coa_account_id) : null) ?? 'Sem categoria',
  }))

  return (
    <AnaliseView
      tenantSlug={tenantSlug}
      lote={loteRes.data}
      animais={todosAnimais as any[]}
      custos={custos}
      vendas={(vendasRes.data ?? []) as any[]}
      pesagens={(pesagensRes.data ?? []) as any[]}
    />
  )
}
