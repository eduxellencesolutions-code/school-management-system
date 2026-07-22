import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AttendanceSheet from '@/components/attendance/AttendanceSheet'

export default async function AttendancePage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  const orgId = user?.organization_id
  const isSoloTeacher = !orgId

  // Resolve the current term/session — institutions use organizations.current_term_id,
  // solo teachers use users.current_term_id. Same pattern as your report generator page.
  let currentTermId: string | null = null

  if (isSoloTeacher) {
    currentTermId = user?.current_term_id ?? null
  } else {
    const { data: org } = await supabase
      .from('organizations')
      .select('current_term_id')
      .eq('id', orgId)
      .single()
    currentTermId = org?.current_term_id ?? null
  }

  let termId: string | null = null
  let sessionId: string | null = null
  let termLabel: string | null = null

  if (currentTermId) {
    const { data: term } = await supabase
      .from('terms')
      .select('id, name, session_id, session:academic_sessions(name)')
      .eq('id', currentTermId)
      .single()

    if (term) {
      termId = term.id
      sessionId = term.session_id
      const sessionName = (term.session as unknown as { name: string } | null)?.name ?? ''
      termLabel = `${sessionName} — ${term.name}`
    }
  }

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
        <p className="page-subtitle">
          {termLabel ? `Marking attendance for ${termLabel}` : 'Mark daily attendance for your class.'}
        </p>
      </div>

      {!termId || !sessionId ? (
        <div className="card p-8 text-center text-sm text-ink-muted">
          No current academic term is set. Please set your current term in Settings before marking attendance.
        </div>
      ) : !classes || classes.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-muted">
          No classes found. Create a class first.
        </div>
      ) : (
        <AttendanceSheet classes={classes} termId={termId} sessionId={sessionId} />
      )}
    </div>
  )
}
