'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function getTenantId(slug: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('tenants').select('id').eq('slug', slug).single()
  return data?.id ?? null
}

// Mapeia tipo_uso → código COA de Custo de Produção
const TIPO_USO_TO_COA_CODE: Record<string, string> = {
  'Alimentação': '2.3.1',
  'Sanidade':    '2.3.2',
  'Operacional': '2.3.5',
  'Outro':       '2.3.7',
}

async function gerarCustoPorEstoque(
  admin: any,
  tenantId: string,
  movId: string,
  loteId: string,
  produtoId: string,
  quantidade: number,
  valorUnitario: number,
  data: string,
) {
  const valorTotal = quantidade * valorUnitario
  if (valorTotal <= 0) return

  // Categoria via tipo_uso do produto
  const { data: prod } = await admin
    .from('produtos_estoque')
    .select('descricao, tipos_uso_estoque(nome)')
    .eq('id', produtoId)
    .single()

  const tipoUsoNome = (prod as any)?.tipos_uso_estoque?.nome ?? null
  const coaCode = tipoUsoNome ? (TIPO_USO_TO_COA_CODE[tipoUsoNome] ?? '2.3.7') : null

  let coaAccountId: string | null = null
  if (coaCode) {
    const { data: coaAcc } = await admin
      .from('chart_of_accounts')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('code', coaCode)
      .single()
    coaAccountId = coaAcc?.id ?? null
  }

  // Animais ativos no lote no momento
  const { data: animaisLote } = await admin
    .from('animals')
    .select('id, custo_total')
    .eq('lote_atual_id', loteId)
    .eq('tenant_id', tenantId)
    .eq('status', 'ativo')

  const animais = (animaisLote ?? []) as { id: string; custo_total: number }[]
  const qtdAnimais = animais.length

  // Insere custo_producao
  const { data: custo } = await admin
    .from('custos_producao')
    .insert({
      tenant_id:               tenantId,
      data,
      descricao:               `${prod?.descricao ?? 'Produto'} — saída de estoque`,
      valor_total:             valorTotal,
      tipo:                    'coletivo',
      coa_account_id:          coaAccountId,
      origem:                  'estoque',
      lote_id:                 loteId,
      movimentacao_estoque_id: movId,
      metodo_rateio:           'por_cabeca',
      qtd_animais_rateio:      qtdAnimais,
    })
    .select('id')
    .single()

  if (!custo || qtdAnimais === 0) return

  // Rateio por cabeça
  const valorPorAnimal = Math.round((valorTotal / qtdAnimais) * 100) / 100

  // Insere rateio_custos
  await admin.from('rateio_custos').insert(
    animais.map(a => ({
      custo_id:      custo.id,
      animal_id:     a.id,
      valor_rateado: valorPorAnimal,
    }))
  )

  // Atualiza custo_total de cada animal
  for (const a of animais) {
    await admin
      .from('animals')
      .update({ custo_total: (a.custo_total ?? 0) + valorPorAnimal })
      .eq('id', a.id)
  }

  // Atualiza custo_total do lote
  const { data: lote } = await admin
    .from('lotes')
    .select('custo_total')
    .eq('id', loteId)
    .single()

  await admin
    .from('lotes')
    .update({ custo_total: ((lote?.custo_total ?? 0) as number) + valorTotal })
    .eq('id', loteId)
}

async function reverterCustoPorEstoque(admin: any, movId: string) {
  const { data: custo } = await admin
    .from('custos_producao')
    .select('id, lote_id, valor_total')
    .eq('movimentacao_estoque_id', movId)
    .single()

  if (!custo) return

  // Busca rateios antes de deletar
  const { data: rateios } = await admin
    .from('rateio_custos')
    .select('animal_id, valor_rateado')
    .eq('custo_id', custo.id)

  // Reverte custo_total dos animais
  for (const r of (rateios ?? []) as { animal_id: string; valor_rateado: number }[]) {
    const { data: a } = await admin.from('animals').select('custo_total').eq('id', r.animal_id).single()
    await admin
      .from('animals')
      .update({ custo_total: Math.max(0, ((a?.custo_total ?? 0) as number) - r.valor_rateado) })
      .eq('id', r.animal_id)
  }

  // Reverte custo_total do lote
  if (custo.lote_id) {
    const { data: lote } = await admin.from('lotes').select('custo_total').eq('id', custo.lote_id).single()
    await admin
      .from('lotes')
      .update({ custo_total: Math.max(0, ((lote?.custo_total ?? 0) as number) - custo.valor_total) })
      .eq('id', custo.lote_id)
  }

  // Deleta custo (cascata em rateio_custos)
  await admin.from('custos_producao').delete().eq('id', custo.id)
}

// ─── Actions públicas ──────────────────────────────────────────────────────────

export async function createMovimentacao(tenantSlug: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient() as any
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Fazenda não encontrada.' }

  const produtoId     = formData.get('produto_id') as string
  const tipo          = formData.get('tipo') as string
  const quantidadeRaw = formData.get('quantidade') as string
  const valorRaw      = formData.get('valor_unitario') as string
  const data          = (formData.get('data') as string) || new Date().toISOString().split('T')[0]
  const motivo        = (formData.get('motivo') as string)?.trim() || null
  const vinculoTipo   = formData.get('vinculo_tipo') as string | null
  const loteId        = (formData.get('lote_id')   as string) || null
  const animalId      = (formData.get('animal_id') as string) || null

  if (!produtoId) return { error: 'Produto é obrigatório.' }
  if (!['entrada', 'saida'].includes(tipo)) return { error: 'Tipo inválido.' }

  const quantidade = parseFloat(quantidadeRaw)
  if (!quantidade || quantidade <= 0) return { error: 'Quantidade deve ser maior que zero.' }

  const { data: produto } = await admin
    .from('produtos_estoque')
    .select('saldo_atual, controla_estoque')
    .eq('id', produtoId)
    .eq('tenant_id', tenantId)
    .single()

  if (!produto) return { error: 'Produto não encontrado.' }

  const valorUnitario = valorRaw ? parseFloat(valorRaw) : null

  const { data: movInserida, error: insertError } = await admin
    .from('movimentacoes_estoque')
    .insert({
      tenant_id:      tenantId,
      produto_id:     produtoId,
      tipo,
      quantidade,
      valor_unitario: valorUnitario,
      data,
      motivo,
      lote_id:   tipo === 'saida' && vinculoTipo === 'lote'   ? loteId   : null,
      animal_id: tipo === 'saida' && vinculoTipo === 'animal' ? animalId : null,
    })
    .select('id')
    .single()

  if (insertError) return { error: insertError.message }

  // Atualiza saldo do produto
  if (produto.controla_estoque) {
    const delta = tipo === 'entrada' ? quantidade : -quantidade
    await admin
      .from('produtos_estoque')
      .update({ saldo_atual: produto.saldo_atual + delta })
      .eq('id', produtoId)
  }

  // Gera custo de produção se for saída vinculada a lote com valor
  const loteVinculado = tipo === 'saida' && vinculoTipo === 'lote' ? loteId : null
  if (loteVinculado && valorUnitario && valorUnitario > 0 && movInserida?.id) {
    await gerarCustoPorEstoque(
      admin, tenantId, movInserida.id,
      loteVinculado, produtoId,
      quantidade, valorUnitario, data,
    )
  }

  revalidatePath(`/${tenantSlug}/estoque/movimentacoes`)
  revalidatePath(`/${tenantSlug}/estoque/produtos`)
  return {}
}

export async function deleteMovimentacao(tenantSlug: string, id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient() as any
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const { data: mov } = await admin
    .from('movimentacoes_estoque')
    .select('produto_id, tipo, quantidade')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!mov) return { error: 'Movimentação não encontrada.' }

  // Reverte custo de produção antes de deletar a movimentação
  await reverterCustoPorEstoque(admin, id)

  const { error } = await admin
    .from('movimentacoes_estoque')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return { error: error.message }

  // Reverte saldo do produto
  const { data: produto } = await admin
    .from('produtos_estoque')
    .select('saldo_atual, controla_estoque')
    .eq('id', mov.produto_id)
    .single()

  if (produto?.controla_estoque) {
    const delta = mov.tipo === 'entrada' ? -mov.quantidade : mov.quantidade
    await admin
      .from('produtos_estoque')
      .update({ saldo_atual: produto.saldo_atual + delta })
      .eq('id', mov.produto_id)
  }

  revalidatePath(`/${tenantSlug}/estoque/movimentacoes`)
  revalidatePath(`/${tenantSlug}/estoque/produtos`)
  return {}
}
