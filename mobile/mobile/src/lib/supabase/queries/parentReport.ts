import { supabase } from '../client'

interface ComponentScore { name: string; score: number; max_score: number }
interface SubjectDetail { subject_id: string; subject_name: string; grade: string; remark: string; total: number; max_score: number; percentage: number; component_scores: ComponentScore[] }
interface ReportLearnerEntry { learner_id: string; average: number; overall_total: number; position: number; grade: string; remark: string; subject_details: SubjectDetail[] }
interface StudentRemarkEntry { teacher_remark?: string; principal_remark?: string }

export interface ChildReportCard {
  school: { name: string | null; motto: string | null; address: string | null; logoUrl: string | null }
  learner: { name: string; admissionNumber: string | null; className: string | null }
  term: { name: string | null; sessionName: string | null }
  report: {
    average: number; grandTotal: number; position: number; classSize: number
    classAverageTotal: number | null; grade: string; remark: string; publishedAt: string
    subjects: SubjectDetail[]
  } | null
  remarks: { teacher: string | null; principal: string | null }
  signatories: { teacherName: string | null; teacherSignatureUrl: string | null; principalName: string | null; principalTitle: string | null; principalSignatureUrl: string | null }
  message?: string
}

export async function loadChildReportCard(learnerId: string): Promise<ChildReportCard> {
  const { data: learner, error: learnerError } = await supabase
    .from('learners').select('id, first_name, last_name, admission_number, group_id, organization_id').eq('id', learnerId).single()
  if (learnerError || !learner) throw new Error('Student not found.')

  const { data: currentGroup } = learner.group_id
    ? await supabase.from('groups').select('name').eq('id', learner.group_id).single()
    : { data: null }

  const { data: candidateReports, error: reportError } = await supabase
    .from('reports')
    .select('id, group_id, term_id, session_id, report_data, student_remarks, published_at')
    .eq('type', 'broadsheet').eq('report_status', 'published').eq('deleted', false)
    .eq('organization_id', learner.organization_id)
    .order('published_at', { ascending: false })
  if (reportError) throw new Error('Could not load report.')

  const report = (candidateReports ?? []).find((r) => {
    const data = r.report_data as { learners?: Array<{ learner_id: string }> }
    return (data?.learners ?? []).some((l) => l.learner_id === learnerId)
  })

  const baseLearnerInfo = { name: `${learner.first_name} ${learner.last_name}`, admissionNumber: learner.admission_number, className: currentGroup?.name ?? null }

  if (!report) {
    return {
      school: { name: null, motto: null, address: null, logoUrl: null },
      learner: baseLearnerInfo, term: { name: null, sessionName: null }, report: null,
      remarks: { teacher: null, principal: null },
      signatories: { teacherName: null, teacherSignatureUrl: null, principalName: null, principalTitle: null, principalSignatureUrl: null },
      message: 'No published result is available for this student yet.',
    }
  }

  const reportData = report.report_data as { learners: ReportLearnerEntry[] }
  const entry = (reportData.learners ?? []).find((rl) => rl.learner_id === learnerId)
  if (!entry) {
    return {
      school: { name: null, motto: null, address: null, logoUrl: null },
      learner: baseLearnerInfo, term: { name: null, sessionName: null }, report: null,
      remarks: { teacher: null, principal: null },
      signatories: { teacherName: null, teacherSignatureUrl: null, principalName: null, principalTitle: null, principalSignatureUrl: null },
      message: 'This student was not found in the published result.',
    }
  }

  const { data: reportGroup } = await supabase.from('groups').select('name, instructor_id').eq('id', report.group_id).single()
  const { data: teacher } = reportGroup?.instructor_id
    ? await supabase.from('users').select('name').eq('id', reportGroup.instructor_id).single() : { data: null }
  const { data: term } = await supabase.from('terms').select('name, session_id').eq('id', report.term_id).single()
  const { data: session } = term?.session_id
    ? await supabase.from('academic_sessions').select('name').eq('id', term.session_id).single() : { data: null }
  const { data: org } = await supabase
    .from('organizations')
    .select('name, motto, address, logo_url, principal_name, principal_title, principal_signature_url, teacher_signature_url')
    .eq('id', learner.organization_id).single()

  let teacherSignatureUrl: string | null = null
  let principalSignatureUrl: string | null = null
  if (org?.teacher_signature_url) {
    const { data: signed } = await supabase.storage.from('signatures').createSignedUrl(org.teacher_signature_url, 3600)
    teacherSignatureUrl = signed?.signedUrl ?? null
  }
  if (org?.principal_signature_url) {
    const { data: signed } = await supabase.storage.from('signatures').createSignedUrl(org.principal_signature_url, 3600)
    principalSignatureUrl = signed?.signedUrl ?? null
  }

  const remarksMap = (report.student_remarks ?? {}) as Record<string, StudentRemarkEntry>
  const studentRemarks = remarksMap[learnerId] ?? null
  const classSize = (reportData.learners ?? []).length
  const classAverageTotal = classSize > 0 ? (reportData.learners ?? []).reduce((sum, l) => sum + (l.overall_total ?? 0), 0) / classSize : null

  return {
    school: { name: org?.name ?? null, motto: org?.motto ?? null, address: org?.address ?? null, logoUrl: org?.logo_url ?? null },
    learner: { name: baseLearnerInfo.name, admissionNumber: learner.admission_number, className: reportGroup?.name ?? currentGroup?.name ?? null },
    term: { name: term?.name ?? null, sessionName: session?.name ?? null },
    report: {
      average: entry.average, grandTotal: entry.overall_total, position: entry.position, classSize,
      classAverageTotal, grade: entry.grade, remark: entry.remark, publishedAt: report.published_at,
      subjects: entry.subject_details,
    },
    remarks: { teacher: studentRemarks?.teacher_remark ?? null, principal: studentRemarks?.principal_remark ?? null },
    signatories: {
      teacherName: teacher?.name ?? null, teacherSignatureUrl,
      principalName: org?.principal_name ?? null, principalTitle: org?.principal_title ?? 'Head Teacher', principalSignatureUrl,
    },
  }
}