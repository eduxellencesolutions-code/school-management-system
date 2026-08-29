import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RatingGrid from '@/components/psychomotor/RatingGrid'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export default async function PsychomotorPage() {
  const supabase = await createClient()
  const { user: authUser } = await getAuthenticatedUser(supabase)
  if (!authUser) redirect('/login')

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  const orgId = user?.organization_id
  const isSoloTeacher = !orgId

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
  let termLabel: string | null = null

  if (currentTermId) {
    const { data: term } = await supabase
      .from('terms')
      .select('id, name, session:academic_sessions(name)')
      .eq('id', currentTermId)
      .single()

    if (term) {
      termId = term.id
      const sessionName = (term.session as unknown as { name: string } | null)?.name ?? ''
      termLabel = `${sessionName} — ${term.name}`
    }
  }

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
        <h1 className="page-title">Affective &amp; Psychomotor</h1>
        <p className="page-subtitle">
          {termLabel ? `Recording ratings for ${termLabel}` : 'Record character and skill ratings for your students.'}
        </p>
      </div>

      {!termId ? (
        <div className="card p-8 text-center text-sm text-ink-muted">
          No current academic term is set. Please set your current term in Settings before recording ratings.
        </div>
      ) : !classes || classes.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-muted">
          No classes found. Create a class first.
        </div>
      ) : (
        <RatingGrid classes={classes} termId={termId} />
      )}
    </div>
  )
}
