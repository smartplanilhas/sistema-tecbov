'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function saveTenantArea(tenantSlug: string, areaHectares: number | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('tenants')
    .update({ area_hectares: areaHectares } as any)
    .eq('slug', tenantSlug)
  if (error) return { error: error.message }

  revalidatePath(`/${tenantSlug}/configuracoes`)
  return {}
}
