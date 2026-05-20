'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function getTenantId(tenantSlug: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('tenants').select('id').eq('slug', tenantSlug).single()
  return data?.id ?? null
}

export async function createSemen(tenantSlug: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const payload = buildPayload(formData, tenantId)
  if (typeof payload === 'string') return { error: payload }

  const { error } = await (admin as any).from('semen').insert(payload)
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/cadastros/semen`)
  return {}
}

export async function updateSemen(tenantSlug: string, semenId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const payload = buildPayload(formData, tenantId)
  if (typeof payload === 'string') return { error: payload }

  const { error } = await (admin as any).from('semen').update(payload).eq('id', semenId).eq('tenant_id', tenantId)
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/cadastros/semen`)
  return {}
}

export async function deleteSemen(tenantSlug: string, semenId: string) {
  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const { error } = await (admin as any).from('semen').delete().eq('id', semenId).eq('tenant_id', tenantId)
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/cadastros/semen`)
  return {}
}

function buildPayload(formData: FormData, tenantId: string) {
  const nome_touro = (formData.get('nome_touro') as string)?.trim()
  if (!nome_touro) return 'Nome do touro é obrigatório.'

  const str = (k: string) => (formData.get(k) as string)?.trim() || null
  const int = (k: string) => { const v = parseInt(formData.get(k) as string); return isNaN(v) ? null : v }

  return {
    tenant_id:               tenantId,
    nome_touro,
    registro_rgd:            str('registro_rgd'),
    raca:                    str('raca'),
    apelido_codigo:          str('apelido_codigo'),
    central_coleta:          str('central_coleta'),
    grau_sangue:             str('grau_sangue'),
    tipo:                    (str('tipo') ?? 'convencional') as string,
    qtd_doses:               int('qtd_doses'),
    botijao:                 str('botijao'),
    caneca:                  str('caneca'),
    observacoes_zootecnicas: str('observacoes_zootecnicas'),
    pai_nome:                str('pai_nome'),
    pai_rgd:                 str('pai_rgd'),
    observacoes:             str('observacoes'),
    status:                  (str('status') ?? 'ativo') as string,
  }
}
