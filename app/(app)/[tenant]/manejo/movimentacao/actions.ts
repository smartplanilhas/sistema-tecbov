'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function getTenantId(slug: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('tenants').select('id').eq('slug', slug).single()
  return data?.id ?? null
}

// '' = manter, '_limpar' = null, uuid = novo valor
function parseField(v: string): string | null | undefined {
  if (v === '') return undefined
  if (v === '_limpar') return null
  return v
}

export async function moverAnimais(
  tenantSlug: string,
  payload: {
    animalIds: string[]
    novoLote: string
    novoLocal: string
    novoProprietario: string
    data: string
    observacoes: string
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient() as any
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Fazenda não encontrada.' }

  const { animalIds, data, observacoes } = payload

  if (!animalIds.length) return { error: 'Nenhum animal selecionado.' }

  const novoLoteId        = parseField(payload.novoLote)
  const novoLocalId       = parseField(payload.novoLocal)
  const novoProprietarioId = parseField(payload.novoProprietario)

  const updateObj: Record<string, string | null> = {}
  if (novoLoteId        !== undefined) updateObj.lote_atual_id  = novoLoteId
  if (novoLocalId       !== undefined) updateObj.local_atual_id = novoLocalId
  if (novoProprietarioId !== undefined) updateObj.proprietario_id = novoProprietarioId

  if (!Object.keys(updateObj).length) return { error: 'Selecione ao menos um campo para alterar.' }

  // Captura estado atual de cada animal
  const { data: animaisAtuais } = await admin
    .from('animals')
    .select('id, lote_atual_id, local_atual_id')
    .in('id', animalIds)
    .eq('tenant_id', tenantId)
    .eq('status', 'ativo')

  if (!animaisAtuais?.length) return { error: 'Nenhum animal ativo encontrado.' }

  const { error: updErr } = await admin
    .from('animals')
    .update(updateObj)
    .in('id', animalIds)
    .eq('tenant_id', tenantId)

  if (updErr) return { error: updErr.message }

  // Insere movimentações para mudanças de lote / local
  if (novoLoteId !== undefined || novoLocalId !== undefined) {
    const grupoId = crypto.randomUUID()

    const rows = (animaisAtuais as any[])
      .map((a: any) => {
        const loteEfetivo  = novoLoteId  !== undefined ? novoLoteId  : a.lote_atual_id
        const localEfetivo = novoLocalId !== undefined ? novoLocalId : a.local_atual_id
        const loteChanged  = loteEfetivo  !== a.lote_atual_id
        const localChanged = localEfetivo !== a.local_atual_id
        if (!loteChanged && !localChanged) return null

        const tipo = loteChanged && localChanged ? 'mudanca_lote_local'
          : loteChanged ? 'mudanca_lote' : 'mudanca_local'

        return {
          tenant_id:         tenantId,
          animal_id:         a.id,
          tipo,
          lote_anterior_id:  a.lote_atual_id  ?? null,
          local_anterior_id: a.local_atual_id ?? null,
          lote_novo_id:      loteEfetivo  ?? null,
          local_novo_id:     localEfetivo ?? null,
          data,
          grupo_id:          grupoId,
          observacoes:       observacoes || null,
        }
      })
      .filter(Boolean)

    if (rows.length > 0) await admin.from('movimentacoes').insert(rows)
  }

  revalidatePath(`/${tenantSlug}/manejo/movimentacao`)
  revalidatePath(`/${tenantSlug}/animais`)
  for (const a of (animaisAtuais as any[])) {
    revalidatePath(`/${tenantSlug}/animais/${a.id}`)
  }

  return {}
}
