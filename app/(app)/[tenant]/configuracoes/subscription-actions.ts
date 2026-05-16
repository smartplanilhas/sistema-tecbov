'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'

export async function updateSubscription(
  tenantId: string,
  data: {
    planId: string | null
    extraUsers: number
    status: string
    currentPeriodEnd: string | null
    notes: string | null
  }
) {
  const admin = createAdminClient()

  await admin
    .from('tenant_subscriptions')
    .update({
      plan_id: data.planId || null,
      extra_users: data.extraUsers,
      status: data.status as 'trial' | 'active' | 'past_due' | 'blocked' | 'cancelled',
      notes: data.notes || null,
      ...(data.status === 'active' && {
        current_period_start: new Date().toISOString(),
        current_period_end: data.currentPeriodEnd || null,
        trial_ends_at: null,
      }),
    })
    .eq('tenant_id', tenantId)

  revalidatePath('/', 'layout')
}
