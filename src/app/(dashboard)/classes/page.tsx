import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Plus, Users, ClipboardList, Settings } from 'lucide-react'
import DeleteGroupButton from '@/components/classes/DeleteGroupButton'

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  // ✅ Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  // ✅ If no profile, redirect
  if (!profile) {
    console.error('❌ No profile found for user:', authUser.id)
    redirect('/login')
  }

  // ✅ Build the query properly
  const groupsQuery = supabase
    .from('groups')
    .select(`
      id, 
      name, 
      code, 
      type, 
      is_active, 
      created_at,
      organization_id,
      instructor_id,
      instructor:users(name),
      session:academic_sessions(name),
      term:terms(name),
      learner_count:learners(count),
      subject_count:subjects(count)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // ✅ Apply the correct filter based on user type using inline ternary
  const { data: groups, error } = await (profile.organization_id
    ? groupsQuery.eq('organization_id', profile.organization_id)
    : groupsQuery.eq('instructor_id', authUser.id))

  // ✅ Log for debugging
  console.log('📚 Classes query result:', {
    count: groups?.length || 0,
    error: error?.message || 'none',
    firstGroup: groups?.[0]?.name || 'none',
    filter: profile.organization_id ? `organization_id = ${profile.organization_id}` : `instructor_id = ${authUser.id}`
  })

  // ✅ If there's an error, log it
  if (error) {
    console.error('❌ Error fetching classes:', error)
  }

  // ✅ Use empty array if no groups
  const classList = groups || []

  // ✅ Show message based on URL params
  let message = null
  if (params.success === 'deleted') {
    message = { type: 'success', text: 'Class deleted successfully!' }
  } else if (params.error === 'has_students') {
    message = { type: 'error', text: 'Cannot delete class: students are still enrolled.' }
  } else if (params.error === 'delete_failed') {
    message = { type: 'error', text: 'Failed to delete class. Please try again.' }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Classes</h1>
          <p className="page-subtitle">Manage your classes and courses</p>
        </div>
        <Link href="/classes/new" className="btn-primary btn">
          <Plus size={15} /> New Class
        </Link>
      </div>

      {/* ✅ Show messages */}
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-700' 
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {classList.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classList.map((g) => {
            const learners = (g.learner_count as unknown as { count: number }[])?.[0]?.count ?? 0
            const subjects = (g.subject_count as unknown as { count: number }[])?.[0]?.count ?? 0
            const instructor = g.instructor as unknown as { name: string } | null

            return (
              <div key={g.id} className="card hover:shadow-md transition-shadow">
                <div className="card-header flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-100 text-brand-700 font-bold text-sm flex items-center justify-center">
                    {g.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink text-sm truncate">{g.name}</p>
                    {g.code && <p className="text-xs text-ink-muted">{g.code}</p>}
                  </div>
                  <span className={`badge ${g.is_active ? 'badge-green' : 'badge-gray'}`}>
                    {g.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="card-body flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                      <Users size={12} /> {learners} student{learners !== 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                      <BookOpen size={12} /> {subjects} subject{subjects !== 1 ? 's' : ''}
                    </div>
                  </div>
                  {instructor && (
                    <p className="text-xs text-ink-muted">Teacher: {instructor.name}</p>
                  )}
                  {(g.session as unknown as { name: string } | null)?.name && (
                    <p className="text-xs text-ink-muted">
                      {(g.session as unknown as { name: string }).name}
                      {(g.term as unknown as { name: string } | null)?.name &&
                        ` · ${(g.term as unknown as { name: string }).name}`}
                    </p>
                  )}
                  <div className="flex gap-2 mt-1">
                    <Link
                      href={`/scores?class=${g.id}`}
                      className="btn-primary btn-sm btn flex-1 justify-center"
                    >
                      <ClipboardList size={12} /> Scores
                    </Link>
                    <Link
                      href={`/classes/${g.id}`}
                      className="btn-secondary btn-sm btn flex-1 justify-center"
                    >
                      <Settings size={12} /> Manage
                    </Link>
                    <DeleteGroupButton groupId={g.id} groupName={g.name} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card py-16 flex flex-col items-center justify-center text-center">
          <BookOpen size={40} className="text-surface-200 mb-4" />
          <h3 className="font-semibold text-ink mb-1">No classes yet</h3>
          <p className="text-sm text-ink-muted mb-6 max-w-xs">
            Create your first class to start enrolling students and entering scores.
          </p>
          <Link href="/classes/new" className="btn-primary btn">
            <Plus size={15} /> Create first class
          </Link>
        </div>
      )}
    </div>
  )
}
