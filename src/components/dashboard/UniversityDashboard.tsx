// FILE: src/components/dashboard/UniversityDashboard.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Building2, Building, GraduationCap, Layers, BookMarked,
  Users, CheckSquare, ArrowRight, AlertTriangle, Undo2,
} from 'lucide-react'

interface Props {
  organizationId: string
  userId: string
  isAdmin: boolean
  userName: string
}

export default async function UniversityDashboard({ organizationId, userId, isAdmin, userName }: Props) {
  const supabase = await createClient()

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  if (isAdmin) {
    const [
      { count: facultiesCount },
      { count: departmentsCount },
      { count: programmesCount },
      { count: cohortsCount },
      { count: coursesCount },
      { data: instructorRows },
      { data: pendingSubmissions },
      { data: returnedSubmissions },
      setupGapsResult,
    ] = await Promise.all([
      supabase.from('faculties').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
      supabase.from('departments').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
      supabase.from('programmes').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
      supabase.from('groups').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('type', 'cohort'),
      supabase.from('subjects').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
      supabase.from('subjects').select('instructor_id').eq('organization_id', organizationId).not('instructor_id', 'is', null),
      supabase.from('course_result_submissions')
        .select('id, status, subject_id, subjects(name, code)')
        .eq('organization_id', organizationId)
        .not('status', 'in', '("published","returned")')
        .order('submitted_at', { ascending: true })
        .limit(10),
      supabase.from('course_result_submissions')
        .select('id, status, subject_id, return_reason, returned_at, subjects(name, code)')
        .eq('organization_id', organizationId)
        .eq('status', 'returned')
        .order('returned_at', { ascending: false })
        .limit(10),
      supabase.rpc('get_tertiary_setup_gaps', { p_org_id: organizationId }),
    ])

    const lecturersCount = new Set((instructorRows ?? []).map(r => r.instructor_id)).size
    const gapsData = setupGapsResult.data as { gaps: any[]; gap_count: number } | null
    const gaps = gapsData?.gaps ?? []

    const stageLabels: Record<string, string> = {
      lecturer_submitted: 'Awaiting Department Review',
      pending_faculty: 'Awaiting Faculty Review',
      pending_registry: 'Awaiting Registry Review',
      pending_senate: 'Awaiting Senate Approval',
      senate_approved: 'Approved — Awaiting Publication',
    }
    const totalPending = (pendingSubmissions ?? []).length
    const totalReturned = (returnedSubmissions ?? []).length

    const stats = [
      { label: 'Faculties', value: facultiesCount ?? 0, icon: Building2, href: '/faculties', color: 'text-brand-500', bg: 'bg-brand-50' },
      { label: 'Departments', value: departmentsCount ?? 0, icon: Building, href: '/departments', color: 'text-green-600', bg: 'bg-green-50' },
      { label: 'Programmes', value: programmesCount ?? 0, icon: GraduationCap, href: '/programmes', color: 'text-amber-600', bg: 'bg-amber-50' },
      { label: 'Cohorts', value: cohortsCount ?? 0, icon: Layers, href: '/cohorts', color: 'text-purple-600', bg: 'bg-purple-50' },
      { label: 'Courses', value: coursesCount ?? 0, icon: BookMarked, href: '/courses', color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: 'Lecturers', value: lecturersCount, icon: Users, href: '/courses', color: 'text-indigo-600', bg: 'bg-indigo-50' },
      { label: 'Pending Review', value: totalPending, icon: CheckSquare, href: '/results/review', color: 'text-orange-600', bg: 'bg-orange-50' },
      { label: 'Returned to Lecturer', value: totalReturned, icon: Undo2, href: '/results/review', color: 'text-red-500', bg: 'bg-red-50' },
    ]

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="page-title">{greeting}, {userName.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Academic Admin • Here's the state of your institution today.</p>
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

        {gaps.length > 0 && (
          <div className="card">
            <div className="card-header flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <h2 className="font-semibold text-sm text-ink">Setup Gaps</h2>
            </div>
            <div className="divide-y divide-surface-200">
              {gaps.map((g: any, i: number) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`badge text-[10px] ${g.severity === 'blocking' ? 'badge-red' : g.severity === 'warning' ? 'badge-gold' : 'badge-gray'}`}>
                      {g.severity}
                    </span>
                    <p className="text-sm text-ink">{g.message}</p>
                  </div>
                  {g.action_href && (
                    <Link href={g.action_href} className="text-xs text-brand-500 hover:underline shrink-0 ml-3">Fix →</Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {totalPending > 0 && (
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="font-semibold text-sm text-ink">Results Awaiting Review</h2>
              <Link href="/results/review" className="text-xs text-brand-500 hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-surface-200">
              {(pendingSubmissions ?? []).map((s: any) => (
                <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {s.subjects?.code ? `${s.subjects.code} — ` : ''}{s.subjects?.name}
                    </p>
                    <p className="text-xs text-ink-muted">{stageLabels[s.status] ?? s.status}</p>
                  </div>
                  <Link href="/results/review" className="btn-secondary btn-sm btn">Review</Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {totalReturned > 0 && (
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
                <Undo2 size={15} className="text-red-500" /> Returned to Lecturer
              </h2>
              <Link href="/results/review" className="text-xs text-brand-500 hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-surface-200">
              {(returnedSubmissions ?? []).map((s: any) => (
                <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {s.subjects?.code ? `${s.subjects.code} — ` : ''}{s.subjects?.name}
                    </p>
                    {s.return_reason && <p className="text-xs text-ink-muted">{s.return_reason}</p>}
                  </div>
                  <span className="badge badge-red text-[10px]">Awaiting resubmission</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── LECTURER'S OWN DASHBOARD (unchanged from previous version) ──
  const { data: assignedCourses } = await supabase
    .from('subjects')
    .select('id, name, code, group_id, groups(name), template_id')
    .eq('instructor_id', userId)
    .eq('is_active', true)
    .order('name')

  const courseIds = (assignedCourses ?? []).map(c => c.id)
  let studentCountByCourse = new Map<string, number>()
  let missingScoresByCourse = new Map<string, number>()
  let submissionStatusByCourse = new Map<string, string>()

  if (courseIds.length > 0) {
    const { data: registrations } = await supabase
      .from('course_registrations')
      .select('subject_id, learner_id')
      .in('subject_id', courseIds)
      .eq('status', 'registered')

    const byCourse = new Map<string, Set<string>>()
    ;(registrations ?? []).forEach(r => {
      if (!byCourse.has(r.subject_id)) byCourse.set(r.subject_id, new Set())
      byCourse.get(r.subject_id)!.add(r.learner_id)
    })
    byCourse.forEach((set, cid) => studentCountByCourse.set(cid, set.size))

    const { data: scores } = await supabase
      .from('scores')
      .select('subject_id, learner_id, score')
      .in('subject_id', courseIds)

    const scoredPairs = new Set((scores ?? []).filter(s => s.score !== null).map(s => `${s.subject_id}:${s.learner_id}`))
    byCourse.forEach((learnerSet, cid) => {
      let missing = 0
      learnerSet.forEach(lid => { if (!scoredPairs.has(`${cid}:${lid}`)) missing++ })
      if (missing > 0) missingScoresByCourse.set(cid, missing)
    })

    const { data: submissions } = await supabase
      .from('course_result_submissions')
      .select('subject_id, status')
      .in('subject_id', courseIds)
    ;(submissions ?? []).forEach(s => submissionStatusByCourse.set(s.subject_id, s.status))
  }

  const totalStudents = [...studentCountByCourse.values()].reduce((sum, n) => sum + n, 0)
  const totalMissingScores = [...missingScoresByCourse.values()].reduce((sum, n) => sum + n, 0)
  const submittedCount = [...submissionStatusByCourse.values()].filter(s => s !== 'draft' && s !== 'returned').length

  const stats = [
    { label: 'My Courses', value: assignedCourses?.length ?? 0, icon: BookMarked, color: 'text-brand-500', bg: 'bg-brand-50' },
    { label: 'Students', value: totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Missing scores', value: totalMissingScores, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Submitted for review', value: submittedCount, icon: CheckSquare, color: 'text-teal-600', bg: 'bg-teal-50' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">{greeting}, {userName.split(' ')[0]} 👋</h1>
        <p className="page-subtitle">Lecturer • Here's the status of your courses.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card">
            <div className={`w-9 h-9 rounded ${bg} flex items-center justify-center mb-2`}>
              <Icon size={18} className={color} />
            </div>
            <div className="stat-value">{value.toLocaleString()}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="font-semibold text-sm text-ink">My Courses</h2>
          <Link href="/lecturer/courses" className="text-xs text-brand-500 hover:underline">View all</Link>
        </div>
        <div className="divide-y divide-surface-200">
          {assignedCourses && assignedCourses.length > 0 ? (
            assignedCourses.map((c: any) => {
              const missing = missingScoresByCourse.get(c.id) ?? 0
              const status = submissionStatusByCourse.get(c.id)
              return (
                <div key={c.id} className="px-5 py-3 flex items-center justify-between hover:bg-surface-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-ink">{c.code ? `${c.code} — ` : ''}{c.name}</p>
                    <p className="text-xs text-ink-muted">
                      {c.groups?.name} · {studentCountByCourse.get(c.id) ?? 0} student{(studentCountByCourse.get(c.id) ?? 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {missing > 0 && <span className="badge badge-gold text-[10px]">{missing} missing score{missing !== 1 ? 's' : ''}</span>}
                    {status && status !== 'draft' && <span className="badge badge-blue text-[10px]">{status.replace(/_/g, ' ')}</span>}
                    <Link href={`/lecturer/courses/${c.id}/scores`} className="btn-primary btn-sm btn">Enter scores</Link>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="px-5 py-10 text-center">
              <BookMarked size={32} className="text-surface-200 mx-auto mb-3" />
              <p className="text-sm text-ink-muted">No courses assigned to you yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}