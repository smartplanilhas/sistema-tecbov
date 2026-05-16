'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function getTenantId(slug: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('tenants').select('id').eq('slug', slug).single()
  return data?.id ?? null
}

export async function createEccRegistros(
  tenantSlug: string,
  payload: {
    data: string
    avaliador: string | null
    observacoes: string | null
    registros: { animal_id: string; escore: number }[]
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }
  if (!payload.registros.length) return { error: 'Nenhum animal adicionado.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const animalIds = payload.registros.map(r => r.animal_id)
  const { data: validAnimals } = await admin
    .from('animals').select('id')
    .in('id', animalIds)
    .eq('tenant_id', tenantId)
  const validIds = new Set((validAnimals ?? []).map((a: any) => a.id))

  const rows = payload.registros
    .filter(r => validIds.has(r.animal_id))
    .map(r => ({
      tenant_id:   tenantId,
      animal_id:   r.animal_id,
      data:        payload.data,
      escore:      r.escore,
      avaliador:   payload.avaliador,
      observacoes: payload.observacoes,
    }))

  if (!rows.length) return { error: 'Nenhum animal válido.' }

  const db = admin as any
  const { error } = await db.from('ecc_registros').insert(rows)
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/manejo/reproducao`)
  revalidatePath(`/${tenantSlug}/manejo/reproducao/ecc`)
  return { count: rows.length }
}

export async function deleteEccRegistro(tenantSlug: string, id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const db = admin as any
  const { data: rec } = await db
    .from('ecc_registros')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()
  if (!rec) return { error: 'Registro não encontrado.' }

  const { error } = await db.from('ecc_registros').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/manejo/reproducao`)
  revalidatePath(`/${tenantSlug}/manejo/reproducao/ecc`)
  return {}
}
