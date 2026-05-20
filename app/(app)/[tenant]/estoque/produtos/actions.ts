'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function getTenantId(slug: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('tenants').select('id').eq('slug', slug).single()
  return data?.id ?? null
}

async function gerarCodigo(tenantId: string): Promise<string> {
  const admin = createAdminClient() as any
  const { data } = await admin
    .from('produtos_estoque')
    .select('codigo')
    .eq('tenant_id', tenantId)

  if (!data?.length) return 'P-001'

  const nums = (data as { codigo: string }[])
    .map(p => { const m = p.codigo.match(/^P-(\d+)$/); return m ? parseInt(m[1]) : 0 })
    .filter(n => n > 0)

  const max = nums.length ? Math.max(...nums) : 0
  return `P-${String(max + 1).padStart(3, '0')}`
}

export async function createProduto(tenantSlug: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient() as any
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Fazenda não encontrada.' }

  const descricao = (formData.get('descricao') as string)?.trim()
  if (!descricao) return { error: 'Descrição é obrigatória.' }

  const codigo          = await gerarCodigo(tenantId)
  const controla        = formData.get('controla_estoque') === '1'
  const saldoRaw        = formData.get('saldo_inicial') as string
  const minimoRaw       = formData.get('estoque_minimo') as string
  const valorRaw        = formData.get('valor_medio') as string

  const { error } = await admin.from('produtos_estoque').insert({
    tenant_id:        tenantId,
    codigo,
    descricao,
    unidade:          (formData.get('unidade') as string)?.trim() || null,
    valor_medio:      valorRaw  ? parseFloat(valorRaw)  : null,
    controla_estoque: controla,
    saldo_atual:      controla && saldoRaw  ? parseFloat(saldoRaw)  : 0,
    estoque_minimo:   controla && minimoRaw ? parseFloat(minimoRaw) : null,
    categoria_id:     (formData.get('categoria_id') as string) || null,
    tipo_uso_id:      (formData.get('tipo_uso_id')  as string) || null,
    observacao:       (formData.get('observacao')   as string)?.trim() || null,
  })

  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/estoque/produtos`)
  return {}
}

export async function updateProduto(tenantSlug: string, id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient() as any
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Fazenda não encontrada.' }

  const descricao = (formData.get('descricao') as string)?.trim()
  if (!descricao) return { error: 'Descrição é obrigatória.' }

  const controla  = formData.get('controla_estoque') === '1'
  const saldoRaw  = formData.get('saldo_atual') as string
  const minimoRaw = formData.get('estoque_minimo') as string
  const valorRaw  = formData.get('valor_medio') as string

  const { error } = await admin
    .from('produtos_estoque')
    .update({
      descricao,
      unidade:          (formData.get('unidade') as string)?.trim() || null,
      valor_medio:      valorRaw  ? parseFloat(valorRaw)  : null,
      controla_estoque: controla,
      saldo_atual:      controla && saldoRaw  ? parseFloat(saldoRaw)  : 0,
      estoque_minimo:   controla && minimoRaw ? parseFloat(minimoRaw) : null,
      categoria_id:     (formData.get('categoria_id') as string) || null,
      tipo_uso_id:      (formData.get('tipo_uso_id')  as string) || null,
      observacao:       (formData.get('observacao')   as string)?.trim() || null,
      ativo:            formData.get('ativo') !== '0',
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/estoque/produtos`)
  return {}
}

export async function deleteProduto(tenantSlug: string, id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient() as any
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const { error } = await admin
    .from('produtos_estoque')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/estoque/produtos`)
  return {}
}
