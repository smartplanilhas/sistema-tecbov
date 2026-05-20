'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function criarCustoLancamento(
  tenantSlug: string,
  payload: {
    vinculoTipo:  'lote' | 'animal'
    loteId:       string | null
    animalId:     string | null
    coaAccountId: string | null
    valor:        number
    data:         string
    descricao:    string
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient() as any
  const { data: tenant } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) return { error: 'Fazenda não encontrada.' }

  const { vinculoTipo, loteId, animalId, coaAccountId, valor, data, descricao } = payload

  if (vinculoTipo === 'lote' && loteId) {
    const { data: animaisLote } = await admin
      .from('animals')
      .select('id, custo_total')
      .eq('lote_atual_id', loteId)
      .eq('tenant_id', tenant.id)
      .eq('status', 'ativo')

    const animais = (animaisLote ?? []) as { id: string; custo_total: number }[]
    const qtdAnimais = animais.length

    const { data: custo, error: custoErr } = await admin
      .from('custos_producao')
      .insert({
        tenant_id:          tenant.id,
        data,
        descricao,
        valor_total:        valor,
        tipo:               'coletivo',
        coa_account_id:     coaAccountId,
        origem:             'lancamento_direto',
        lote_id:            loteId,
        metodo_rateio:      'por_cabeca',
        qtd_animais_rateio: qtdAnimais,
      })
      .select('id')
      .single()

    if (custoErr || !custo) return { error: custoErr?.message ?? 'Erro ao criar custo.' }

    if (qtdAnimais > 0) {
      const valorPorAnimal = Math.round((valor / qtdAnimais) * 100) / 100

      await admin.from('rateio_custos').insert(
        animais.map((a: any) => ({
          custo_id:      custo.id,
          animal_id:     a.id,
          valor_rateado: valorPorAnimal,
        }))
      )

      await Promise.all(
        animais.map(a =>
          admin
            .from('animals')
            .update({ custo_total: (a.custo_total ?? 0) + valorPorAnimal })
            .eq('id', a.id)
        )
      )

      const { data: loteData } = await admin.from('lotes').select('custo_total').eq('id', loteId).single()
      await admin
        .from('lotes')
        .update({ custo_total: ((loteData?.custo_total ?? 0) as number) + valor })
        .eq('id', loteId)
    }

  } else if (vinculoTipo === 'animal' && animalId) {
    const { error: custoErr } = await admin.from('custos_producao').insert({
      tenant_id:      tenant.id,
      data,
      descricao,
      valor_total:    valor,
      tipo:           'individual',
      coa_account_id: coaAccountId,
      origem:         'lancamento_direto',
      animal_id:      animalId,
    })

    if (custoErr) return { error: custoErr.message }

    const { data: animalData } = await admin.from('animals').select('custo_total').eq('id', animalId).single()
    await admin
      .from('animals')
      .update({ custo_total: ((animalData?.custo_total ?? 0) as number) + valor })
      .eq('id', animalId)
  }

  return {}
}
