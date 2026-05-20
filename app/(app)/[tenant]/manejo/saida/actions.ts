'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function getTenantId(slug: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('tenants').select('id').eq('slug', slug).single()
  return data?.id ?? null
}

export async function registrarSaidaAnimais(
  tenantSlug: string,
  payload: {
    animalIds: string[]
    data: string
    tipo: 'vendido' | 'abatido' | 'doado' | 'extraviado'
    pesosPorAnimal?: Record<string, number>
    observacoes?: string | null
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient() as any
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Fazenda não encontrada.' }

  const { animalIds, data, tipo, pesosPorAnimal, observacoes } = payload

  if (!animalIds.length) return { error: 'Nenhum animal selecionado.' }

  const { data: animais } = await admin
    .from('animals')
    .select('id, brinco, nome, lote_atual_id, local_atual_id')
    .in('id', animalIds)
    .eq('tenant_id', tenantId)
    .eq('status', 'ativo')

  if (!animais?.length) return { error: 'Animais não encontrados ou já inativos.' }

  const grupoId = crypto.randomUUID()

  const motivoLabel: Record<typeof tipo, string> = {
    vendido:    'Venda',
    abatido:    'Abate',
    doado:      'Doação',
    extraviado: 'Extraviado',
  }
  const motivo = motivoLabel[tipo]

  const { error: updErr } = await admin
    .from('animals')
    .update({ status: tipo, data_saida: data, lote_atual_id: null, local_atual_id: null })
    .in('id', animalIds)
    .eq('tenant_id', tenantId)

  if (updErr) return { error: updErr.message }

  await admin.from('movimentacoes').insert(
    animais.map((a: any) => ({
      tenant_id:         tenantId,
      animal_id:         a.id,
      tipo:              'saida',
      lote_anterior_id:  a.lote_atual_id,
      local_anterior_id: a.local_atual_id,
      lote_novo_id:      null,
      local_novo_id:     null,
      data,
      grupo_id:          grupoId,
      motivo,
      observacoes:       observacoes ?? null,
    }))
  )

  // ── Pesagens de saída (apenas se peso diferente da última pesagem) ────────
  if (pesosPorAnimal) {
    const candidatos = Object.entries(pesosPorAnimal).filter(([, peso]) => peso > 0)

    if (candidatos.length > 0) {
      const candidatoIds = candidatos.map(([id]) => id)

      const { data: ultimasPesagens } = await admin
        .from('pesagens')
        .select('animal_id, peso')
        .in('animal_id', candidatoIds)
        .eq('tenant_id', tenantId)
        .order('data', { ascending: false })

      const ultimaPorAnimal: Record<string, number> = {}
      for (const p of (ultimasPesagens ?? [])) {
        if (!(p.animal_id in ultimaPorAnimal)) ultimaPorAnimal[p.animal_id] = p.peso
      }

      const tipoPesagem = tipo === 'vendido' ? 'venda' : 'saida'
      const rows = candidatos
        .filter(([animalId, peso]) => ultimaPorAnimal[animalId] !== peso)
        .map(([animalId, peso]) => ({
          tenant_id: tenantId,
          animal_id: animalId,
          peso,
          data,
          tipo: tipoPesagem,
        }))

      if (rows.length > 0) await admin.from('pesagens').insert(rows)
    }
  }

  revalidatePath(`/${tenantSlug}/manejo/saida`)
  revalidatePath(`/${tenantSlug}/animais`)
  for (const a of animais) {
    revalidatePath(`/${tenantSlug}/animais/${a.id}`)
  }

  return { count: animais.length }
}
