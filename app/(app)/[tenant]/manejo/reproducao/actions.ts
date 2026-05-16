'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function getTenantId(slug: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('tenants').select('id').eq('slug', slug).single()
  return data?.id ?? null
}

export async function createEvento(
  tenantSlug: string,
  payload: {
    animal_id: string
    tipo: string
    data: string
    dados: Record<string, any>
    observacoes?: string
    criar_bezerro?: boolean
    bezerro_sexo?: string
    bezerro_brinco?: string
    bezerro_categoria_id?: string
    bezerro_lote_id?: string
    bezerro_local_id?: string
    bezerro_raca?: string
    bezerro_peso_nasc?: number
    bezerro_peso_data?: string
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const { data: animal } = await admin
    .from('animals')
    .select('id, fazenda_id, lote_atual_id')
    .eq('id', payload.animal_id)
    .eq('tenant_id', tenantId)
    .single()
  if (!animal) return { error: 'Animal não encontrado.' }

  const dados = { ...payload.dados }
  const db = admin as any

  if (payload.tipo === 'parto' && payload.criar_bezerro && payload.bezerro_sexo) {
    const { data: bezerro } = await db.from('animals').insert({
      tenant_id:       tenantId,
      fazenda_id:      animal.fazenda_id,
      sexo:            payload.bezerro_sexo,
      mae_id:          payload.animal_id,
      data_nascimento: payload.data,
      status:          'ativo',
      origem:          'nascimento',
      brinco:          payload.bezerro_brinco        || null,
      categoria_id:    payload.bezerro_categoria_id  || null,
      lote_atual_id:   payload.bezerro_lote_id       || null,
      local_atual_id:  payload.bezerro_local_id      || null,
      raca:            payload.bezerro_raca           || null,
    }).select('id').single()

    if (bezerro) {
      dados.bezerro_id = bezerro.id
      if (payload.bezerro_peso_nasc) {
        await db.from('pesagens').insert({
          tenant_id:  tenantId,
          animal_id:  bezerro.id,
          fazenda_id: animal.fazenda_id,
          peso:       payload.bezerro_peso_nasc,
          data:       payload.bezerro_peso_data ?? payload.data,
          tipo:       'entrada',
        })
      }
    }
  }

  const { error } = await db.from('reproducao_eventos').insert({
    tenant_id: tenantId,
    animal_id: payload.animal_id,
    tipo: payload.tipo,
    data: payload.data,
    dados,
    observacoes: payload.observacoes || null,
  })
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/manejo/reproducao`)
  revalidatePath(`/${tenantSlug}/animais/${payload.animal_id}`)
  return {}
}

export async function createEventosEmLote(
  tenantSlug: string,
  animalIds: string[],
  payload: { tipo: string; data: string; dados: Record<string, any>; observacoes?: string }
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
      dados: payload.dados,
      observacoes: payload.observacoes || null,
    }))

  if (!rows.length) return { error: 'Nenhum animal válido.' }

  const db = admin as any
  const { error } = await db.from('reproducao_eventos').insert(rows)
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/manejo/reproducao`)
  return { count: rows.length }
}

export async function createEventosDesmameEmLote(
  tenantSlug: string,
  animalIds: string[],
  payload: { data: string; observacoes?: string }
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
  const filtered = animalIds.filter(id => validIds.has(id))
  if (!filtered.length) return { error: 'Nenhum animal válido.' }

  const db = admin as any

  // Insere eventos de desmame
  const rows = filtered.map(animal_id => ({
    tenant_id:   tenantId,
    animal_id,
    tipo:        'desmame',
    data:        payload.data,
    dados:       {},
    observacoes: payload.observacoes || null,
  }))
  const { error } = await db.from('reproducao_eventos').insert(rows)
  if (error) return { error: error.message }

  // Atualiza data_desmama no bezerro de cada vaca
  for (const animalId of filtered) {
    const { data: partos } = await db
      .from('reproducao_eventos')
      .select('dados')
      .eq('animal_id', animalId)
      .eq('tipo', 'parto')
      .order('data', { ascending: false })
      .limit(1)
    const bezerroId = partos?.[0]?.dados?.bezerro_id
    if (bezerroId) {
      await db
        .from('animals')
        .update({ data_desmama: payload.data })
        .eq('id', bezerroId)
        .eq('tenant_id', tenantId)
    }
  }

  revalidatePath(`/${tenantSlug}/manejo/reproducao`)
  revalidatePath(`/${tenantSlug}/manejo/reproducao/desmame`)
  return { count: filtered.length }
}

export async function createEstacao(
  tenantSlug: string,
  payload: { nome: string; descricao?: string; data_inicio: string; data_fim: string }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  if (!payload.nome.trim()) return { error: 'Nome é obrigatório.' }
  if (!payload.data_inicio || !payload.data_fim) return { error: 'Datas são obrigatórias.' }
  if (payload.data_fim < payload.data_inicio) return { error: 'Data de término deve ser após o início.' }

  const db = admin as any
  const { error } = await db.from('reproducao_estacoes').insert({
    tenant_id:   tenantId,
    nome:        payload.nome.trim(),
    descricao:   payload.descricao?.trim() || null,
    data_inicio: payload.data_inicio,
    data_fim:    payload.data_fim,
  })
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/manejo/reproducao`)
  return {}
}

export async function deleteEstacao(tenantSlug: string, estacaoId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const db = admin as any
  const { data: est } = await db
    .from('reproducao_estacoes').select('id').eq('id', estacaoId).eq('tenant_id', tenantId).single()
  if (!est) return { error: 'Estação não encontrada.' }

  const { error } = await db.from('reproducao_estacoes').delete().eq('id', estacaoId)
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/manejo/reproducao`)
  return {}
}

export async function deleteEvento(tenantSlug: string, eventoId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const db = admin as any
  const { data: ev } = await db
    .from('reproducao_eventos').select('id, animal_id').eq('id', eventoId).single()
  if (!ev) return { error: 'Evento não encontrado.' }

  const { data: animal } = await admin
    .from('animals').select('id').eq('id', ev.animal_id).eq('tenant_id', tenantId).single()
  if (!animal) return { error: 'Não autorizado.' }

  const { error } = await db.from('reproducao_eventos').delete().eq('id', eventoId)
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/manejo/reproducao`)
  return {}
}
