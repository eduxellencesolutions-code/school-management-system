import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ReportDownloadButtons from '@/components/reports/ReportDownloadButtons'
import DeleteReportButton from '@/components/reports/DeleteReportButton'
import ReportLifecycleActions from '@/components/reports/ReportLifecycleActions'
import RemarksEditor from '@/components/reports/RemarksEditor'
import { hasFeature } from '@/lib/plans/gating'

interface Props { params: Promise<{ id: string }> }

// Type definitions
interface ComponentScore {
  name: string
  score: number
  max_score: number
  weight?: number
  percentage?: number
  position?: number | null
  teacher_comment?: string | null
}

interface SubjectDetail {
  subject_id: string
  subject_name: string
  total: number
  max_score: number
  percentage: number
  grade: string
  remark: string
  component_scores: ComponentScore[]
}

interface Learner {
  learner_id: string
  first_name: string
  last_name: string
  admission_number: string | null
  subject_totals: Record<string, number>
  subject_details: SubjectDetail[]
  overall_total: number
  average: number
  percentage: number
  grade: string
  remark: string
  position: number
}

interface Subject {
  id: string
  name: string
  code?: string
  template_id?: string
}

export default async function ReportDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: report, error } = await supabase
    .from('reports')
    .select('*, group:groups(id, name, code)')
    .eq('id', id)
    .single()

  if (error) console.error('Error fetching report:', error)
  if (!report) notFound()

  const { data: profile } = await supabase
    .from('users').select('organization_id, role, name, signature_url').eq('id', user.id).single()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'school_admin'
  const isSolo = !profile?.organization_id

  let isClassTeacher = false
  if (!isSolo && !isAdmin) {
    const { data: assignment } = await supabase
      .from('teacher_assignments')
      .select('id')
      .eq('teacher_id', user.id)
      .eq('class_id', report.group_id)
      .eq('role', 'class_teacher')
      .maybeSingle()
    isClassTeacher = !!assignment
  }

  const canPublish = isAdmin || isSolo
  const canSubmit = isAdmin || isClassTeacher
  const canDelete = isAdmin || isSolo
  const canEditRemarks = (isAdmin || isClassTeacher) && report.report_status !== 'published'

  let orgFull = null
  if (profile?.organization_id) {
    const { data } = await supabase.from('organizations').select('*').eq('id', profile.organization_id).single()
    orgFull = data
  }

  // ✅ FIX: Get the assigned class teacher instead of report creator
  let classTeacher = null
  const { data: assignment } = await supabase
    .from('teacher_assignments')
    .select('teacher_id')
    .eq('class_id', report.group_id)
    .eq('role', 'class_teacher')
    .maybeSingle()

  if (assignment?.teacher_id) {
    const { data: teacher } = await supabase
      .from('users').select('name, signature_url').eq('id', assignment.teacher_id).single()
    classTeacher = teacher
  }

  let remarkTemplates: any[] = []
  if (canEditRemarks) {
    const { data } = profile?.organization_id
      ? await supabase.from('remark_templates').select('*').eq('organization_id', profile.organization_id)
      : await supabase.from('remark_templates').select('*').is('organization_id', null).eq('instructor_id', user.id)
    remarkTemplates = data ?? []
  }

  // ✅ FIX: Use show_signatory_comment instead of show_class_teacher_comment
  const showPrincipalRemark = orgFull?.report_card_settings?.show_signatory_comment ?? true

  // ✅ Build report card settings object
  const reportCardSettings = {
    showAttendance: orgFull?.report_card_settings?.show_attendance ?? false,
    showTeacherRemark: orgFull?.report_card_settings?.show_remarks ?? true,
    showSignatoryRemark: orgFull?.report_card_settings?.show_signatory_comment ?? true,
    showSignatorySignature: orgFull?.report_card_settings?.show_principal_signature ?? true,
    showSchoolSeal: orgFull?.report_card_settings?.show_school_seal ?? true,
  }

  // ✅ Get current plan for AI remarks feature
  let currentPlan = 'free'
  if (profile?.organization_id) {
    const { data: org } = await supabase
      .from('organizations').select('subscription_plan').eq('id', profile.organization_id).single()
    currentPlan = org?.subscription_plan ?? 'free'
  } else {
    const { data: soloProfile } = await supabase
      .from('users').select('subscription_plan').eq('id', user.id).single()
    currentPlan = soloProfile?.subscription_plan ?? 'free'
  }

  const group = report.group as { id: string; name: string; code?: string } | null
  const data = report.report_data ?? {}
  const learners: Learner[] = data.learners ?? []
  const subjects: Subject[] = data.subjects ?? []

  // Build component list for each subject
  const subjectComponentsMap: Record<string, string[]> = {}
  subjects.forEach((subject: Subject) => {
    const firstLearner = learners.find((learner: Learner) => 
      learner.subject_details?.some((detail: SubjectDetail) => detail.subject_id === subject.id)
    )
    const comps = firstLearner?.subject_details?.find((detail: SubjectDetail) => detail.subject_id === subject.id)?.component_scores || []
    subjectComponentsMap[subject.id] = comps.map((c: ComponentScore) => c.name)
  })

  const statusBadge: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    submitted: 'bg-amber-100 text-amber-800',
    published: 'bg-green-100 text-green-800',
    archived: 'bg-surface-200 text-ink-faint',
  }

  return (
    <div className="flex flex-col gap-6 max-w-[95vw]">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/reports" className="text-ink-muted hover:text-ink flex items-center gap-1">
          <ArrowLeft size={13} /> Reports
        </Link>
        <span className="text-ink-faint">/</span>
        <span className="text-ink font-medium">{group?.name}</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="page-title">{group?.name}</h1>
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusBadge[report.report_status ?? 'draft']}`}>
              {report.report_status ?? 'draft'}
            </span>
          </div>
          <p className="page-subtitle">
            {learners.length} students · {subjects.length} subjects ·
            Generated {new Date(report.completed_at ?? report.created_at).toLocaleDateString('en-NG')}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <ReportLifecycleActions
            reportId={id}
            reportStatus={report.report_status ?? 'draft'}
            canSubmit={canSubmit}
            canPublish={canPublish}
            isSolo={isSolo}
          />
          <ReportDownloadButtons
            reportId={id}
            groupName={group?.name ?? 'Report'}
            termName={data.term_name ?? ''}
            sessionName={data.session_name ?? ''}
            learners={learners}
            subjects={subjects}
            school={{
              name: orgFull?.school_name || orgFull?.name || 'School',
              motto: orgFull?.motto,
              logo_url: orgFull?.logo_url,
              address: orgFull?.address,
            }}
            // ✅ FIX: Use classTeacher instead of reportCreator
            teacherName={classTeacher?.name}
            teacherSignature={classTeacher?.signature_url}
            principalName={orgFull?.principal_name}
            principalTitle={orgFull?.principal_title}
            principalSignature={orgFull?.principal_signature_url}
            studentRemarks={report.student_remarks ?? {}}
            generatedDate={report.completed_at ?? report.created_at}
            isInstitution={!!profile?.organization_id}
            reportCardSettings={reportCardSettings}
            subjectComponentsMap={subjectComponentsMap}
          />
          <DeleteReportButton reportId={id} reportName={group?.name ?? 'Report'} canDelete={canDelete} />
        </div>
      </div>

      {report.report_status === 'published' && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          This report is published and locked. Scores and remarks cannot be edited unless an administrator unlocks it.
        </div>
      )}

      {learners.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 bg-surface-50 border-b border-surface-200 text-center">
            <p className="font-bold text-ink">{group?.name}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-surface-100 border-b-2 border-surface-200">
                  <th className="text-center px-2 py-2 font-semibold text-ink-muted uppercase text-xs w-8 sticky left-0 bg-surface-100 z-20" rowSpan={2}>#</th>
                  <th className="text-left px-3 py-2 font-semibold text-ink-muted uppercase text-xs min-w-[150px] sticky left-8 bg-surface-100 z-20" rowSpan={2}>Student</th>
                  <th className="text-left px-2 py-2 font-semibold text-ink-muted uppercase text-xs sticky left-[9.5rem] bg-surface-100 z-20" rowSpan={2}>Adm. No</th>

                  {subjects.map((subject: Subject) => {
                    const comps = subjectComponentsMap[subject.id] || []
                    return (
                      <th key={subject.id} colSpan={comps.length + 1} className="px-2 py-2 font-semibold text-ink-muted uppercase text-xs text-center border-l-2 border-surface-200 whitespace-nowrap">
                        {subject.name}
                      </th>
                    )
                  })}

                  <th className="px-3 py-2 font-semibold text-ink-muted uppercase text-xs text-center border-l-2 border-surface-200" rowSpan={2}>Total</th>
                  <th className="px-3 py-2 font-semibold text-ink-muted uppercase text-xs text-center" rowSpan={2}>Average</th>
                  <th className="px-3 py-2 font-semibold text-ink-muted uppercase text-xs text-center" rowSpan={2}>Grade</th>
                  <th className="px-3 py-2 font-semibold text-ink-muted uppercase text-xs text-center" rowSpan={2}>Pos.</th>
                </tr>

                <tr className="bg-surface-50 border-b-2 border-surface-200">
                  {subjects.map((subject: Subject) => {
                    const comps = subjectComponentsMap[subject.id] || []
                    return (
                      <>
                        {comps.map((compName: string, idx: number) => (
                          <th key={`${subject.id}-${idx}`} className="px-2 py-1.5 text-center text-[10px] font-semibold text-ink-faint uppercase tracking-wide border-l border-surface-100 whitespace-nowrap">
                            {compName}
                          </th>
                        ))}
                        <th className="px-2 py-1.5 text-center text-[10px] font-bold text-ink-muted uppercase tracking-wide bg-surface-100 border-l border-surface-200 whitespace-nowrap">
                          Total
                        </th>
                      </>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {learners.map((learner: Learner, index: number) => {
                  const subjectDetails = learner.subject_details || []
                  return (
                    <tr key={learner.learner_id} className={index % 2 === 0 ? 'bg-white border-b border-surface-100' : 'bg-surface-50/50 border-b border-surface-100'}>
                      <td className="px-2 py-2.5 text-center text-ink-muted font-mono sticky left-0 bg-inherit z-10">{index + 1}</td>
                      <td className="px-3 py-2.5 font-medium text-ink whitespace-nowrap sticky left-8 bg-inherit z-10">{learner.last_name} {learner.first_name}</td>
                      <td className="px-2 py-2.5 font-mono text-ink-muted sticky left-[9.5rem] bg-inherit z-10">{learner.admission_number ?? '—'}</td>

                      {subjects.map((subject: Subject) => {
                        const detail = subjectDetails.find((d: SubjectDetail) => d.subject_id === subject.id)
                        const components = detail?.component_scores || []
                        const total = detail?.total ?? '—'
                        return (
                          <>
                            {components.map((component: ComponentScore, idx: number) => (
                              <td key={`${subject.id}-comp-${idx}`} className="px-2 py-2.5 text-center font-mono border-l border-surface-100">
                                {component.score}
                              </td>
                            ))}
                            <td className="px-2 py-2.5 text-center font-bold font-mono bg-surface-50 border-l border-surface-200">
                              {total}
                            </td>
                          </>
                        )
                      })}

                      <td className="px-3 py-2.5 text-center font-bold font-mono text-ink border-l-2 border-surface-200">{learner.overall_total}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-ink-muted">{learner.average}</td>
                      <td className="px-3 py-2.5 text-center font-bold">{learner.grade}</td>
                      <td className="px-3 py-2.5 text-center font-bold">{learner.position}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-surface-100 border-t-2 border-surface-300 font-semibold">
                  <td colSpan={3} className="px-3 py-2.5 text-xs text-ink-muted uppercase sticky left-0 bg-surface-100 z-10">Class Average</td>
                  {subjects.map((subject: Subject) => {
                    const comps = subjectComponentsMap[subject.id] || []
                    const subjectTotals = learners
                      .map((l: Learner) => l.subject_details?.find((d: SubjectDetail) => d.subject_id === subject.id)?.total)
                      .filter((v): v is number => v !== undefined)
                    const subjectAvg = subjectTotals.length > 0
                      ? (subjectTotals.reduce((a, b) => a + b, 0) / subjectTotals.length).toFixed(1)
                      : '—'
                    return (
                      <td key={subject.id} colSpan={comps.length + 1} className="px-2 py-2.5 text-center font-mono text-ink border-l-2 border-surface-200">
                        {subjectAvg}
                      </td>
                    )
                  })}
                  <td className="px-3 py-2.5 text-center font-mono text-ink border-l-2 border-surface-200">
                    {(learners.reduce((sum: number, l: Learner) => sum + l.overall_total, 0) / (learners.length || 1)).toFixed(1)}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono text-ink">
                    {(learners.reduce((sum: number, l: Learner) => sum + l.average, 0) / (learners.length || 1)).toFixed(1)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div className="card py-12 text-center text-ink-muted text-sm">No report data available.</div>
      )}

      {canEditRemarks && learners.length > 0 && (
        <RemarksEditor
          reportId={id}
          learners={learners.map((learner: Learner) => ({
            learner_id: learner.learner_id,
            first_name: learner.first_name,
            last_name: learner.last_name,
            percentage: learner.percentage,
            grade: learner.grade,
            subjectBreakdown: subjects.map((subject: Subject) => {
              const detail = learner.subject_details?.find((d: SubjectDetail) => d.subject_id === subject.id)
              return {
                name: subject.name,
                percentage: detail?.percentage ?? 0,
              }
            }),
          }))}
          templates={remarkTemplates}
          initialRemarks={report.student_remarks ?? {}}
          showPrincipalRemark={showPrincipalRemark}
          signatoryTitle={orgFull?.principal_title ?? 'Principal'}
          hasAIRemarks={hasFeature(currentPlan, 'aiGeneratedRemarks')}
        />
      )}
    </div>
  )
}
