import { supabase } from '../client'

export interface ReportListItem {
  id: string; groupName: string; createdByName: string; createdAt: string
  status: string; reportStatus: string; canDelete: boolean
}

async function isAdminOrPermission(userId: string, orgId: string): Promise<boolean> {
  const { data: profile } = await supabase.from('users').select('role').eq('id', userId).single()
  if (profile?.role === 'admin' || profile?.role === 'school_admin') return true
  const { data } = await supabase.rpc('has_permission', { p_user_id: userId, p_permission_key: 'results.view' })
  return !!data
}

export async function loadReportsList(userId: string, orgId: string, role: string): Promise<{ myReports: ReportListItem[]; pendingApproval: ReportListItem[]; isPrincipal: boolean }> {
  const isPrincipal = role === 'principal'
  const isAdmin = role === 'admin' || role === 'school_admin'
  const hasFullAccess = isAdmin || (await isAdminOrPermission(userId, orgId))

  const baseSelect = 'id, group_id, created_by, created_at, status, report_status, group:groups(name), created_by_user:users!reports_created_by_fkey(name)'

  function mapRows(rows: any[]): ReportListItem[] {
    return rows.map((r) => ({
      id: r.id, groupName: r.group?.name ?? '—', createdByName: r.created_by_user?.name ?? '—',
      createdAt: r.created_at, status: r.status, reportStatus: r.report_status, canDelete: isAdmin,
    }))
  }

  if (hasFullAccess) {
    const { data, error } = await supabase.from('reports').select(baseSelect)
      .eq('organization_id', orgId).eq('deleted', false).neq('report_status', 'archived')
      .order('created_at', { ascending: false })
    if (error) throw new Error('Could not load reports.')
    return { myReports: mapRows(data ?? []), pendingApproval: [], isPrincipal: false }
  }

  const { data: classAssignments } = await supabase.from('teacher_assignments').select('class_id').eq('teacher_id', userId)
  const classIds = [...new Set((classAssignments ?? []).map((a) => a.class_id).filter(Boolean))]
  const classFilter = classIds.length > 0 ? classIds.join(',') : '00000000-0000-0000-0000-000000000000'

  if (isPrincipal) {
    const { data: mine, error: mineError } = await supabase.from('reports').select(baseSelect)
      .eq('organization_id', orgId).eq('deleted', false).neq('report_status', 'archived')
      .or(`created_by.eq.${userId},group_id.in.(${classFilter})`)
      .order('created_at', { ascending: false })
    if (mineError) throw new Error('Could not load reports.')

    const { data: pending, error: pendingError } = await supabase.from('reports').select(baseSelect)
      .eq('organization_id', orgId).eq('deleted', false).in('report_status', ['submitted', 'approved'])
      .neq('created_by', userId).order('created_at', { ascending: false })
    if (pendingError) throw new Error('Could not load pending approvals.')

    return { myReports: mapRows(mine ?? []), pendingApproval: mapRows(pending ?? []), isPrincipal: true }
  }

  const { data, error } = await supabase.from('reports').select(baseSelect)
    .eq('organization_id', orgId).eq('deleted', false).neq('report_status', 'archived')
    .or(`created_by.eq.${userId},group_id.in.(${classFilter})`)
    .order('created_at', { ascending: false })
  if (error) throw new Error('Could not load reports.')
  return { myReports: mapRows(data ?? []), pendingApproval: [], isPrincipal: false }
}

// ── Report generation (ported from generateReportData) ──

const DEFAULT_GRADES = [
  { min: 70, max: 100, grade: 'A', remark: 'Excellent' },
  { min: 60, max: 69, grade: 'B', remark: 'Very Good' },
  { min: 50, max: 59, grade: 'C', remark: 'Good' },
  { min: 45, max: 49, grade: 'D', remark: 'Pass' },
  { min: 40, max: 44, grade: 'E', remark: 'Below Pass' },
  { min: 0, max: 39, grade: 'F', remark: 'Fail' },
]

export interface GenerateReportClassInfo {
  id: string; name: string; subjectCount: number; learnerCount: number
  subjects: { id: string; name: string; code: string | null; hasTemplate: boolean; scoreCount: number; learnerCount: number; isComplete: boolean }[]
  hasScores: boolean
}

export async function loadGenerateReportInfo(groupId: string): Promise<GenerateReportClassInfo> {
  const { data: learners, error: learnersError } = await supabase.from('learners').select('id').eq('group_id', groupId).eq('is_active', true)
  if (learnersError) throw new Error('Could not load students.')

  const { data: subjects, error: subjectsError } = await supabase.from('subjects').select('id, name, code, template_id').eq('group_id', groupId).eq('is_active', true).order('name')
  if (subjectsError) throw new Error('Could not load subjects.')

  const learnerIds = (learners ?? []).map((l) => l.id)
  const subjectIds = (subjects ?? []).map((s) => s.id)

  let scores: { learner_id: string; subject_id: string; score: number }[] = []
  if (learnerIds.length > 0 && subjectIds.length > 0) {
    const { data } = await supabase.from('scores').select('learner_id, subject_id, score').in('learner_id', learnerIds).in('subject_id', subjectIds)
    scores = data ?? []
  }

  const subjectInfo = (subjects ?? []).map((s) => {
    const subjectScores = scores.filter((sc) => sc.subject_id === s.id)
    const uniqueLearners = new Set(subjectScores.map((sc) => sc.learner_id))
    return {
      id: s.id, name: s.name, code: s.code, hasTemplate: !!s.template_id,
      scoreCount: subjectScores.length, learnerCount: uniqueLearners.size,
      isComplete: subjectScores.length > 0 && uniqueLearners.size === (learners ?? []).length,
    }
  })

  return {
    id: groupId, name: '', subjectCount: subjectInfo.length, learnerCount: (learners ?? []).length,
    subjects: subjectInfo, hasScores: scores.length > 0,
  }
}

export async function generateReport(params: { orgId: string; groupId: string; userId: string }): Promise<{ reportId: string }> {
  const { data: org } = await supabase.from('organizations').select('current_term_id').eq('id', params.orgId).single()
  const termId = org?.current_term_id
  if (!termId) throw new Error('Your school has not set a current term yet. Set one in Academic Periods first.')

  const { data: termRow } = await supabase.from('terms').select('name, session_id, session:academic_sessions(name)').eq('id', termId).single()
  const sessionId = termRow?.session_id ?? null
  const termName = termRow?.name ?? ''
  const sessionName = (termRow?.session as any)?.name ?? ''

  const { data: learners } = await supabase.from('learners').select('id, first_name, last_name, admission_number').eq('group_id', params.groupId).eq('is_active', true).order('last_name')
  if (!learners?.length) throw new Error('No learners found in this class.')

  const { data: subjects } = await supabase.from('subjects').select('id, name, code, template_id').eq('group_id', params.groupId).eq('is_active', true).order('name')
  if (!subjects?.length) throw new Error('No subjects found for this class.')

  const missingTemplate = subjects.filter((s) => !s.template_id)
  if (missingTemplate.length > 0) throw new Error(`These subjects have no assessment template assigned: ${missingTemplate.map((s) => s.name).join(', ')}.`)

  const templateIds = [...new Set(subjects.map((s) => s.template_id))]
  const { data: components } = await supabase.from('assessment_components').select('id, name, max_score, template_id, sequence').in('template_id', templateIds).order('sequence')
  if (!components?.length) throw new Error('No assessment components found for the assigned templates.')

  const { data: gradingSystem } = await supabase.from('grading_systems').select('*').order('min_score', { ascending: false })
  const grades = gradingSystem && gradingSystem.length > 0
    ? gradingSystem.map((g: any) => ({ min: g.min_score, max: g.max_score, grade: g.grade_letter, remark: g.remark || '' }))
    : DEFAULT_GRADES

  function getGrade(percentage: number) {
    for (const g of grades) if (percentage >= g.min && percentage <= g.max) return { grade: g.grade, remark: g.remark || '' }
    return { grade: 'F', remark: 'Fail' }
  }

  const subjectComponentMap: Record<string, { id: string; name: string; max_score: number }[]> = {}
  subjects.forEach((s) => { subjectComponentMap[s.id] = (components ?? []).filter((c) => c.template_id === s.template_id).map((c) => ({ id: c.id, name: c.name, max_score: c.max_score })) })

  const subjectMaxScore: Record<string, number> = {}
  subjects.forEach((s) => {
    const comps = subjectComponentMap[s.id] || []
    subjectMaxScore[s.id] = comps.length > 0 ? comps.reduce((sum, c) => sum + c.max_score, 0) : 100
  })

  const learnerIds = learners.map((l) => l.id)
  const { data: scores } = await supabase.from('scores').select('learner_id, subject_id, component_id, score').in('learner_id', learnerIds)

  const reportData = learners.map((learner) => {
    const learnerScores = (scores ?? []).filter((s) => s.learner_id === learner.id)
    const subjectTotals: Record<string, number> = {}
    let overallTotal = 0

    const subjectDetails = subjects.map((subject) => {
      const subjectScoreData = learnerScores.filter((s) => s.subject_id === subject.id)
      const total = subjectScoreData.reduce((sum, s) => sum + (s.score || 0), 0)
      subjectTotals[subject.id] = total
      overallTotal += total

      const comps = subjectComponentMap[subject.id] || []
      const componentScores = comps.map((comp) => {
        const scoreEntry = subjectScoreData.find((s) => s.component_id === comp.id)
        const score = scoreEntry?.score ?? 0
        return { name: comp.name, score, max_score: comp.max_score }
      })

      const maxScore = subjectMaxScore[subject.id] || 100
      const percentage = maxScore > 0 ? (total / maxScore) * 100 : 0
      const gradeResult = getGrade(percentage)

      return {
        subject_id: subject.id, subject_name: subject.name, total, max_score: maxScore,
        percentage: Math.round(percentage * 10) / 10, grade: gradeResult.grade, remark: gradeResult.remark,
        component_scores: componentScores,
      }
    })

    const overallMaxScore = subjects.reduce((sum, s) => sum + subjectMaxScore[s.id], 0)
    const average = subjects.length > 0 ? overallTotal / subjects.length : 0
    const percentage = overallMaxScore > 0 ? (overallTotal / overallMaxScore) * 100 : 0
    const overallGradeResult = getGrade(percentage)

    return {
      learner_id: learner.id, first_name: learner.first_name, last_name: learner.last_name, admission_number: learner.admission_number,
      subject_totals: subjectTotals, subject_details: subjectDetails, overall_total: overallTotal,
      average: Math.round(average * 10) / 10, percentage: Math.round(percentage * 10) / 10,
      grade: overallGradeResult.grade, remark: overallGradeResult.remark, position: 0,
    }
  })

  const sorted = [...reportData].sort((a, b) => b.overall_total - a.overall_total)
  sorted.forEach((item, index) => {
    item.position = index > 0 && item.overall_total === sorted[index - 1].overall_total ? sorted[index - 1].position : index + 1
  })
  const sortedByPosition = [...reportData].sort((a, b) => a.position - b.position)

  const finalReportData = {
    learners: sortedByPosition,
    subjects: subjects.map((s) => ({ id: s.id, name: s.name, code: s.code, template_id: s.template_id })),
    grading_system: grades, generated_at: new Date().toISOString(), term_name: termName, session_name: sessionName,
    summary: { total_learners: learners.length, total_subjects: subjects.length },
  }

  const { data: report, error: insertError } = await supabase.from('reports').insert({
    organization_id: params.orgId, group_id: params.groupId, term_id: termId, session_id: sessionId,
    type: 'broadsheet', status: 'ready', report_status: 'draft', completed_at: new Date().toISOString(),
    filters: {}, created_by: params.userId, report_data: finalReportData,
  }).select().single()

  if (insertError) throw new Error(insertError.message || 'Failed to save report.')
  return { reportId: report.id }
}

// ── Report detail + lifecycle ──

export async function loadReportDetail(reportId: string) {
  const { data: report, error } = await supabase.from('reports').select('*, group:groups(id, name, code)').eq('id', reportId).single()
  if (error || !report) throw new Error('Report not found.')
  return report
}

export async function submitReport(reportId: string): Promise<void> {
  const { data, error } = await supabase.from('reports').update({ report_status: 'submitted', submitted_by: (await supabase.auth.getUser()).data.user?.id, submitted_at: new Date().toISOString() }).eq('id', reportId).select('id')
  if (error) throw new Error('Failed to submit report.')
  if (!data || data.length === 0) throw new Error('Only the class teacher can submit this report for approval.')

  const { data: report } = await supabase.from('reports').select('organization_id, group_id').eq('id', reportId).single()
  if (report) {
    const { data: principals } = await supabase.from('users').select('id').eq('organization_id', report.organization_id).eq('role', 'principal')
    const { data: group } = await supabase.from('groups').select('name').eq('id', report.group_id).single()
    if (principals?.length) {
      await supabase.from('notifications').insert(principals.map((p) => ({
        user_id: p.id, organization_id: report.organization_id,
        title: 'Report submitted for approval', body: `${group?.name ?? 'A class'} report was submitted for your approval`,
      })))
    }
  }
}

export async function approveReport(reportId: string): Promise<void> {
  const { data, error } = await supabase.from('reports').update({ report_status: 'approved', approved_by: (await supabase.auth.getUser()).data.user?.id, approved_at: new Date().toISOString() }).eq('id', reportId).select('id')
  if (error) throw new Error('Failed to approve report.')
  if (!data || data.length === 0) throw new Error('Only the principal can approve this report.')

  const { data: report } = await supabase.from('reports').select('organization_id, group_id').eq('id', reportId).single()
  if (report) {
    const { data: admins } = await supabase.from('users').select('id').eq('organization_id', report.organization_id).in('role', ['admin', 'school_admin'])
    const { data: group } = await supabase.from('groups').select('name').eq('id', report.group_id).single()
    if (admins?.length) {
      await supabase.from('notifications').insert(admins.map((a) => ({
        user_id: a.id, organization_id: report.organization_id,
        title: 'Report approved', body: `${group?.name ?? 'A class'} report was approved and is ready to lock`,
      })))
    }
  }
}

export async function publishReport(reportId: string): Promise<void> {
  const { data, error } = await supabase.from('reports').update({ report_status: 'published', published_by: (await supabase.auth.getUser()).data.user?.id, published_at: new Date().toISOString() }).eq('id', reportId).select('id')
  if (error) throw new Error('Failed to publish report.')
  if (!data || data.length === 0) throw new Error('This report must be approved before it can be published, or you lack permission.')
}

export async function unpublishReport(reportId: string): Promise<void> {
  const { error } = await supabase.from('reports').update({ report_status: 'submitted', published_by: null, published_at: null }).eq('id', reportId)
  if (error) throw new Error('Failed to unlock report.')
}

export async function archiveReport(reportId: string): Promise<void> {
  const { error } = await supabase.from('reports').update({ report_status: 'archived' }).eq('id', reportId)
  if (error) throw new Error('Failed to archive report.')
}

export async function softDeleteReport(reportId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('reports').update({ deleted: true, deleted_by: userId, deleted_at: new Date().toISOString() }).eq('id', reportId)
  if (error) throw new Error('Failed to delete report.')
}