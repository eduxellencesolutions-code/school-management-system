import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTeacherDashboardData } from '@/lib/teacher-utils'
import { BookOpen, Users, ClipboardList, Crown } from 'lucide-react'

export default async function TeacherDashboardPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: user } = await supabase
    .from('users').select('*')
    .eq('id', authUser.id).single()

  const { context, classes, subjects } = await getTeacherDashboardData(authUser.id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Welcome, {user?.name} 👋</h1>
        <p className="page-subtitle">
          {context.isClassTeacher && `You are the class teacher of ${classes.find(c => c.id === context.classTeacherOf)?.name || 'your class'}`}
          {context.isClassTeacher && context.subjectTeacherOf.length > 0 && ' and '}
          {context.subjectTeacherOf.length > 0 && `You teach ${context.subjectTeacherOf.length} subject${context.subjectTeacherOf.length > 1 ? 's' : ''}`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Classes Section */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-brand-500" />
              <h2 className="font-semibold text-sm text-ink">My Classes</h2>
            </div>
            {context.classTeacherOf && (
              <span className="badge badge-amber text-[10px] flex items-center gap-1">
                <Crown size={10} /> Class Teacher
              </span>
            )}
          </div>
          <div className="divide-y divide-surface-200">
            {classes.length > 0 ? (
              classes.map(cls => (
                <div key={cls.id} className="px-4 py-3 flex items-center justify-between hover:bg-surface-50 transition-colors">
                  <div>
                    <p className="font-medium text-sm text-ink">{cls.name}</p>
                    <p className="text-xs text-ink-muted">
                      {cls.learner_count?.[0]?.count || 0} students
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/scores?class=${cls.id}`} className="btn-secondary btn-sm btn">
                      Scores
                    </Link>
                    <Link href={`/classes/${cls.id}`} className="btn-primary btn-sm btn">
                      View
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-ink-muted">
                No classes assigned yet
              </div>
            )}
          </div>
        </div>

        {/* Subjects Section */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-green-500" />
              <h2 className="font-semibold text-sm text-ink">My Subjects</h2>
            </div>
          </div>
          <div className="divide-y divide-surface-200">
            {subjects.length > 0 ? (
              subjects.map(subj => (
                <div key={subj.id} className="px-4 py-3 flex items-center justify-between hover:bg-surface-50 transition-colors">
                  <div>
                    <p className="font-medium text-sm text-ink">{subj.name}</p>
                    <p className="text-xs text-ink-muted">
                      {subj.group?.name || 'No class'} {subj.code && `· ${subj.code}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/scores?subject=${subj.id}`} className="btn-secondary btn-sm btn">
                      <ClipboardList size={12} /> Scores
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-ink-muted">
                No subjects assigned yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-value">{classes.length}</div>
          <div className="stat-label">Classes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{subjects.length}</div>
          <div className="stat-label">Subjects</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {context.isClassTeacher ? 'Class Teacher' : 'Subject Teacher'}
          </div>
          <div className="stat-label">Role</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{context.allAssignments.length}</div>
          <div className="stat-label">Total Assignments</div>
        </div>
      </div>
    </div>
  )
}