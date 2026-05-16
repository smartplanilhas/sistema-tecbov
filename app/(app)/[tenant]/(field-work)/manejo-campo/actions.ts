'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function getTenantId(slug: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('tenants').select('id').eq('slug', slug).single()
  return data?.id ?? null
}

export async function buscarUltimaPesagem(
  tenantSlug: string,
  animalId: string
): Promise<{ peso: number; data: string } | null> {
  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return null

  const { data } = await admin
    .from('pesagens')
    .select('peso, data')
    .eq('animal_id', animalId)
    .eq('tenant_id', tenantId)
    .order('data', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data ?? null
}

export type MedicamentoRow = {
  tipo:       string
  produto:    string
  quantidade: string
}

export async function registrarManejoAnimal(
  tenantSlug: string,
  animalId:   string,
  payload: {
    data:          string
    peso?:         string
    tipoPesagem?:  string
    medicamentos?: MedicamentoRow[]
    loteDestinoId?:  string
    localDestinoId?: string
    anotacao?:     string
  }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const { data: animal } = await admin
    .from('animals')
    .select('id, lote_atual_id, local_atual_id')
    .eq('id', animalId)
    .eq('tenant_id', tenantId)
    .single()
  if (!animal) return { error: 'Animal não encontrado.' }

  const db    = admin as any
  const erros: string[] = []

  // ── Pesagem ────────────────────────────────────────────────────────────────
  if (payload.peso) {
    const peso = parseFloat(payload.peso)
    if (peso > 0) {
      const { error } = await admin.from('pesagens').insert({
        tenant_id: tenantId,
        animal_id: animalId,
        peso,
        data:      payload.data,
        tipo:      (payload.tipoPesagem ?? 'controle') as 'controle' | 'entrada' | 'saida',
      })
      if (error) erros.push(`Pesagem: ${error.message}`)
      else await admin.from('animals').update({ peso_atual: peso }).eq('id', animalId)
    }
  }

  // ── Sanitário (uma entrada por linha de medicamento) ───────────────────────
  if (payload.medicamentos?.length) {
    for (const med of payload.medicamentos) {
      if (!med.produto.trim()) continue
      const { error } = await db.from('sanidade_eventos').insert({
        tenant_id:   tenantId,
        animal_id:   animalId,
        tipo:        med.tipo,
        data:        payload.data,
        descricao:   med.produto,
        dados:       med.quantidade ? { quantidade: med.quantidade } : {},
        observacoes: payload.anotacao || null,
      })
      if (error) erros.push(`Sanitário (${med.produto}): ${error.message}`)
    }
  }

  // ── Movimentação ──────────────────────────────────────────────────────────
  if (payload.loteDestinoId || payload.localDestinoId) {
    const novoLoteId  = payload.loteDestinoId  || animal.lote_atual_id
    const novoLocalId = payload.localDestinoId || animal.local_atual_id

    const loteChanged  = animal.lote_atual_id  !== novoLoteId
    const localChanged = animal.local_atual_id !== novoLocalId

    if (loteChanged || localChanged) {
      const { error: upErr } = await admin
        .from('animals')
        .update({ lote_atual_id: novoLoteId ?? null, local_atual_id: novoLocalId ?? null })
        .eq('id', animalId)

      if (!upErr) {
        const tipo = loteChanged && localChanged ? 'mudanca_lote_local'
          : loteChanged  ? 'mudanca_lote'
          :                'mudanca_local'

        await admin.from('movimentacoes').insert({
          tenant_id:         tenantId,
          animal_id:         animalId,
          tipo,
          lote_anterior_id:  animal.lote_atual_id  ?? null,
          local_anterior_id: animal.local_atual_id ?? null,
          lote_novo_id:      novoLoteId  ?? null,
          local_novo_id:     novoLocalId ?? null,
          data:              payload.data,
        })
      } else {
        erros.push(`Movimentação: ${upErr.message}`)
      }
    }
  }

  if (erros.length) return { error: erros.join('; ') }

  revalidatePath(`/${tenantSlug}/animais`)
  revalidatePath(`/${tenantSlug}/animais/${animalId}`)
  revalidatePath(`/${tenantSlug}/manejo/pesagem`)
  revalidatePath(`/${tenantSlug}/manejo/sanidade`)

  return {}
}
