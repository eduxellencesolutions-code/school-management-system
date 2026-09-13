import { supabase } from '../client'

export interface TeacherDashboardData {
  orgName: string
  currentTerm: { termName: string; sessionName: string } | null
  classesAsClassTeacher: { id: string; name: string; section: string | null }[]
  subjectsTaught: { id: string; name: string; className: string | null; submissionStatus: string }[]
  studentCount: number
  notifications: { id: string; title: string; body: string; createdAt: string; isRead: boolean }[]
}

export async function loadTeacherDashboard(teacherId: string, orgId: string | null): Promise<TeacherDashboardData> {
  let orgName = ''
  let currentTermId: string | null = null
  let currentTerm: TeacherDashboardData['currentTerm'] = null

  if (orgId) {
    const { data: org } = await supabase
      .from('organizations')
      .select('name, current_term_id')
      .eq('id', orgId)
      .single()
    orgName = org?.name ?? ''
    currentTermId = org?.current_term_id ?? null

    if (currentTermId) {
      const { data: term } = await supabase
        .from('terms')
        .select('name, session_id')
        .eq('id', currentTermId)
        .single()
      if (term) {
        const { data: session } = await supabase
          .from('academic_sessions')
          .select('name')
          .eq('id', term.session_id)
          .single()
        currentTerm = { termName: term.name, sessionName: session?.name ?? '' }
      }
    }
  }

  const { data: assignments, error: assignError } = await supabase
    .from('teacher_assignments')
    .select('id, role, class_id, subject_id, groups:class_id(id, name, section), subjects:subject_id(id, name, group_id)')
    .eq('teacher_id', teacherId)
    .eq('is_active', true)

  if (assignError) throw new Error('Could not load your class and subject assignments.')

  const classesAsClassTeacher = (assignments ?? [])
    .filter((a: any) => a.role === 'class_teacher' && a.groups)
    .map((a: any) => ({ id: a.groups.id, name: a.groups.name, section: a.groups.section }))

  const subjectAssignments = (assignments ?? []).filter((a: any) => a.role === 'subject_teacher' && a.subjects)
  const subjectIds = subjectAssignments.map((a: any) => a.subjects.id)

  let subjectsTaught: TeacherDashboardData['subjectsTaught'] = []
  if (subjectIds.length > 0) {
    const { data: submissions } = currentTermId
      ? await supabase
          .from('course_result_submissions')
          .select('subject_id, status')
          .in('subject_id', subjectIds)
          .eq('term_id', currentTermId)
      : { data: [] }

    const statusBySubject = new Map((submissions ?? []).map((s) => [s.subject_id, s.status]))

    // Fetch class names for subjects via their group_id
    const groupIds = [...new Set(subjectAssignments.map((a: any) => a.subjects.group_id).filter(Boolean))]
    const { data: groups } = groupIds.length
      ? await supabase.from('groups').select('id, name').in('id', groupIds)
      : { data: [] }
    const groupNameById = new Map((groups ?? []).map((g) => [g.id, g.name]))

    subjectsTaught = subjectAssignments.map((a: any) => ({
      id: a.subjects.id,
      name: a.subjects.name,
      className: groupNameById.get(a.subjects.group_id) ?? null,
      submissionStatus: statusBySubject.get(a.subjects.id) ?? 'not_submitted',
    }))
  }

  const classTeacherIds = classesAsClassTeacher.map((c) => c.id)
  const { count: studentCount } = classTeacherIds.length
    ? await supabase
        .from('learners')
        .select('id', { count: 'exact', head: true })
        .in('group_id', classTeacherIds)
        .eq('is_active', true)
    : { count: 0 }

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, title, body, created_at, is_read')
    .eq('user_id', teacherId)
    .order('created_at', { ascending: false })
    .limit(5)

  return {
    orgName,
    currentTerm,
    classesAsClassTeacher,
    subjectsTaught,
    studentCount: studentCount ?? 0,
    notifications: (notifications ?? []).map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      createdAt: n.created_at,
      isRead: n.is_read,
    })),
  }
}