'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function assertGesmartAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data } = await admin
    .from('tecbov_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .single()

  if (!data) redirect('/onboarding')
  return admin
}

export async function adminUpdateSubscription(
  tenantId: string,
  data: {
    planId: string | null
    status: string
    extraUsers: number
    trialEndsAt: string | null
    currentPeriodEnd: string | null
    notes: string | null
  }
) {
  const admin = await assertGesmartAdmin()

  await admin
    .from('tenant_subscriptions')
    .upsert(
      {
        tenant_id: tenantId,
        plan_id: data.planId,
        status: data.status as 'trial' | 'active' | 'past_due' | 'blocked' | 'cancelled',
        extra_users: data.extraUsers,
        trial_ends_at: data.trialEndsAt || null,
        current_period_end: data.currentPeriodEnd || null,
        notes: data.notes || null,
        ...(data.status === 'active' ? { current_period_start: new Date().toISOString() } : {}),
      },
      { onConflict: 'tenant_id' }
    )

  revalidatePath('/admin', 'layout')
}

export async function adminAddMember(tenantId: string, email: string) {
  const admin = await assertGesmartAdmin()

  // Busca usuário pelo e-mail (listUsers é ok para nossa escala)
  const { data: { users } } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const found = users.find(u => u.email?.toLowerCase() === email.toLowerCase().trim())

  if (!found) {
    return { error: 'Nenhum usuário com este e-mail. Peça para ele criar uma conta em /register primeiro.' }
  }

  const { data: existing } = await admin
    .from('memberships')
    .select('user_id')
    .eq('tenant_id', tenantId)
    .eq('user_id', found.id)
    .single()

  if (existing) return { error: 'Este usuário já é membro desta fazenda.' }

  const { error } = await admin
    .from('memberships')
    .insert({ user_id: found.id, tenant_id: tenantId, role: 'member' })

  if (error) return { error: `Erro ao adicionar: ${error.message}` }

  revalidatePath('/admin', 'layout')
  return { success: true }
}

export async function adminRemoveMember(tenantId: string, userId: string) {
  const admin = await assertGesmartAdmin()

  await admin
    .from('memberships')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)

  revalidatePath('/admin', 'layout')
}
