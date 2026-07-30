import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getStaffAccess, hasPermission } from '@/lib/auth/getStaffAccess'
import AnnouncementsManager from '@/components/announcements/AnnouncementsManager'
import SchoolAnnouncementsManager from '@/components/announcements/SchoolAnnouncementsManager'

export const dynamic = 'force-dynamic'

export default async function AnnouncementsPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: user } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', authUser.id)
    .single()

  // ── Check if Super Admin or has announcements.manage permission ──
  const access = await getStaffAccess(supabase, authUser.id)
  const isPlatformAdmin = access.isSuperAdmin || hasPermission(access, 'announcements.manage')

  // ── Super Admin → Platform-wide announcements ──
  if (isPlatformAdmin) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">Post platform-wide announcements visible to all schools and parents.</p>
        </div>
        <AnnouncementsManager />
      </div>
    )
  }

  // ── School Admin → School-specific announcements ──
  if (user?.organization_id && user?.role === 'admin') {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">Post school-wide updates visible to parents.</p>
        </div>
        <SchoolAnnouncementsManager organizationId={user.organization_id} />
      </div>
    )
  }

  // ── Fallback ──
  redirect('/dashboard')
}