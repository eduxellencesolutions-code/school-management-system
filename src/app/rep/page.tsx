import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TicketIcon, GraduationCap, BookOpen } from 'lucide-react'
import RepDashboard from '@/components/representatives/RepDashboard'
import LogoutButton from '@/components/super-admin/LogoutButton'
import NotificationBell from '@/components/notifications/NotificationBell'
import AnnouncementBanner from '@/components/announcements/AnnouncementBanner'

export default async function RepPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rep } = await supabase
    .from('representatives')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!rep) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-surface-50 p-6">
      {/* ✅ Header with Support Link + Notification Bell + Logout */}
      <div className="flex justify-end items-center gap-2 max-w-4xl mx-auto mb-4 flex-wrap">
        <Link href="/rep/onboarding" className="btn-secondary btn-sm btn flex items-center gap-1.5">
          <GraduationCap size={14} /> Onboarding
        </Link>
        <Link href="/rep/resources" className="btn-secondary btn-sm btn flex items-center gap-1.5">
          <BookOpen size={14} /> Resource Centre
        </Link>
        <Link href="/school-support" className="btn-secondary btn-sm btn flex items-center gap-1.5">
          <TicketIcon size={14} /> Support
        </Link>
        <NotificationBell />
        <LogoutButton />
      </div>
      <div className="max-w-4xl mx-auto">
        <AnnouncementBanner />
      </div>
      <RepDashboard />
    </div>
  )
}