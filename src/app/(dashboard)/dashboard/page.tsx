import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Users, ClipboardList, FileText, ArrowRight, TrendingUp, BarChart3 } from 'lucide-react'
import { getTeacherDashboardData } from '@/lib/teacher-utils'
import PlanUpgradeCard from '@/components/billing/PlanUpgradeCard'
import FeatureCards from '@/components/dashboard/FeatureCards'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  // FIX: Added !users_organization_id_fkey to resolve ambiguous relation
  const { data: user } = await supabase
    .from('users').select('*, organization:organizations!users_organization_id_fkey(*)').eq('id', authUser.id).single()

  const orgId = user?.organization_id
  const userRole = user?.role || 'teacher'
  const currentPlanKey = user?.subscription_plan ?? 'free'

  const PLAN_FEATURES: Record<string, string[]> = {
    free: [],
    small_school: ['attendance', 'affective_psychomotor', 'parent_portal', 'promotion'],
    standard_school: ['attendance', 'affective_psychomotor', 'parent_portal', 'promotion', 'homework'],
    premium_school: ['attendance', 'affective_psychomotor', 'parent_portal', 'promotion', 'homework', 'fees'],
  }
  const orgPlanKey = user?.organization?.subscription_plan ?? 'free'
  const planFeatures = (!orgId) ? [] : (PLAN_FEATURES[orgPlanKey] ?? [])

  // ── Determine user type ──
  const isSoloTeacher = !orgId
  const isInstitutionAdmin = orgId && (userRole === 'admin' || userRole === 'school_admin')
  const isInstitutionTeacher = orgId && userRole === 'teacher'

  let groupCount = 0
  let learnerCount = 0
  let scoreCount = 0
  let reportCount = 0
  let recentGroups: any[] = []
  let completedGroupIds = new Set()
  let subjectStats: any[] = []
  let recentScores: any[] = []
  let firstClass: any = null
  let scoreGridData: any = null
  let assignedClasses: any[] = []
  let assignedSubjects: any[] = []

  // ── SOLO TEACHER ──
  if (isSoloTeacher) {
    // Solo teacher - use existing logic with instructor_id
    const groupsBaseQuery = () => {
      const q = supabase.from('groups').select('*', { count: 'exact', head: true }).eq('is_active', true)
      return q.eq('instructor_id', authUser.id)
    }

    const learnersBaseQuery = async () => {
      const q = supabase.from('learners').select('*', { count: 'exact', head: true }).eq('is_active', true)
      const { data: groupIds } = await supabase
        .from('groups')
        .select('id')
        .eq('instructor_id', authUser.id)
        .eq('is_active', true)
      const ids = groupIds?.map(g => g.id) ?? []
      return ids.length > 0 ? q.in('group_id', ids) : supabase.from('learners').select('*', { count: 'exact', head: true }).eq('id', 'none')
    }

    const [
      { count: gCount },
      { count: lCount },
      { count: sCount },
      { count: rCount },
      { data: recent },
    ] = await Promise.all([
      groupsBaseQuery(),
      learnersBaseQuery(),
      supabase.from('scores').select('*', { count: 'exact', head: true }).eq('entered_by', authUser.id),
      supabase.from('reports').select('*', { count: 'exact', head: true })
        .eq('created_by', authUser.id).eq('status', 'ready'),
      supabase.from('groups').select('id, name, created_at, learner_count:learners(count)')
        .eq('instructor_id', authUser.id).eq('is_active', true)
        .order('created_at', { ascending: false }).limit(5),
    ])

    groupCount = gCount || 0
    learnerCount = lCount || 0
    scoreCount = sCount || 0
    reportCount = rCount || 0
    recentGroups = recent || []

    const recentGroupIds = (recentGroups ?? []).map(g => g.id)
    const { data: completed } = await supabase
      .from('reports').select('group_id')
      .eq('created_by', authUser.id).eq('status', 'ready')
      .in('group_id', recentGroupIds.length > 0 ? recentGroupIds : ['none'])
    completedGroupIds = new Set((completed ?? []).map(r => r.group_id))

    // Subject breakdown for solo teacher
    const { data: groupIds } = await supabase
      .from('groups')
      .select('id')
      .eq('instructor_id', authUser.id)
      .eq('is_active', true)
    const ids = groupIds?.map(g => g.id) ?? []
    if (ids.length > 0) {
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name, code, group:groups(name), score_count:scores(count)')
        .in('group_id', ids)
        .eq('is_active', true).order('name').limit(10)
      subjectStats = subjects || []
    }

    // Recent scores
    const { data: scores } = await supabase
      .from('scores')
      .select('id, score, created_at, learner:learners(first_name, last_name, admission_number), subject:subjects(name), component:assessment_components(name)')
      .eq('entered_by', authUser.id)
      .order('created_at', { ascending: false })
      .limit(10)
    recentScores = scores || []

    // First class for score grid
    const { data: first } = await supabase
      .from('groups').select('id, name')
      .eq('instructor_id', authUser.id).eq('is_active', true).limit(1).maybeSingle()
    firstClass = first

    if (firstClass) {
      const { data: learners } = await supabase
        .from('learners')
        .select('id, first_name, last_name, admission_number, scores:scores(subject_id, score)')
        .eq('group_id', firstClass.id).eq('is_active', true).order('last_name')

      const { data: subjects } = await supabase
        .from('subjects').select('id, name')
        .eq('group_id', firstClass.id).eq('is_active', true).order('name')

      scoreGridData = { learners, subjects }
    }
  }

  // ── INSTITUTION ADMIN ──
  else if (isInstitutionAdmin) {
    // Admin sees everything in the organization
    const [
      { count: gCount },
      { count: lCount },
      { count: sCount },
      { count: rCount },
      { data: recent },
    ] = await Promise.all([
      supabase.from('groups').select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId).eq('is_active', true),
      supabase.from('learners').select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId).eq('is_active', true),
      supabase.from('scores').select('*', { count: 'exact', head: true })
        .eq('entered_by', authUser.id),
      supabase.from('reports').select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId).eq('status', 'ready'),
      supabase.from('groups').select('id, name, created_at, learner_count:learners(count)')
        .eq('organization_id', orgId).eq('is_active', true)
        .order('created_at', { ascending: false }).limit(5),
    ])

    groupCount = gCount || 0
    learnerCount = lCount || 0
    scoreCount = sCount || 0
    reportCount = rCount || 0
    recentGroups = recent || []

    const recentGroupIds = (recentGroups ?? []).map(g => g.id)
    const { data: completed } = await supabase
      .from('reports').select('group_id')
      .eq('organization_id', orgId).eq('status', 'ready')
      .in('group_id', recentGroupIds.length > 0 ? recentGroupIds : ['none'])
    completedGroupIds = new Set((completed ?? []).map(r => r.group_id))

    // Subject breakdown for admin
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name, code, group:groups(name), score_count:scores(count)')
      .eq('organization_id', orgId).eq('is_active', true).order('name').limit(10)
    subjectStats = subjects || []

    // Recent scores
    const { data: scores } = await supabase
      .from('scores')
      .select('id, score, created_at, learner:learners(first_name, last_name, admission_number), subject:subjects(name), component:assessment_components(name)')
      .eq('entered_by', authUser.id)
      .order('created_at', { ascending: false })
      .limit(10)
    recentScores = scores || []

    // First class for score grid
    const { data: first } = await supabase
      .from('groups').select('id, name')
      .eq('organization_id', orgId).eq('is_active', true).limit(1).maybeSingle()
    firstClass = first

    if (firstClass) {
      const { data: learners } = await supabase
        .from('learners')
        .select('id, first_name, last_name, admission_number, scores:scores(subject_id, score)')
        .eq('group_id', firstClass.id).eq('is_active', true).order('last_name')

      const { data: subjects } = await supabase
        .from('subjects').select('id, name')
        .eq('group_id', firstClass.id).eq('is_active', true).order('name')

      scoreGridData = { learners, subjects }
    }
  }

  // ── INSTITUTION TEACHER ──
  else if (isInstitutionTeacher) {
    // Teacher in an institution - use teacher_assignments
    const teacherData = await getTeacherDashboardData(authUser.id)
    
    assignedClasses = teacherData.classes || []
    assignedSubjects = teacherData.subjects || []
    
    // ✅ Determine if teacher has only subjects (no classes)
    const hasClassesAsTeacher = assignedClasses.length > 0
    const hasSubjectsOnly = assignedClasses.length === 0 && assignedSubjects.length > 0
    
    groupCount = assignedClasses.length
    learnerCount = 0
    scoreCount = 0
    reportCount = 0
    
    // Get learners count from assigned classes
    if (assignedClasses.length > 0) {
      const classIds = assignedClasses.map(c => c.id)
      const { count: lCount } = await supabase
        .from('learners')
        .select('*', { count: 'exact', head: true })
        .in('group_id', classIds)
        .eq('is_active', true)
      learnerCount = lCount || 0
    }

    // Get scores count
    const { count: sCount } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('entered_by', authUser.id)
    scoreCount = sCount || 0

    // Get reports count
    const { count: rCount } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', authUser.id)
      .eq('status', 'ready')
    reportCount = rCount || 0

    // Recent groups (classes) - only if they have classes
    recentGroups = assignedClasses.slice(0, 5)

    // Get report status for recent groups
    if (recentGroups.length > 0) {
      const recentGroupIds = recentGroups.map(g => g.id)
      const { data: completed } = await supabase
        .from('reports').select('group_id')
        .eq('created_by', authUser.id).eq('status', 'ready')
        .in('group_id', recentGroupIds)
      completedGroupIds = new Set((completed ?? []).map(r => r.group_id))
    }

    // Subject breakdown for institution teacher
    if (assignedSubjects.length > 0) {
      const subjectIds = assignedSubjects.map(s => s.id)
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name, code, group:groups(name), score_count:scores(count)')
        .in('id', subjectIds)
        .eq('is_active', true).order('name').limit(10)
      subjectStats = subjects || []
    }

    // Recent scores
    const { data: scores } = await supabase
      .from('scores')
      .select('id, score, created_at, learner:learners(first_name, last_name, admission_number), subject:subjects(name), component:assessment_components(name)')
      .eq('entered_by', authUser.id)
      .order('created_at', { ascending: false })
      .limit(10)
    recentScores = scores || []

    // First class for score grid
    if (assignedClasses.length > 0) {
      firstClass = assignedClasses[0]
      
      const { data: learners } = await supabase
        .from('learners')
        .select('id, first_name, last_name, admission_number, scores:scores(subject_id, score)')
        .eq('group_id', firstClass.id).eq('is_active', true).order('last_name')

      const { data: subjects } = await supabase
        .from('subjects').select('id, name')
        .eq('group_id', firstClass.id).eq('is_active', true).order('name')

      scoreGridData = { learners, subjects }
    }
  }

  // ✅ Contextual stats for subjects-only teachers
  const hasSubjectsOnly = isInstitutionTeacher && assignedClasses.length === 0 && assignedSubjects.length > 0

  const stats = [
    { 
      label: hasSubjectsOnly ? 'Subjects' : 'Classes', 
      value: hasSubjectsOnly ? assignedSubjects.length : (groupCount ?? 0), 
      icon: BookOpen, 
      href: hasSubjectsOnly ? '/settings/subjects' : '/classes', 
      color: 'text-brand-500', 
      bg: 'bg-brand-50' 
    },
    { label: 'Students', value: learnerCount ?? 0, icon: Users, href: '/students', color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Scores entered', value: scoreCount ?? 0, icon: ClipboardList, href: '/scores', color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Reports ready', value: reportCount ?? 0, icon: FileText, href: '/reports', color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  // Determine role display
  let roleDisplay = ''
  if (isSoloTeacher) roleDisplay = 'Solo Teacher'
  else if (isInstitutionAdmin) roleDisplay = 'School Admin'
  else if (isInstitutionTeacher) {
    const context = await (async () => {
      const supabaseClient = await createClient()
      const { data: assignments } = await supabaseClient
        .from('teacher_assignments')
        .select('role')
        .eq('teacher_id', authUser.id)
        .eq('is_active', true)
      return assignments
    })()
    const isClassTeacher = context?.some(a => a.role === 'class_teacher')
    roleDisplay = isClassTeacher ? 'Class Teacher' : 'Subject Teacher'
  }

  // ── Fetch full teaching assignments + custom role assignments for the banner ──
  // This runs for ANY institution user (admin, teacher, or custom-role staff), since
  // any of them can simultaneously hold a class-teacher/subject-teacher assignment
  // AND a custom role (Bursar, Academic Director, etc.) — the two systems are independent.
  let teachingAssignments: Array<{ role: string; className: string | null; subjectName: string | null }> = []
  let customRoles: string[] = []

  if (orgId) {
    const { data: taRows } = await supabase
      .from('teacher_assignments')
      .select('role, class_id, subject_id')
      .eq('teacher_id', authUser.id)
      .eq('is_active', true)

    if (taRows && taRows.length > 0) {
      const classIds = [...new Set(taRows.map(t => t.class_id).filter(Boolean))]
      const subjectIds = [...new Set(taRows.map(t => t.subject_id).filter(Boolean))]

      const [{ data: taClasses }, { data: taSubjects }] = await Promise.all([
        classIds.length > 0
          ? supabase.from('groups').select('id, name').in('id', classIds)
          : Promise.resolve({ data: [] }),
        subjectIds.length > 0
          ? supabase.from('subjects').select('id, name').in('id', subjectIds)
          : Promise.resolve({ data: [] }),
      ])

      const classMap = new Map((taClasses ?? []).map(c => [c.id, c.name]))
      const subjectMap = new Map((taSubjects ?? []).map(s => [s.id, s.name]))

      teachingAssignments = taRows.map(t => ({
        role: t.role,
        className: t.class_id ? classMap.get(t.class_id) ?? null : null,
        subjectName: t.subject_id ? subjectMap.get(t.subject_id) ?? null : null,
      }))
    }

    const { data: roleAssignments } = await supabase
      .from('staff_role_assignments')
      .select('role_id')
      .eq('user_id', authUser.id)
      .eq('is_active', true)

    if (roleAssignments && roleAssignments.length > 0) {
      const roleIds = roleAssignments.map(r => r.role_id)
      const { data: roleNames } = await supabase
        .from('school_roles')
        .select('name')
        .in('id', roleIds)
      customRoles = (roleNames ?? []).map(r => r.name)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">{greeting}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">
            {roleDisplay} • {hasSubjectsOnly 
              ? `You teach ${assignedSubjects.length} subject${assignedSubjects.length > 1 ? 's' : ''}`
              : `Here's what's happening with your classes today.`
            }
            {isInstitutionTeacher && assignedSubjects.length > 0 && !hasSubjectsOnly && ` You teach ${assignedSubjects.length} subject${assignedSubjects.length > 1 ? 's' : ''}.`}
          </p>

          {(teachingAssignments.length > 0 || customRoles.length > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {teachingAssignments.map((ta, i) => (
                <span key={`ta-${i}`} className="badge badge-blue text-[11px]">
                  {ta.role === 'class_teacher'
                    ? `Class Teacher of ${ta.className ?? '—'}`
                    : `${ta.subjectName ?? 'Subject'} Teacher${ta.className ? ` — ${ta.className}` : ''}`}
                </span>
              ))}
              {customRoles.map((name, i) => (
                <span key={`role-${i}`} className="badge badge-gold text-[11px]">
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
        {(isSoloTeacher || isInstitutionAdmin) && (
          <Link href="/classes/new" className="btn-primary btn">+ New Class</Link>
        )}
      </div>

      <FeatureCards isAdmin={!!isInstitutionAdmin} isSoloTeacher={isSoloTeacher} planFeatures={planFeatures} currentPlanKey={orgPlanKey} />

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
        <div className="lg:col-span-2 card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-sm text-ink">
              {hasSubjectsOnly ? 'My Subjects' : 'Recent Classes'}
            </h2>
            <Link href={hasSubjectsOnly ? '/settings/subjects' : '/classes'} className="text-xs text-brand-500 hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-surface-200">
            {hasSubjectsOnly ? (
              // ✅ Show subjects for subject-only teachers
              assignedSubjects.map((s: any) => (
                <div key={s.id} className="px-5 py-3 flex items-center justify-between hover:bg-surface-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-green-50 text-green-600 text-xs font-bold flex items-center justify-center">
                      {s.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">{s.name}</p>
                      <p className="text-xs text-ink-muted">{s.group?.name ?? 'Unassigned class'}</p>
                    </div>
                  </div>
                  <Link href={`/scores?class=${s.group_id}&subject=${s.id}`} className="btn-primary btn-sm btn">
                    Enter scores
                  </Link>
                </div>
              ))
            ) : recentGroups && recentGroups.length > 0 ? (
              // ✅ Show classes for class teachers and others
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
                      <Link href={`/scores?class=${g.id}`} className="btn-secondary btn-sm btn">Enter scores</Link>
                      {hasReport ? (
                        <Link href="/reports" className="btn-sm btn border border-green-200 text-green-600 hover:bg-green-50">✓ Report ready</Link>
                      ) : (
                        <Link href={`/reports/generate?class=${g.id}`} className="btn-primary btn-sm btn">Generate report</Link>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="px-5 py-10 text-center">
                <BookOpen size={32} className="text-surface-200 mx-auto mb-3" />
                <p className="text-sm text-ink-muted mb-3">
                  {isInstitutionTeacher ? 'No classes or subjects assigned to you yet' : 'No classes yet'}
                </p>
                {(isSoloTeacher || isInstitutionAdmin) && (
                  <Link href="/classes/new" className="btn-primary btn-sm btn">Create your first class</Link>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="card p-5">
            <h2 className="font-semibold text-sm text-ink mb-4">Quick actions</h2>
            <div className="flex flex-col gap-2">
              {[
                ...((isSoloTeacher || isInstitutionAdmin) ? [{ label: 'Add a class', href: '/classes/new', icon: '📚' }] : []),
                // ✅ Conditional swap: Enrol students vs View students
                (isSoloTeacher || isInstitutionAdmin)
                  ? { label: 'Enrol students', href: '/students/new', icon: '👤' }
                  : { label: 'View students', href: '/students', icon: '👤' },
                { label: 'Enter scores', href: '/scores', icon: '✏️' },
                { label: 'View reports', href: '/reports', icon: '📄' },
                ...((isSoloTeacher || isInstitutionAdmin) ? [{ label: 'Add subjects', href: '/settings/subjects/new', icon: '📖' }] : []),
              ].map((a) => (
                <Link key={a.href} href={a.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded border border-surface-200 hover:border-brand-300 hover:bg-brand-50 transition-colors text-sm text-ink group">
                  <span>{a.icon}</span>
                  <span className="font-medium">{a.label}</span>
                  <ArrowRight size={13} className="ml-auto text-ink-faint group-hover:text-brand-500 transition-colors" />
                </Link>
              ))}
            </div>
          </div>

          {/* ✅ Updated: Real PlanUpgradeCard for solo teachers */}
          {isSoloTeacher && currentPlanKey !== 'solo_teacher_pro' && (
            <div className="card p-5 bg-brand-50 border-brand-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={15} className="text-brand-600" />
                <span className="text-xs font-semibold text-brand-700 uppercase tracking-wider">Free plan</span>
              </div>
              <p className="text-xs text-brand-700 leading-relaxed mb-3">
                Upgrade to Solo Teacher Pro for unlimited classes, PDF reports, broadsheets, and AI remarks.
              </p>
              <PlanUpgradeCard plan="solo_teacher_pro" label="Solo Teacher Pro" />
            </div>
          )}
        </div>
      </div>

      {subjectStats && subjectStats.length > 0 && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <BarChart3 size={16} className="text-ink-muted" /> Subject Breakdown
            </h2>
            {(isSoloTeacher || isInstitutionAdmin) && (
              <Link href="/settings/subjects" className="text-xs text-brand-500 hover:underline">Manage subjects</Link>
            )}
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
                  const group = (subject.group as unknown as { name: string }[])?.[0] ?? null
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
                  const learner = (score.learner as unknown as { first_name: string; last_name: string; admission_number?: string }[])?.[0] ?? null
                  const subject = (score.subject as unknown as { name: string }[])?.[0] ?? null
                  const component = (score.component as unknown as { name: string }[])?.[0] ?? null
                  return (
                    <tr key={score.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                      <td className="px-4 py-2">
                        {learner ? `${learner.last_name} ${learner.first_name}` : '—'}
                        {learner?.admission_number && <span className="text-xs text-ink-faint ml-2 font-mono">{learner.admission_number}</span>}
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

      {scoreGridData && scoreGridData.learners && scoreGridData.learners.length > 0 && scoreGridData.subjects && scoreGridData.subjects.length > 0 && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
              <Users size={16} className="text-ink-muted" /> Score Grid: {firstClass?.name || 'Class'}
            </h2>
            <Link href={`/scores?class=${firstClass?.id}`} className="text-xs text-brand-500 hover:underline">Enter scores</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider sticky left-0 bg-white z-10">Student</th>
                  {(scoreGridData.subjects || []).map((subj: { id: string; name: string }) => (
                    <th key={subj.id} className="text-center px-3 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">{subj.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scoreGridData.learners.map((learner: { id: string; first_name: string; last_name: string; admission_number: string; scores: { subject_id: string; score: number }[] }) => {
                  const scoreMap = new Map()
                  learner.scores?.forEach((s: { subject_id: string; score: number }) => scoreMap.set(s.subject_id, s.score))
                  return (
                    <tr key={learner.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                      <td className="px-3 py-2 font-medium text-ink sticky left-0 bg-white whitespace-nowrap text-xs">
                        {`${learner.last_name} ${learner.first_name}`}
                        <span className="text-[10px] text-ink-faint ml-2 font-mono">{learner.admission_number}</span>
                      </td>
                      {(scoreGridData.subjects || []).map((subj: { id: string; name: string }) => (
                        <td key={subj.id} className="text-center px-3 py-2 font-mono text-sm">
                          {scoreMap.has(subj.id) ? <span className="font-medium text-ink">{scoreMap.get(subj.id)}</span> : <span className="text-ink-faint">—</span>}
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