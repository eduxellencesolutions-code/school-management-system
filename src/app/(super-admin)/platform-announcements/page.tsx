import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PlatformAnnouncementsManager from '@/components/super-admin/PlatformAnnouncementsManager'

export const dynamic = 'force-dynamic'

export default async function AnnouncementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')
  const { data: canManage } = await supabase.rpc('has_platform_permission', {
    p_user_id: user.id,
    p_permission_key: 'announcements.manage',
  })
  if (!isSuperAdmin && !canManage) redirect('/dashboard')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Platform Announcements</h1>
        <p className="text-sm text-ink-muted mt-1">Broadcast messages to schools, teachers, and parents platform-wide</p>
      </div>
      <PlatformAnnouncementsManager />
    </div>
  )
}