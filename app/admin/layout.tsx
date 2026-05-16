import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/admin/admin-sidebar'

export const metadata = { title: 'Admin — Tecbov' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: adminRecord } = await admin
    .from('tecbov_admins')
    .select('name')
    .eq('user_id', user.id)
    .single()

  if (!adminRecord) redirect('/onboarding')

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AdminSidebar adminName={adminRecord.name} userEmail={user.email ?? ''} />
      <main className="flex-1 overflow-y-auto bg-muted/20">
        {children}
      </main>
    </div>
  )
}
