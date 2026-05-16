'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function getTenantId(tenantSlug: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  return data?.id ?? null
}

export async function createProprietario(tenantSlug: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const nome = (formData.get('nome') as string)?.trim()
  if (!nome) return { error: 'Nome é obrigatório.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const { error } = await admin.from('proprietarios').insert({ tenant_id: tenantId, nome })
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/configuracoes`)
  return {}
}

export async function updateProprietario(tenantSlug: string, id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const nome = (formData.get('nome') as string)?.trim()
  if (!nome) return { error: 'Nome é obrigatório.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const { error } = await admin.from('proprietarios').update({ nome }).eq('id', id).eq('tenant_id', tenantId)
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/configuracoes`)
  return {}
}

export async function deleteProprietario(tenantSlug: string, id: string) {
  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const { error } = await admin.from('proprietarios').delete().eq('id', id).eq('tenant_id', tenantId)
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/configuracoes`)
  return {}
}
