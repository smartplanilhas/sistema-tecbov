'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function getTenantId(tenantSlug: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  return data?.id ?? null
}

export async function createLote(tenantSlug: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Tenant não encontrado.' }

  const payload = buildPayload(formData, tenantId)
  if (typeof payload === 'string') return { error: payload }

  const { error } = await admin.from('lotes').insert(payload)
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/animais/lotes`)
  return {}
}

export async function updateLote(tenantSlug: string, loteId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Tenant não encontrado.' }

  const payload = buildPayload(formData, tenantId)
  if (typeof payload === 'string') return { error: payload }

  const { error } = await admin.from('lotes').update(payload).eq('id', loteId).eq('tenant_id', tenantId)
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/animais/lotes`)
  revalidatePath(`/${tenantSlug}/animais/lotes/${loteId}`)
  return {}
}

export async function deleteLote(tenantSlug: string, loteId: string) {
  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  // Remove animais do lote antes de excluir
  await admin.from('animals').update({ lote_atual_id: null }).eq('lote_atual_id', loteId).eq('tenant_id', tenantId)

  const { error } = await admin.from('lotes').delete().eq('id', loteId).eq('tenant_id', tenantId)
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/animais/lotes`)
  return {}
}

export async function addAnimaisToLote(tenantSlug: string, loteId: string, animalIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  // Captura estado atual de cada animal antes de mover
  const { data: estadosAtuais } = await admin
    .from('animals')
    .select('id, lote_atual_id, local_atual_id')
    .in('id', animalIds)
    .eq('tenant_id', tenantId)

  const { error } = await admin
    .from('animals')
    .update({ lote_atual_id: loteId })
    .in('id', animalIds)
    .eq('tenant_id', tenantId)

  if (error) return { error: error.message }

  // Registra movimentações em grupo
  if (estadosAtuais && estadosAtuais.length > 0) {
    const grupoId = crypto.randomUUID()
    const hoje    = new Date().toISOString().split('T')[0]
    await admin.from('movimentacoes').insert(
      estadosAtuais.map((a: any) => ({
        tenant_id:         tenantId,
        animal_id:         a.id,
        tipo:              'mudanca_lote',
        lote_anterior_id:  a.lote_atual_id  ?? null,
        local_anterior_id: a.local_atual_id ?? null,
        lote_novo_id:      loteId,
        local_novo_id:     a.local_atual_id ?? null,
        data:              hoje,
        grupo_id:          grupoId,
      }))
    )
  }

  revalidatePath(`/${tenantSlug}/animais/lotes/${loteId}`)
  revalidatePath(`/${tenantSlug}/animais`)
  return {}
}

export async function removeAnimalFromLote(tenantSlug: string, animalId: string, loteId: string) {
  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  // Captura estado atual antes de remover
  const { data: animal } = await admin
    .from('animals')
    .select('lote_atual_id, local_atual_id')
    .eq('id', animalId)
    .eq('tenant_id', tenantId)
    .single()

  const { error } = await admin
    .from('animals')
    .update({ lote_atual_id: null })
    .eq('id', animalId)
    .eq('tenant_id', tenantId)

  if (error) return { error: error.message }

  if (animal) {
    await admin.from('movimentacoes').insert({
      tenant_id:         tenantId,
      animal_id:         animalId,
      tipo:              'mudanca_lote',
      lote_anterior_id:  animal.lote_atual_id  ?? null,
      local_anterior_id: animal.local_atual_id ?? null,
      lote_novo_id:      null,
      local_novo_id:     animal.local_atual_id ?? null,
      data:              new Date().toISOString().split('T')[0],
    })
  }

  revalidatePath(`/${tenantSlug}/animais/lotes/${loteId}`)
  revalidatePath(`/${tenantSlug}/animais`)
  return {}
}

function buildPayload(formData: FormData, tenantId: string) {
  const nome = (formData.get('nome') as string)?.trim()
  if (!nome) return 'Nome é obrigatório.'

  const str  = (k: string) => (formData.get(k) as string)?.trim() || null
  const date = (k: string) => (formData.get(k) as string) || null
  const num  = (k: string) => { const v = parseFloat(formData.get(k) as string); return isNaN(v) ? null : v }
  const uuid = (k: string) => (formData.get(k) as string)?.trim() || null

  return {
    tenant_id:           tenantId,
    fazenda_id:          uuid('fazenda_id'),
    nome,
    descricao:           str('descricao'),
    fase:                str('fase') as string | null,
    meta_peso:           num('meta_peso'),
    data_prevista_saida: date('data_prevista_saida'),
    observacoes:         str('observacoes'),
    status:              (str('status') ?? 'ativo') as 'ativo' | 'encerrado',
    updated_at:          new Date().toISOString(),
  }
}
