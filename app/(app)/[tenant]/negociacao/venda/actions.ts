'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function getTenantId(slug: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('tenants').select('id').eq('slug', slug).single()
  return data?.id ?? null
}

export async function registrarVendaAnimais(
  tenantSlug: string,
  payload: {
    animalIds: string[]
    data: string
    referencia?: string | null
    compradorId?: string | null
    pesosPorAnimal?: Record<string, number>
    tipoPreco?: 'por_animal' | 'por_kg'
    valorTotal?: number | null
    valorFrete?: number | null
    valorComissao?: number | null
    accountId?: string | null
    parcelas?: number
    dataPrimeiraParcela?: string
    statusPagamento?: 'COMPLETED' | 'PENDING'
    observacoes?: string | null
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient() as any
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Fazenda não encontrada.' }

  const {
    animalIds, data, referencia, compradorId, pesosPorAnimal,
    tipoPreco = 'por_animal',
    valorTotal, valorFrete, valorComissao,
    accountId, parcelas = 1, dataPrimeiraParcela, statusPagamento = 'PENDING', observacoes,
  } = payload

  let animais: any[] = []
  const grupoId = crypto.randomUUID()

  if (animalIds.length > 0) {
    const { data: found } = await admin
      .from('animals')
      .select('id, brinco, nome, lote_atual_id, local_atual_id, custo_total')
      .in('id', animalIds)
      .eq('tenant_id', tenantId)
      .eq('status', 'ativo')

    if (!found?.length) return { error: 'Animais não encontrados.' }
    animais = found

    // ── Atualiza status dos animais ────────────────────────────────────────
    const { error: updErr } = await admin
      .from('animals')
      .update({ status: 'vendido', data_saida: data, lote_atual_id: null, local_atual_id: null })
      .in('id', animalIds)
      .eq('tenant_id', tenantId)

    if (updErr) return { error: updErr.message }

    // ── Movimentações de saída ─────────────────────────────────────────────
    await admin.from('movimentacoes').insert(
      animais.map((a: any) => ({
        tenant_id:         tenantId,
        animal_id:         a.id,
        tipo:              'saida',
        lote_anterior_id:  a.lote_atual_id,
        local_anterior_id: a.local_atual_id,
        lote_novo_id:      null,
        local_novo_id:     null,
        data,
        grupo_id:          grupoId,
        observacoes:       observacoes ?? null,
      }))
    )

    // ── Pesagens de saída (apenas se peso diferente da última pesagem) ────
    if (pesosPorAnimal) {
      const candidatos = Object.entries(pesosPorAnimal).filter(([, peso]) => peso > 0)

      if (candidatos.length > 0) {
        const candidatoIds = candidatos.map(([id]) => id)

        const { data: ultimasPesagens } = await admin
          .from('pesagens')
          .select('animal_id, peso')
          .in('animal_id', candidatoIds)
          .eq('tenant_id', tenantId)
          .order('data', { ascending: false })

        const ultimaPorAnimal: Record<string, number> = {}
        for (const p of (ultimasPesagens ?? [])) {
          if (!(p.animal_id in ultimaPorAnimal)) {
            ultimaPorAnimal[p.animal_id] = p.peso
          }
        }

        const rows = candidatos
          .filter(([animalId, peso]) => ultimaPorAnimal[animalId] !== peso)
          .map(([animalId, peso]) => ({
            tenant_id: tenantId,
            animal_id: animalId,
            peso,
            data,
            tipo: 'venda',
          }))

        if (rows.length > 0) await admin.from('pesagens').insert(rows)
      }
    }
  }

  // ── Lançamentos / Registro da venda ─────────────────────────────────────
  const refStr  = referencia ? ` — ${referencia}` : ''
  const animaisDesc = animais.length > 0
    ? (() => {
        const brincos = animais.map((a: any) => a.brinco).filter(Boolean).slice(0, 8).join(', ')
        const extra   = animais.length > 8 ? ` +${animais.length - 8}` : ''
        return ` — ${animais.length} animal(is) (${brincos}${extra})`
      })()
    : ''
  const precoTag = tipoPreco === 'por_kg' ? ' [por_kg]' : ' [por_cabeca]'
  const descBase = `Venda${refStr}${animaisDesc}${precoTag}`

  let rootTxId: string | null = null

  if (valorTotal && valorTotal > 0 && accountId) {
    const valorParcela = valorTotal / parcelas
    const transactions = Array.from({ length: parcelas }, (_, i) => {
      const d = new Date((dataPrimeiraParcela ?? data) + 'T12:00:00')
      d.setMonth(d.getMonth() + i)
      const dateStr = d.toISOString().slice(0, 10)
      const desc = parcelas > 1 ? `${descBase} — Parcela ${i + 1}/${parcelas}` : descBase
      return {
        tenant_id:   tenantId,
        type:        'INCOME',
        account_id:  accountId,
        person_id:   compradorId || null,
        amount:      valorParcela,
        date:        dateStr,
        due_date:    dateStr,
        description: desc,
        status:      parcelas > 1 ? 'PENDING' : statusPagamento,
      }
    })
    const { data: insertedTxs, error: txErr } = await admin
      .from('transactions').insert(transactions).select('id')
    if (txErr) return { error: txErr.message }
    rootTxId = insertedTxs?.[0]?.id ?? null
  } else {
    const { data: insertedTx, error: markerErr } = await admin
      .from('transactions')
      .insert({
        tenant_id:   tenantId,
        type:        'INCOME',
        account_id:  null,
        person_id:   compradorId || null,
        amount:      valorTotal ?? 0,
        date:        data,
        due_date:    data,
        description: descBase,
        status:      'COMPLETED',
      })
      .select('id')
      .single()
    if (markerErr) return { error: markerErr.message }
    rootTxId = insertedTx?.id ?? null
  }

  // ── Animal sale items (amarração animal ↔ venda para relatórios) ─────────
  if (animais.length > 0) {
    const totalPeso = pesosPorAnimal
      ? Object.values(pesosPorAnimal).reduce((s, p) => s + p, 0)
      : 0

    const saleItems = animais.map((a: any) => {
      const peso = pesosPorAnimal?.[a.id] ?? null
      let valorUnitario = 0
      if (valorTotal && valorTotal > 0) {
        if (tipoPreco === 'por_kg' && totalPeso > 0 && peso) {
          valorUnitario = (peso / totalPeso) * valorTotal
        } else {
          valorUnitario = valorTotal / animais.length
        }
      }
      return {
        tenant_id:            tenantId,
        animal_id:            a.id,
        transaction_id:       rootTxId,
        grupo_id:             grupoId,
        lote_saida_id:        a.lote_atual_id,
        data,
        peso_venda:           peso,
        tipo_preco:           tipoPreco,
        valor_unitario:       valorUnitario,
        custo_total_snapshot: a.custo_total ?? 0,
      }
    })
    await admin.from('animal_sale_items').insert(saleItems)
  }

  revalidatePath(`/${tenantSlug}/negociacao/venda`)
  revalidatePath(`/${tenantSlug}/animais`)
  return { count: animais.length }
}

export async function atualizarVenda(
  tenantSlug: string,
  payload: {
    txIds: string[]
    compradorId: string | null
    accountId: string
    data: string
    observacoes: string | null
    statusPorId: Record<string, 'COMPLETED' | 'PENDING'>
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Fazenda não encontrada.' }

  const { txIds, compradorId, accountId, data, observacoes, statusPorId } = payload

  // Verifica que todas as transações pertencem ao tenant
  const { data: found } = await admin
    .from('transactions')
    .select('id')
    .in('id', txIds)
    .eq('tenant_id', tenantId)

  if (!found || found.length !== txIds.length) return { error: 'Transações não encontradas.' }

  // Atualiza campos comuns em todas as transações do grupo
  const { error: errComum } = await admin
    .from('transactions')
    .update({ person_id: compradorId, account_id: accountId })
    .in('id', txIds)
    .eq('tenant_id', tenantId)

  if (errComum) return { error: errComum.message }

  // Atualiza data e status individualmente
  for (const id of txIds) {
    const status = statusPorId[id] ?? 'PENDING'
    await admin
      .from('transactions')
      .update({ date: data, due_date: data, status })
      .eq('id', id)
      .eq('tenant_id', tenantId)
  }

  revalidatePath(`/${tenantSlug}/negociacao/venda`)
  return { ok: true }
}

export async function excluirVenda(tenantSlug: string, txIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Fazenda não encontrada.' }

  const { error } = await admin
    .from('transactions')
    .delete()
    .in('id', txIds)
    .eq('tenant_id', tenantId)

  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/negociacao/venda`)
  return { ok: true }
}
