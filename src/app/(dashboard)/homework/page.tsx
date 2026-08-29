import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HomeworkManager from '@/components/homework/HomeworkManager'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export default async function HomeworkPage() {
  const supabase = await createClient()
  const { user: authUser } = await getAuthenticatedUser(supabase)
  if (!authUser) redirect('/login')

  const { data: user } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', authUser.id)
    .single()

  const orgId = user?.organization_id
  const isSoloTeacher = !orgId

  // ✅ FIX: Check permission instead of hard role check
  const { data: canViewHomework } = orgId
    ? await supabase.rpc('has_permission', { 
        p_user_id: authUser.id, 
        p_permission_key: 'homework.view' 
      })
    : { data: false }

  // If not admin and doesn't have permission, redirect
  if (user?.role !== 'admin' && !canViewHomework) redirect('/dashboard')

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
        <h1 className="page-title">Homework</h1>
        <p className="page-subtitle">Create assignments and track student submissions.</p>
      </div>

      {!classes || classes.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-muted">No classes found.</div>
      ) : (
        <HomeworkManager classes={classes} />
      )}
    </div>
  )
}