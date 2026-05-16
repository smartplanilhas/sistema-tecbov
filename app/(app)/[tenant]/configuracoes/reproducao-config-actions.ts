'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'

async function getTenantId(slug: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('tenants').select('id').eq('slug', slug).single()
  return data?.id ?? null
}

export async function saveReproducaoConfig(
  tenantSlug: string,
  diasLactacao: number,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  const tenantId = await getTenantId(tenantSlug)
  if (!tenantId) return { error: 'Não autorizado.' }

  const dias = Math.max(1, Math.min(365, Math.round(diasLactacao)))

  const db = admin as any
  const { error } = await db.from('reproducao_config').upsert(
    { tenant_id: tenantId, dias_lactacao: dias },
    { onConflict: 'tenant_id' }
  )
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/configuracoes`)
  revalidatePath(`/${tenantSlug}/manejo/reproducao`)
  return {}
}
