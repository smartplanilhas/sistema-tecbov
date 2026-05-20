'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function getTenantId(slug: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('tenants').select('id').eq('slug', slug).single()
  return data?.id ?? null
}

export async function registrarSaida(
  tenantSlug: string,
  payload: {
    animalId: string
    tipo: 'vendido' | 'abatido' | 'doado' | 'extraviado' | 'morto' | 'transferido'
    data: string
    pesoFinal?: number | null
    valorVenda?: number | null
    compradorId?: string | null
    accountId?: string | null
    observacoes?: string | null
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient() as any
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Fazenda não encontrada.' }

  const { animalId, tipo, data, pesoFinal, valorVenda, compradorId, accountId, observacoes } = payload

  // Captura estado atual antes de alterar
  const { data: animal } = await admin
    .from('animals')
    .select('lote_atual_id, local_atual_id, brinco, nome')
    .eq('id', animalId)
    .eq('tenant_id', tenantId)
    .single()

  if (!animal) return { error: 'Animal não encontrado.' }

  // Atualiza status e zera lote/local
  const { error: updErr } = await admin
    .from('animals')
    .update({ status: tipo, data_saida: data, lote_atual_id: null, local_atual_id: null })
    .eq('id', animalId)
    .eq('tenant_id', tenantId)

  if (updErr) return { error: updErr.message }

  // Movimentação de saída
  await admin.from('movimentacoes').insert({
    tenant_id:        tenantId,
    animal_id:        animalId,
    tipo:             'saida',
    lote_anterior_id: animal.lote_atual_id,
    local_anterior_id: animal.local_atual_id,
    lote_novo_id:     null,
    local_novo_id:    null,
    data,
    observacoes:      observacoes ?? null,
  })

  // Pesagem final (opcional)
  if (pesoFinal && pesoFinal > 0) {
    await admin.from('pesagens').insert({
      tenant_id: tenantId,
      animal_id: animalId,
      peso:      pesoFinal,
      data,
      tipo:      tipo === 'vendido' ? 'venda' : 'saida',
    })
  }

  // Lançamento financeiro (venda + valor + conta)
  if (tipo === 'vendido' && valorVenda && valorVenda > 0 && accountId) {
    const label = [animal.brinco, animal.nome].filter(Boolean).join(' – ') || 'Animal'
    await admin.from('transactions').insert({
      tenant_id:  tenantId,
      type:       'INCOME',
      account_id: accountId,
      person_id:  compradorId || null,
      amount:     valorVenda,
      date:       data,
      description: `Venda — ${label}`,
      status:     'COMPLETED',
    })
  }

  revalidatePath(`/${tenantSlug}/animais`)
  revalidatePath(`/${tenantSlug}/animais/${animalId}`)
  return {}
}

export async function registrarSaidaLote(
  tenantSlug: string,
  payload: {
    loteId: string
    animalIds: string[]
    tipo: 'vendido' | 'abatido' | 'doado' | 'extraviado' | 'morto' | 'transferido'
    data: string
    pesosPorAnimal?: Record<string, number>
    valorTotal?: number | null
    compradorId?: string | null
    accountId?: string | null
    encerrarLote?: boolean
    observacoes?: string | null
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient() as any
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Fazenda não encontrada.' }

  const { loteId, animalIds, tipo, data, pesosPorAnimal, valorTotal, compradorId, accountId, encerrarLote, observacoes } = payload

  if (!animalIds.length) return { error: 'Nenhum animal selecionado.' }

  const { data: animais } = await admin
    .from('animals')
    .select('id, brinco, nome, lote_atual_id, local_atual_id')
    .in('id', animalIds)
    .eq('tenant_id', tenantId)

  if (!animais?.length) return { error: 'Animais não encontrados.' }

  const grupoId = crypto.randomUUID()

  // Atualiza todos os animais
  const { error: updErr } = await admin
    .from('animals')
    .update({ status: tipo, data_saida: data, lote_atual_id: null, local_atual_id: null })
    .in('id', animalIds)
    .eq('tenant_id', tenantId)

  if (updErr) return { error: updErr.message }

  // Movimentações em grupo
  await admin.from('movimentacoes').insert(
    animais.map((a: any) => ({
      tenant_id:        tenantId,
      animal_id:        a.id,
      tipo:             'saida',
      lote_anterior_id: a.lote_atual_id,
      local_anterior_id: a.local_atual_id,
      lote_novo_id:     null,
      local_novo_id:    null,
      data,
      grupo_id:         grupoId,
      observacoes:      observacoes ?? null,
    }))
  )

  // Pesagens individuais (opcional)
  if (pesosPorAnimal) {
    const tipoPesagem = tipo === 'vendido' ? 'venda' : 'saida'
    const rows = Object.entries(pesosPorAnimal)
      .filter(([, peso]) => peso > 0)
      .map(([animalId, peso]) => ({
        tenant_id: tenantId,
        animal_id: animalId,
        peso,
        data,
        tipo: tipoPesagem,
      }))
    if (rows.length > 0) await admin.from('pesagens').insert(rows)
  }

  // Lançamento financeiro único para o lote
  if (tipo === 'vendido' && valorTotal && valorTotal > 0 && accountId) {
    const brincos = animais.map((a: any) => a.brinco).filter(Boolean).slice(0, 10).join(', ')
    const extra = animais.length > 10 ? ` +${animais.length - 10}` : ''
    await admin.from('transactions').insert({
      tenant_id:   tenantId,
      type:        'INCOME',
      account_id:  accountId,
      person_id:   compradorId || null,
      amount:      valorTotal,
      date:        data,
      description: `Venda — ${animais.length} animais (${brincos}${extra})`,
      status:      'COMPLETED',
    })
  }

  if (encerrarLote) {
    await admin.from('lotes').update({ status: 'encerrado' }).eq('id', loteId).eq('tenant_id', tenantId)
  }

  revalidatePath(`/${tenantSlug}/animais`)
  revalidatePath(`/${tenantSlug}/animais/lotes/${loteId}`)
  return {}
}
