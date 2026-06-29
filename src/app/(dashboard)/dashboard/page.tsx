import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Users, ClipboardList, FileText, ArrowRight, TrendingUp, BarChart3 } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: user } = await supabase
    .from('users').select('*').eq('id', authUser.id).single()

  const orgId = user?.organization_id

  const [
    { count: groupCount },
    { count: learnerCount },
    { count: scoreCount },
    { count: reportCount },
    { data: recentGroups },
  ] = await Promise.all([
    supabase.from('groups').select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId ?? '00000000-0000-0000-0000-000000000000')
      .eq('is_active', true),
    supabase.from('learners').select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId ?? '00000000-0000-0000-0000-000000000000')
      .eq('is_active', true),
    supabase.from('scores').select('*', { count: 'exact', head: true })
      .eq('entered_by', authUser.id),
    supabase.from('reports').select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId ?? '00000000-0000-0000-0000-000000000000')
      .eq('status', 'completed'),
    supabase.from('groups').select('id, name, created_at, learner_count:learners(count)')
      .eq('organization_id', orgId ?? '00000000-0000-0000-0000-000000000000')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const recentGroupIds = (recentGroups ?? []).map(g => g.id)
  const { data: completedReports } = await supabase
    .from('reports')
    .select('group_id')
    .eq('organization_id', orgId ?? '00000000-0000-0000-0000-000000000000')
    .eq('status', 'completed')
    .in('group_id', recentGroupIds.length > 0 ? recentGroupIds : ['none'])

  const completedGroupIds = new Set((completedReports ?? []).map(r => r.group_id))

  // ✅ Fetch subject breakdown for the dashboard
  const { data: subjectStats } = await supabase
    .from('subjects')
    .select(`
      id,
      name,
      code,
      group:groups(name),
      score_count:scores(count)
    `)
    .eq('organization_id', orgId ?? '00000000-0000-0000-0000-000000000000')
    .eq('is_active', true)
    .order('name')
    .limit(10)

  // ✅ Fetch recent scores for the dashboard
  const { data: recentScores } = await supabase
    .from('scores')
    .select(`
      id,
      score,
      created_at,
      learner:learners(first_name, last_name, admission_number),
      subject:subjects(name),
      component:assessment_components(name)
    `)
    .eq('entered_by', authUser.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // ✅ NEW: Fetch first class for score grid
  const { data: firstClass } = await supabase
    .from('groups')
    .select('id, name')
    .eq('organization_id', orgId ?? '00000000-0000-0000-0000-000000000000')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  // ✅ NEW: Fetch score grid data if a class exists
  let scoreGridData = null
  if (firstClass) {
    const { data: learners } = await supabase
      .from('learners')
      .select(`
        id,
        first_name,
        last_name,
        admission_number,
        scores:score!inner(
          subject_id,
          score
        )
      `)
      .eq('group_id', firstClass.id)
      .eq('is_active', true)
      .order('last_name')

    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('group_id', firstClass.id)
      .eq('is_active', true)
      .order('name')

    scoreGridData = { learners, subjects }
  }

  const stats = [
    { label: 'Classes',        value: groupCount   ?? 0, icon: BookOpen,      href: '/classes',  color: 'text-brand-500',  bg: 'bg-brand-50' },
    { label: 'Students',       value: learnerCount ?? 0, icon: Users,         href: '/students', color: 'text-green-600',  bg: 'bg-green-50' },
    { label: 'Scores entered', value: scoreCount   ?? 0, icon: ClipboardList, href: '/scores',   color: 'text-amber-600',  bg: 'bg-amber-50' },
    { label: 'Reports ready',  value: reportCount  ?? 0, icon: FileText,      href: '/reports',  color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">{greeting}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Here's what's happening with your classes today.</p>
        </div>
        <Link href="/classes/new" className="btn-primary btn">
          + New Class
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, href, color, bg }) => (
          <Link key={label} href={href} className="stat-card hover:shadow-md transition-shadow group">
            <div className={`w-9 h-9 rounded ${bg} flex items-center justify-center mb-2`}>
              <Icon size={18} className={color} />
            </div>
            <div className="stat-value">{value.toLocaleString()}</div>
            <div className="stat-label">{label}</div>
            <div className="flex items-center gap-1 text-xs text-ink-faint mt-1 group-hover:text-brand-500 transition-colors">
              View all <ArrowRight size={10} />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Classes */}
        <div className="lg:col-span-2 card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-sm text-ink">Recent Classes</h2>
            <Link href="/classes" className="text-xs text-brand-500 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-surface-200">
            {recentGroups && recentGroups.length > 0 ? (
              recentGroups.map((g) => {
                const count = (g.learner_count as unknown as { count: number }[])?.[0]?.count ?? 0
                const hasReport = completedGroupIds.has(g.id)
                return (
                  <div key={g.id} className="px-5 py-3 flex items-center justify-between hover:bg-surface-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-brand-50 text-brand-600 text-xs font-bold flex items-center justify-center">
                        {g.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink">{g.name}</p>
                        <p className="text-xs text-ink-muted">{count} student{count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/scores?class=${g.id}`} className="btn-secondary btn-sm btn">
                        Enter scores
                      </Link>
                      {hasReport ? (
                        <Link href="/reports" className="btn-sm btn border border-green-200 text-green-600 hover:bg-green-50">
                          ✓ Report ready
                        </Link>
                      ) : (
                        // ✅ FIXED: Changed from /reports to /reports/generate
                        <Link href={`/reports/generate?class=${g.id}`} className="btn-primary btn-sm btn">
                          Generate report
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="px-5 py-10 text-center">
                <BookOpen size={32} className="text-surface-200 mx-auto mb-3" />
                <p className="text-sm text-ink-muted mb-3">No classes yet</p>
                <Link href="/classes/new" className="btn-primary btn-sm btn">
                  Create your first class
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col gap-4">
          <div className="card p-5">
            <h2 className="font-semibold text-sm text-ink mb-4">Quick actions</h2>
            <div className="flex flex-col gap-2">
              {[
                { label: 'Add a class',    href: '/classes/new',           icon: '📚' },
                { label: 'Enrol students', href: '/students/new',          icon: '👤' },
                { label: 'Enter scores',   href: '/scores',                icon: '✏️' },
                { label: 'View reports',   href: '/reports',               icon: '📄' },
                { label: 'Add subjects',   href: '/settings/subjects/new', icon: '📖' },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded border border-surface-200 hover:border-brand-300 hover:bg-brand-50 transition-colors text-sm text-ink group"
                >
                  <span>{a.icon}</span>
                  <span className="font-medium">{a.label}</span>
                  <ArrowRight size={13} className="ml-auto text-ink-faint group-hover:text-brand-500 transition-colors" />
                </Link>
              ))}
            </div>
          </div>

          {user?.organization_id === null && (
            <div className="card p-5 bg-brand-50 border-brand-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={15} className="text-brand-600" />
                <span className="text-xs font-semibold text-brand-700 uppercase tracking-wider">Free plan</span>
              </div>
              <p className="text-xs text-brand-700 leading-relaxed mb-3">
                Upgrade to Teacher plan for unlimited classes, PDF reports, and AI remarks — just ₦1,000/term.
              </p>
              <Link href="/settings?tab=billing" className="btn-primary btn-sm btn w-full justify-center">
                Upgrade now
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Subject Breakdown */}
      {subjectStats && subjectStats.length > 0 && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <BarChart3 size={16} className="text-ink-muted" />
              Subject Breakdown
            </h2>
            <Link href="/settings/subjects" className="text-xs text-brand-500 hover:underline">Manage subjects</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Subject</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Class</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Scores</th>
                </tr>
              </thead>
              <tbody>
                {subjectStats.map((subject) => {
                  const scoreCount = (subject.score_count as unknown as { count: number }[])?.[0]?.count ?? 0
                  const group = subject.group as { name: string } | null
                  return (
                    <tr key={subject.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                      <td className="px-4 py-2 font-medium text-ink">
                        {subject.name}
                        {subject.code && <span className="text-xs text-ink-faint ml-2 font-mono">{subject.code}</span>}
                      </td>
                      <td className="px-4 py-2 text-ink-muted text-sm">{group?.name || '—'}</td>
                      <td className="px-4 py-2 text-right text-sm font-mono">{scoreCount}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Scores */}
      {recentScores && recentScores.length > 0 && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-sm text-ink">Recent Scores Entered</h2>
            <Link href="/scores" className="text-xs text-brand-500 hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Student</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Subject</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Component</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Score</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentScores.map((score) => {
                  const learner = score.learner as { first_name: string; last_name: string; admission_number?: string } | null
                  const subject = score.subject as { name: string } | null
                  const component = score.component as { name: string } | null
                  return (
                    <tr key={score.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                      <td className="px-4 py-2">
                        {learner ? `${learner.last_name} ${learner.first_name}` : '—'}
                        {learner?.admission_number && (
                          <span className="text-xs text-ink-faint ml-2 font-mono">{learner.admission_number}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-ink-muted">{subject?.name || '—'}</td>
                      <td className="px-4 py-2 text-ink-muted">{component?.name || '—'}</td>
                      <td className="px-4 py-2 text-right font-semibold font-mono">{score.score ?? '—'}</td>
                      <td className="px-4 py-2 text-right text-xs text-ink-faint">
                        {score.created_at ? new Date(score.created_at).toLocaleDateString('en-NG') : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ✅ NEW: Per-Student Score Grid */}
      {scoreGridData && scoreGridData.learners && scoreGridData.learners.length > 0 && scoreGridData.subjects && scoreGridData.subjects.length > 0 && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <Users size={16} className="text-ink-muted" />
              Score Grid: {firstClass?.name || 'Class'}
            </h2>
            <Link href={`/scores?class=${firstClass?.id}`} className="text-xs text-brand-500 hover:underline">
              Enter scores
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider sticky left-0 bg-white z-10">
                    Student
                  </th>
                  {scoreGridData.subjects.map((subj: { id: string; name: string }) => (
                    <th key={subj.id} className="text-center px-3 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">
                      {subj.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scoreGridData.learners.map((learner: { 
                  id: string; 
                  first_name: string; 
                  last_name: string; 
                  admission_number: string; 
                  scores: { subject_id: string; score: number }[] 
                }) => {
                  const scoreMap = new Map()
                  learner.scores.forEach((s: { subject_id: string; score: number }) => {
                    scoreMap.set(s.subject_id, s.score)
                  })
                  return (
                    <tr key={learner.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                      <td className="px-3 py-2 font-medium text-ink sticky left-0 bg-white whitespace-nowrap text-xs">
                        {`${learner.last_name} ${learner.first_name}`}
                        <span className="text-[10px] text-ink-faint ml-2 font-mono">{learner.admission_number}</span>
                      </td>
                      {scoreGridData.subjects.map((subj: { id: string; name: string }) => (
                        <td key={subj.id} className="text-center px-3 py-2 font-mono text-sm">
                          {scoreMap.has(subj.id) ? (
                            <span className="font-medium text-ink">{scoreMap.get(subj.id)}</span>
                          ) : (
                            <span className="text-ink-faint">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-surface-100">
            <p className="text-xs text-ink-faint">
              Showing {scoreGridData.learners.length} student{scoreGridData.learners.length !== 1 ? 's' : ''} and {scoreGridData.subjects.length} subject{scoreGridData.subjects.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
