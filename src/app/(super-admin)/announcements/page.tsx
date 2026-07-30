import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getStaffAccess, hasPermission } from '@/lib/auth/getStaffAccess'
import AnnouncementsManager from '@/components/announcements/AnnouncementsManager'

export const dynamic = 'force-dynamic'

export default async function AnnouncementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const access = await getStaffAccess(supabase, user.id)
  const allowed = access.isSuperAdmin || hasPermission(access, 'announcements.manage')
  if (!allowed) redirect('/dashboard')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Announcements</h1>
        <p className="text-sm text-ink-muted mt-1">Post platform-wide announcements visible to all schools and parents</p>
      </div>
      <AnnouncementsManager />
    </div>
  )
}