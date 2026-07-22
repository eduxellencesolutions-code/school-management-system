import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AttendanceSheet from '@/components/attendance/AttendanceSheet'

export default async function AttendancePage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: user } = await supabase
    .from('users')
    .select('*, organization:organizations!users_organization_id_fkey(*)')
    .eq('id', authUser.id)
    .single()

  const orgId = user?.organization_id
  const isSoloTeacher = !orgId

  // Classes this user can mark attendance for
  const groupsQuery = supabase
    .from('groups')
    .select('id, name')
    .eq('type', 'class')
    .eq('is_active', true)
    .order('name')

  const { data: classes } = isSoloTeacher
    ? await groupsQuery.eq('instructor_id', authUser.id)
    : await groupsQuery.eq('organization_id', orgId)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Attendance</h1>
        <p className="page-subtitle">Mark daily attendance for your class.</p>
      </div>

      {(!classes || classes.length === 0) ? (
        <div className="card p-8 text-center text-sm text-ink-muted">
          No classes found. Create a class first.
        </div>
      ) : (
        <AttendanceSheet classes={classes} />
      )}
    </div>
  )
}
