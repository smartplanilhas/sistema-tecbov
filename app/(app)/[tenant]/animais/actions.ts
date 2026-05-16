'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function getTenantId(tenantSlug: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  return data?.id ?? null
}


export async function createAnimal(tenantSlug: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Fazenda não encontrada.' }

  const payload = buildPayload(formData, tenantId)
  if (typeof payload === 'string') return { error: payload }

  const { data: newAnimal, error } = await admin.from('animals').insert(payload).select('id').single()
  if (error) {
    if (error.code === '23505') return { error: 'Já existe um animal com este brinco nesta fazenda.' }
    return { error: error.message }
  }

  if (newAnimal) {
    // Primeiro peso informado no cadastro
    const pesoInicial = parseFloat(formData.get('peso_inicial') as string)
    const dataPeso    = formData.get('data_peso_inicial') as string
    if (pesoInicial > 0 && dataPeso) {
      await admin.from('pesagens').insert({
        animal_id: newAnimal.id,
        tenant_id: tenantId,
        peso:      pesoInicial,
        data:      dataPeso,
        tipo:      'entrada',
      })
    }

    // Registra movimentação de entrada se animal já entra com lote ou local
    if (payload.lote_atual_id || payload.local_atual_id) {
      const dataEntrada = (formData.get('data_entrada') as string) || new Date().toISOString().split('T')[0]
      await admin.from('movimentacoes').insert({
        tenant_id:        tenantId,
        animal_id:        newAnimal.id,
        tipo:             'entrada',
        lote_anterior_id: null,
        local_anterior_id: null,
        lote_novo_id:     payload.lote_atual_id ?? null,
        local_novo_id:    payload.local_atual_id ?? null,
        data:             dataEntrada,
      })
    }
  }

  revalidatePath(`/${tenantSlug}/animais`)
  return {}
}

export async function updateAnimal(tenantSlug: string, animalId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Fazenda não encontrada.' }

  // Captura estado atual antes de atualizar
  const { data: estadoAtual } = await admin
    .from('animals')
    .select('lote_atual_id, local_atual_id')
    .eq('id', animalId)
    .eq('tenant_id', tenantId)
    .single()

  const payload = buildPayload(formData, tenantId)
  if (typeof payload === 'string') return { error: payload }

  const { error } = await admin.from('animals').update(payload).eq('id', animalId).eq('tenant_id', tenantId)
  if (error) {
    if (error.code === '23505') return { error: 'Já existe um animal com este brinco nesta fazenda.' }
    return { error: error.message }
  }

  // Registra movimentação se lote ou local mudou
  if (estadoAtual) {
    const loteChanged  = estadoAtual.lote_atual_id  !== (payload.lote_atual_id  ?? null)
    const localChanged = estadoAtual.local_atual_id !== (payload.local_atual_id ?? null)

    if (loteChanged || localChanged) {
      const tipo =
        loteChanged && localChanged ? 'mudanca_lote_local'
        : loteChanged               ? 'mudanca_lote'
        :                             'mudanca_local'

      await admin.from('movimentacoes').insert({
        tenant_id:         tenantId,
        animal_id:         animalId,
        tipo,
        lote_anterior_id:  estadoAtual.lote_atual_id  ?? null,
        local_anterior_id: estadoAtual.local_atual_id ?? null,
        lote_novo_id:      payload.lote_atual_id  ?? null,
        local_novo_id:     payload.local_atual_id ?? null,
        data:              new Date().toISOString().split('T')[0],
      })
    }
  }

  revalidatePath(`/${tenantSlug}/animais`)
  return {}
}

export async function updateBrinco(tenantSlug: string, animalId: string, brinco: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const { error } = await admin
    .from('animals')
    .update({ brinco: brinco.trim() || null })
    .eq('id', animalId)
    .eq('tenant_id', tenantId)

  if (error) {
    if (error.code === '23505') return { error: 'Brinco já cadastrado.' }
    return { error: error.message }
  }

  revalidatePath(`/${tenantSlug}/animais`)
  return {}
}

export async function deleteAnimal(tenantSlug: string, animalId: string) {
  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const { error } = await admin.from('animals').delete().eq('id', animalId).eq('tenant_id', tenantId)
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/animais`)
  return {}
}

export async function createPesagem(tenantSlug: string, animalId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const { data: animal } = await admin.from('animals').select('id').eq('id', animalId).eq('tenant_id', tenantId).single()
  if (!animal) return { error: 'Animal não encontrado.' }

  const pesoRaw = formData.get('peso') as string
  const data    = formData.get('data') as string
  const tipo = ((formData.get('tipo') as string) || 'controle') as 'entrada' | 'controle' | 'saida'

  const peso = parseFloat(pesoRaw)
  if (!peso || isNaN(peso) || peso <= 0) return { error: 'Peso inválido.' }
  if (!data) return { error: 'Data é obrigatória.' }

  const { error } = await admin.from('pesagens').insert({
    animal_id: animalId,
    tenant_id: tenantId,
    peso,
    data,
    tipo,
  })
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/animais/${animalId}`)
  revalidatePath(`/${tenantSlug}/animais`)
  revalidatePath(`/${tenantSlug}/manejo/pesagem`)
  return {}
}

export async function deletePesagem(tenantSlug: string, pesagemId: string) {
  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const { data: p } = await admin.from('pesagens').select('id, animal_id').eq('id', pesagemId).single()
  if (!p) return { error: 'Pesagem não encontrada.' }

  const { data: animal } = await admin.from('animals').select('id').eq('id', p.animal_id).eq('tenant_id', tenantId).single()
  if (!animal) return { error: 'Não autorizado.' }

  const { error } = await admin.from('pesagens').delete().eq('id', pesagemId)
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/animais/${p.animal_id}`)
  revalidatePath(`/${tenantSlug}/animais`)
  revalidatePath(`/${tenantSlug}/manejo/pesagem`)
  return {}
}

export async function updatePesagem(
  tenantSlug: string,
  pesagemId: string,
  payload: { peso: number; data: string; tipo: string }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const { data: p } = await admin
    .from('pesagens')
    .select('id, animal_id')
    .eq('id', pesagemId)
    .single()
  if (!p) return { error: 'Pesagem não encontrada.' }

  const { data: animal } = await admin
    .from('animals')
    .select('id')
    .eq('id', p.animal_id)
    .eq('tenant_id', tenantId)
    .single()
  if (!animal) return { error: 'Não autorizado.' }

  if (!payload.peso || payload.peso <= 0) return { error: 'Peso inválido.' }
  if (!payload.data) return { error: 'Data é obrigatória.' }

  const { error } = await admin
    .from('pesagens')
    .update({ peso: payload.peso, data: payload.data, tipo: payload.tipo as 'entrada' | 'controle' | 'saida' })
    .eq('id', pesagemId)
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/animais/${p.animal_id}`)
  revalidatePath(`/${tenantSlug}/animais`)
  revalidatePath(`/${tenantSlug}/manejo/pesagem`)
  return {}
}

export async function createPesagensEmGrupo(
  tenantSlug: string,
  items: Array<{ animal_id: string; peso: number }>,
  data: string,
  tipo: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }
  if (!items.length) return { error: 'Nenhum animal selecionado.' }
  if (!data) return { error: 'Data é obrigatória.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const { data: validAnimals } = await admin
    .from('animals').select('id')
    .in('id', items.map(i => i.animal_id))
    .eq('tenant_id', tenantId)

  const validIds = new Set((validAnimals ?? []).map(a => a.id))
  const rows = items
    .filter(i => validIds.has(i.animal_id) && i.peso > 0)
    .map(i => ({
      animal_id: i.animal_id,
      tenant_id: tenantId,
      peso: i.peso,
      data,
      tipo: tipo as 'entrada' | 'controle' | 'saida',
    }))

  if (!rows.length) return { error: 'Nenhum animal válido.' }

  const { error } = await admin.from('pesagens').insert(rows)
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/animais`)
  revalidatePath(`/${tenantSlug}/manejo/pesagem`)
  return { count: rows.length }
}

export async function createAnimaisEmLote(tenantSlug: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Fazenda não encontrada.' }

  const quantidade = Math.min(100, Math.max(1, parseInt(formData.get('quantidade') as string) || 0))
  if (!quantidade || isNaN(quantidade)) return { error: 'Quantidade inválida.' }

  const fazenda_id    = (formData.get('fazenda_id') as string)?.trim()
  const sexo          = (formData.get('sexo') as string)?.trim()
  const categoria_id  = (formData.get('categoria_id') as string)?.trim() || null
  const lote_atual_id = (formData.get('lote_atual_id') as string)?.trim() || null
  const local_atual_id = (formData.get('local_atual_id') as string)?.trim() || null
  const raca_id       = (formData.get('raca_id') as string)?.trim() || null
  const proprietario_id = (formData.get('proprietario_id') as string)?.trim() || null
  const origem        = (formData.get('origem') as string)?.trim() || null
  const data_entrada  = (formData.get('data_entrada') as string) || null
  const data_nascimento = (formData.get('data_nascimento') as string) || null

  if (!fazenda_id) return { error: 'Fazenda é obrigatória.' }
  if (!sexo || !['M', 'F'].includes(sexo)) return { error: 'Categoria/sexo é obrigatório.' }

  const brincoSeq    = formData.get('brinco_sequencial') === 'on'
  const brincoPrefixo = (formData.get('brinco_prefixo') as string)?.trim() ?? ''
  const brincoInicio  = parseInt(formData.get('brinco_inicio') as string) || 1
  const brincoDigitos = Math.min(6, Math.max(1, parseInt(formData.get('brinco_digitos') as string) || 1))

  const rows = Array.from({ length: quantidade }, (_, i) => ({
    tenant_id: tenantId,
    fazenda_id,
    sexo: sexo as 'M' | 'F',
    categoria_id,
    lote_atual_id,
    local_atual_id,
    raca_id,
    proprietario_id,
    origem: origem as 'compra' | 'nascimento' | 'transferencia' | null,
    status: 'ativo' as const,
    data_entrada,
    data_nascimento,
    brinco: brincoSeq
      ? brincoPrefixo + String(brincoInicio + i).padStart(brincoDigitos, '0')
      : null,
  }))

  const { data: inserted, error } = await admin
    .from('animals')
    .insert(rows)
    .select('id')

  if (error) return { error: error.message }
  if (!inserted?.length) return { error: 'Nenhum animal foi inserido.' }

  const animalIds = inserted.map(a => a.id)

  // Peso médio
  const pesoMedio = parseFloat(formData.get('peso_medio') as string)
  const dataPeso  = formData.get('data_peso') as string
  if (pesoMedio > 0 && dataPeso) {
    await admin.from('pesagens').insert(
      animalIds.map(animal_id => ({
        animal_id,
        tenant_id: tenantId,
        peso: pesoMedio,
        data: dataPeso,
        tipo: 'entrada' as const,
      }))
    )
  }

  // Movimentações de entrada
  if (lote_atual_id || local_atual_id) {
    const grupoId    = crypto.randomUUID()
    const dataEntrada = data_entrada || new Date().toISOString().split('T')[0]
    await admin.from('movimentacoes').insert(
      animalIds.map(animal_id => ({
        tenant_id: tenantId,
        animal_id,
        tipo: 'entrada' as const,
        lote_anterior_id: null,
        local_anterior_id: null,
        lote_novo_id: lote_atual_id,
        local_novo_id: local_atual_id,
        data: dataEntrada,
        grupo_id: grupoId,
      }))
    )
  }

  revalidatePath(`/${tenantSlug}/animais`)
  return { count: animalIds.length }
}

export async function createAnotacao(
  tenantSlug: string,
  animalId: string,
  formData: FormData
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const { data: animal } = await admin
    .from('animals').select('id').eq('id', animalId).eq('tenant_id', tenantId).single()
  if (!animal) return { error: 'Animal não encontrado.' }

  const texto = (formData.get('texto') as string)?.trim()
  const data  = formData.get('data') as string
  const tipo  = (formData.get('tipo') as string) || 'geral'

  if (!texto) return { error: 'Texto é obrigatório.' }
  if (!data)  return { error: 'Data é obrigatória.' }

  const db = admin as any
  const { error } = await db.from('anotacoes_animal').insert({
    tenant_id: tenantId,
    animal_id: animalId,
    data,
    tipo,
    texto,
  })
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/animais/${animalId}`)
  return {}
}

export async function deleteAnotacao(tenantSlug: string, anotacaoId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const db = admin as any
  const { data: a } = await db
    .from('anotacoes_animal').select('id, animal_id').eq('id', anotacaoId).single()
  if (!a) return { error: 'Anotação não encontrada.' }

  const { data: animal } = await admin
    .from('animals').select('id').eq('id', a.animal_id).eq('tenant_id', tenantId).single()
  if (!animal) return { error: 'Não autorizado.' }

  const { error } = await db.from('anotacoes_animal').delete().eq('id', anotacaoId)
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/animais/${a.animal_id}`)
  return {}
}

function buildPayload(formData: FormData, tenantId: string) {
  const fazenda_id   = formData.get('fazenda_id') as string
  const sexo         = formData.get('sexo') as string
  const categoria_id = (formData.get('categoria_id') as string) || null

  if (!fazenda_id) return 'Fazenda é obrigatória.'
  if (!sexo || !['M', 'F'].includes(sexo)) return 'Sexo é obrigatório.'

  const str  = (k: string) => (formData.get(k) as string)?.trim() || null
  const date = (k: string) => (formData.get(k) as string) || null
  const uuid = (k: string) => (formData.get(k) as string)?.trim() || null

  return {
    tenant_id:    tenantId,
    fazenda_id,
    categoria_id,
    sexo: sexo as 'M' | 'F',
    brinco:        str('brinco'),
    identificador: str('identificador'),
    sisbov:        str('sisbov'),
    registro:      str('registro'),
    rfid:          str('rfid'),
    nome:          str('nome'),
    raca_id:       uuid('raca_id'),
    origem:        str('origem') as 'compra' | 'nascimento' | 'transferencia' | null,
    status:        (str('status') ?? 'ativo') as 'ativo' | 'vendido' | 'morto' | 'transferido',
    data_nascimento: date('data_nascimento'),
    data_compra:     date('data_compra'),
    data_entrada:    date('data_entrada'),
    data_saida:      date('data_saida'),
    data_desmama:    date('data_desmama'),
    lote_atual_id:  uuid('lote_atual_id'),
    local_atual_id: uuid('local_atual_id'),
    pai_id:          uuid('pai_id'),
    mae_id:          uuid('mae_id'),
    proprietario_id: uuid('proprietario_id'),
    pelagem:         str('pelagem'),
    observacoes:    str('observacoes'),
  }
}
