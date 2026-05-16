'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function getTenantId(slug: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('tenants').select('id').eq('slug', slug).single()
  return data?.id ?? null
}

function str(fd: FormData, key: string) {
  const v = fd.get(key)
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function num(fd: FormData, key: string) {
  const v = fd.get(key)
  if (typeof v !== 'string' || !v.trim()) return null
  const n = parseInt(v, 10)
  return isNaN(n) ? null : n
}

function buildPayload(fd: FormData, tenantId: string) {
  return {
    tenant_id:      tenantId,
    nome:           str(fd, 'nome') ?? '',
    unidade:        str(fd, 'unidade'),
    dias_carencia:  num(fd, 'dias_carencia'),
    instrucoes_uso: str(fd, 'instrucoes_uso'),
    status:         str(fd, 'status') ?? 'ativo',
  }
}

export async function createMedicamento(tenantSlug: string, fd: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const payload = buildPayload(fd, tenantId)
  if (!payload.nome) return { error: 'Nome é obrigatório.' }

  const db = createAdminClient() as any
  const { error } = await db.from('medicamentos').insert(payload)
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/cadastros/medicamentos`)
  return {}
}

export async function updateMedicamento(tenantSlug: string, id: string, fd: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const payload = buildPayload(fd, tenantId)
  if (!payload.nome) return { error: 'Nome é obrigatório.' }

  const db = createAdminClient() as any
  const { error } = await db.from('medicamentos').update(payload).eq('id', id).eq('tenant_id', tenantId)
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/cadastros/medicamentos`)
  return {}
}

export async function deleteMedicamento(tenantSlug: string, id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const db = createAdminClient() as any
  const { error } = await db.from('medicamentos').delete().eq('id', id).eq('tenant_id', tenantId)
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/cadastros/medicamentos`)
  return {}
}
