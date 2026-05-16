'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'

const SAFE_NAME_RE = /^[\p{L}\p{N}\s\-_.&,()]+$/u

function validateName(value: string, label: string): string | null {
  const v = value.trim()
  if (v.length < 2) return `${label} deve ter pelo menos 2 caracteres.`
  if (v.length > 100) return `${label} deve ter no máximo 100 caracteres.`
  if (!SAFE_NAME_RE.test(v)) return `${label} contém caracteres inválidos.`
  return null
}

export async function createFilial(parentId: string, parentSlug: string, formData: FormData) {
  const name = formData.get('name') as string
  if (!name?.trim()) return { error: 'Nome da filial é obrigatório.' }

  const nameError = validateName(name, 'Nome da filial')
  if (nameError) return { error: nameError }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' }

  const admin = createAdminClient()
  const slug = slugify(name)

  const { data: filial, error: filialError } = await admin
    .from('tenants')
    .insert({ name: name.trim(), slug, parent_id: parentId })
    .select()
    .single()

  if (filialError) {
    return {
      error: filialError.code === '23505'
        ? 'Já existe uma fazenda com esse nome. Tente outro.'
        : `Erro ao criar filial: ${filialError.message}`,
    }
  }

  const { error: memberError } = await admin
    .from('memberships')
    .insert({ user_id: user.id, tenant_id: filial.id, role: 'admin' })

  if (memberError) return { error: `Erro ao configurar acesso: ${memberError.message}` }

  revalidatePath(`/${parentSlug}/configuracoes`)
  return { success: true }
}
