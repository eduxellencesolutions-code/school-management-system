import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnnouncementsManager from '@/components/announcements/AnnouncementsManager'

export default async function AnnouncementsPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: user } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', authUser.id)
    .single()

  if (!user?.organization_id) redirect('/dashboard')
  if (user.role !== 'admin') redirect('/dashboard')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Announcements</h1>
        <p className="page-subtitle">Post school-wide updates visible to parents.</p>
      </div>
      <AnnouncementsManager />
    </div>
  )
}