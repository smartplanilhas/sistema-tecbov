'use server'

import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'

// Allows letters (any script), digits, spaces and common punctuation.
// Rejects control chars, null bytes, and path traversal sequences.
const SAFE_NAME_RE = /^[\p{L}\p{N}\s\-_.&,()]+$/u

function validateName(value: string, label: string): string | null {
  const v = value.trim()
  if (v.length < 2) return `${label} deve ter pelo menos 2 caracteres.`
  if (v.length > 100) return `${label} deve ter no máximo 100 caracteres.`
  if (!SAFE_NAME_RE.test(v)) return `${label} contém caracteres inválidos.`
  return null
}

export async function createTenant(formData: FormData) {
  const companyName = formData.get('companyName') as string
  if (!companyName?.trim()) return { error: 'Nome da fazenda é obrigatório.' }

  const nameError = validateName(companyName, 'Nome da fazenda')
  if (nameError) return { error: nameError }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' }

  const admin = createAdminClient()
  const slug = slugify(companyName)

  const { data: tenant, error: tenantError } = await admin
    .from('tenants')
    .insert({ name: companyName.trim(), slug })
    .select()
    .single()

  if (tenantError) {
    return {
      error: tenantError.code === '23505'
        ? 'Já existe uma fazenda com esse nome. Tente outro.'
        : `Erro ao criar fazenda: ${tenantError.message}`,
    }
  }

  const { error: memberError } = await admin
    .from('memberships')
    .insert({ user_id: user.id, tenant_id: tenant.id, role: 'admin' })

  if (memberError) {
    return { error: `Erro ao configurar acesso: ${memberError.message}` }
  }

  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 7)

  await admin.from('tenant_subscriptions').insert({
    tenant_id: tenant.id,
    status: 'trial',
    trial_ends_at: trialEndsAt.toISOString(),
  })

  // Fazenda padrão
  await admin.from('fazendas').insert({ tenant_id: tenant.id, nome: companyName.trim() })

  // Proprietário inicial com o nome do usuário
  const userName = (user.user_metadata?.full_name as string | undefined)?.trim()
  if (userName) {
    await admin.from('proprietarios').insert({ tenant_id: tenant.id, nome: userName })
  }

  // Perfil do usuário
  const whatsapp    = (formData.get('whatsapp')    as string)?.trim() || null
  const position    = (formData.get('position')    as string) || null
  const companySize = (formData.get('companySize') as string) || null

  // Values come from a constrained <select>, cast satisfies the DB union types
  await admin.from('user_profiles').upsert({
    user_id:      user.id,
    whatsapp,
    position:     position    as 'proprietario' | 'funcionario' | 'consultor' | 'contador' | 'estudante' | null,
    company_size: companySize as '1-5' | '6-10' | '10-30' | '30-50' | '50-100' | '100+' | null,
  })

  redirect(`/${tenant.slug}/dashboard`)
}
