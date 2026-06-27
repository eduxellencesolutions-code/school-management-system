import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { BookOpen, Plus, Users, ClipboardList } from 'lucide-react'

export default async function ClassesPage() {
  // ✅ FIX: Add await here
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  const { data: groups } = await supabase
    .from('groups')
    .select(`
      id, name, code, type, is_active, created_at,
      instructor:users(name),
      session:academic_sessions(name),
      term:terms(name),
      learner_count:learners(count),
      subject_count:subjects(count)
    `)
    .eq('organization_id', profile?.organization_id ?? authUser.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

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

      {groups && groups.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => {
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
                    <Link href={`/scores?class=${g.id}`} className="btn-primary btn-sm btn flex-1 justify-center">
                      <ClipboardList size={12} /> Scores
                    </Link>
                    <Link href={`/classes/${g.id}`} className="btn-secondary btn-sm btn flex-1 justify-center">
                      Manage
                    </Link>
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
