'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function getTenantId(slug: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('tenants').select('id').eq('slug', slug).single()
  return data?.id ?? null
}

export async function createEventosSanidadeEmLote(
  tenantSlug: string,
  animalIds: string[],
  payload: {
    tipo: string
    data: string
    descricao: string
    observacoes?: string
    dados: {
      medicamentos?: { medicamento_id: string; nome: string; quantidade: string }[]
      responsavel?: string
    }
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }
  if (!animalIds.length) return { error: 'Nenhum animal selecionado.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const { data: validAnimals } = await admin
    .from('animals').select('id')
    .in('id', animalIds)
    .eq('tenant_id', tenantId)

  const validIds = new Set((validAnimals ?? []).map(a => a.id))
  const rows = animalIds
    .filter(id => validIds.has(id))
    .map(animal_id => ({
      tenant_id: tenantId,
      animal_id,
      tipo: payload.tipo,
      data: payload.data,
      descricao: payload.descricao,
      dados: payload.dados,
      observacoes: payload.observacoes || null,
    }))

  if (!rows.length) return { error: 'Nenhum animal válido.' }

  const db = admin as any
  const { error } = await db.from('sanidade_eventos').insert(rows)
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/manejo/sanidade`)
  for (const id of animalIds) {
    revalidatePath(`/${tenantSlug}/animais/${id}`)
  }
  return { count: rows.length }
}

export async function deleteEventoSanidade(tenantSlug: string, eventoId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const db = admin as any
  const { data: ev } = await db
    .from('sanidade_eventos')
    .select('id, animal_id')
    .eq('id', eventoId)
    .single()
  if (!ev) return { error: 'Evento não encontrado.' }

  const { data: animal } = await admin
    .from('animals').select('id').eq('id', ev.animal_id).eq('tenant_id', tenantId).single()
  if (!animal) return { error: 'Não autorizado.' }

  const { error } = await db.from('sanidade_eventos').delete().eq('id', eventoId)
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/manejo/sanidade`)
  revalidatePath(`/${tenantSlug}/animais/${ev.animal_id}`)
  return {}
}
