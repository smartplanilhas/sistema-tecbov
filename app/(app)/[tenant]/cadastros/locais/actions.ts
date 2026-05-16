'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function getTenantId(tenantSlug: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  return data?.id ?? null
}

export async function createLocal(tenantSlug: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const payload = buildPayload(formData, tenantId)
  if (typeof payload === 'string') return { error: payload }

  const { error } = await admin.from('locais').insert(payload)
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/cadastros/locais`)
  return {}
}

export async function updateLocal(tenantSlug: string, localId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const payload = buildPayload(formData, tenantId)
  if (typeof payload === 'string') return { error: payload }

  const { error } = await admin.from('locais').update(payload).eq('id', localId).eq('tenant_id', tenantId)
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/cadastros/locais`)
  return {}
}

export async function deleteLocal(tenantSlug: string, localId: string) {
  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const { error } = await admin.from('locais').delete().eq('id', localId).eq('tenant_id', tenantId)
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/cadastros/locais`)
  return {}
}

function buildPayload(formData: FormData, tenantId: string) {
  const nome = (formData.get('nome') as string)?.trim()
  if (!nome) return 'Nome é obrigatório.'

  const str  = (k: string) => (formData.get(k) as string)?.trim() || null
  const num  = (k: string) => { const v = parseFloat(formData.get(k) as string); return isNaN(v) ? null : v }
  const uuid = (k: string) => (formData.get(k) as string)?.trim() || null

  return {
    tenant_id:   tenantId,
    fazenda_id:  uuid('fazenda_id'),
    nome,
    tipo:        str('tipo'),
    area_ha:     num('area_ha'),
    sistema:     str('sistema'),
    status:      (str('status') ?? 'ativo') as 'ativo' | 'inativo',
    observacoes: str('observacoes'),
  }
}
