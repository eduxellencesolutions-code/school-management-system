import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ReportDownloadButtons from '@/components/reports/ReportDownloadButtons'
import DeleteReportButton from '@/components/reports/DeleteReportButton'
import ReportLifecycleActions from '@/components/reports/ReportLifecycleActions'
import RemarksEditor from '@/components/reports/RemarksEditor'

interface Props { params: Promise<{ id: string }> }

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
  const canSubmit = isAdmin || isSolo || isClassTeacher
  const canDelete = isAdmin || isSolo || isClassTeacher
  const canEditRemarks = (isAdmin || isSolo || isClassTeacher) && report.report_status !== 'published'

  let orgFull = null
  let reportCreator = null
  if (profile?.organization_id) {
    const { data } = await supabase.from('organizations').select('*').eq('id', profile.organization_id).single()
    orgFull = data
  }
  const { data: creator } = await supabase
    .from('users').select('name, signature_url').eq('id', report.created_by).single()
  reportCreator = creator

  let remarkTemplates: any[] = []
  if (canEditRemarks) {
    const { data } = profile?.organization_id
      ? await supabase.from('remark_templates').select('*').eq('organization_id', profile.organization_id)
      : await supabase.from('remark_templates').select('*').is('organization_id', null).eq('instructor_id', user.id)
    remarkTemplates = data ?? []
  }

  const showPrincipalRemark = orgFull?.report_card_settings?.show_class_teacher_comment ?? false

  const group = report.group as { id: string; name: string; code?: string } | null
  const data = report.report_data ?? {}
  const learners = data.learners ?? []
  const subjects = data.subjects ?? []

  const statusBadge: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    submitted: 'bg-amber-100 text-amber-800',
    published: 'bg-green-100 text-green-800',
    archived: 'bg-surface-200 text-ink-faint',
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
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
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusBadge[report.report_status] ?? statusBadge.draft}`}>
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
            teacherName={reportCreator?.name}
            teacherSignature={reportCreator?.signature_url}
            principalName={orgFull?.principal_name}
            principalTitle={orgFull?.principal_title}
            principalSignature={orgFull?.principal_signature_url}
            studentRemarks={report.student_remarks ?? {}}
            generatedDate={report.completed_at ?? report.created_at}
            isInstitution={!!profile?.organization_id}
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
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-100 border-b border-surface-200">
                  <th className="text-left px-3 py-2.5 font-semibold text-ink-muted uppercase sticky left-0 bg-surface-100 z-10">#</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-ink-muted uppercase min-w-[140px] sticky left-8 bg-surface-100 z-10">Student</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-ink-muted uppercase sticky left-[7.5rem] bg-surface-100 z-10">Adm. No</th>
                  {subjects.map((s: any) => (
                    <th key={s.id} className="px-3 py-2.5 font-semibold text-ink-muted uppercase text-center whitespace-nowrap">{s.name}</th>
                  ))}
                  <th className="px-3 py-2.5 font-semibold text-ink-muted uppercase text-center">Total</th>
                  <th className="px-3 py-2.5 font-semibold text-ink-muted uppercase text-center">%</th>
                  <th className="px-3 py-2.5 font-semibold text-ink-muted uppercase text-center">Grade</th>
                  <th className="px-3 py-2.5 font-semibold text-ink-muted uppercase text-center">Pos.</th>
                </tr>
              </thead>
              <tbody>
                {learners.map((row: any, i: number) => (
                  <tr key={row.learner_id} className={i % 2 === 0 ? 'bg-white border-b border-surface-100' : 'bg-surface-50/50 border-b border-surface-100'}>
                    <td className="px-3 py-2 text-ink-muted sticky left-0 bg-inherit z-10">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-ink whitespace-nowrap sticky left-8 bg-inherit z-10">{row.last_name} {row.first_name}</td>
                    <td className="px-3 py-2 font-mono text-ink-muted sticky left-[7.5rem] bg-inherit z-10">{row.admission_number ?? '—'}</td>
                    {subjects.map((s: any) => (
                      <td key={s.id} className="px-3 py-2 text-center font-mono">{row.subject_totals?.[s.id] ?? '—'}</td>
                    ))}
                    <td className="px-3 py-2 text-center font-bold font-mono">{row.overall_total}</td>
                    <td className="px-3 py-2 text-center font-mono text-ink-muted">{row.percentage}%</td>
                    <td className="px-3 py-2 text-center font-bold">{row.grade}</td>
                    <td className="px-3 py-2 text-center font-bold">{row.position}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card py-12 text-center text-ink-muted text-sm">No report data available.</div>
      )}

      {canEditRemarks && learners.length > 0 && (
        <RemarksEditor
          reportId={id}
          learners={learners.map((l: any) => ({
            learner_id: l.learner_id, first_name: l.first_name, last_name: l.last_name,
            percentage: l.percentage, grade: l.grade,
          }))}
          templates={remarkTemplates}
          initialRemarks={report.student_remarks ?? {}}
          showPrincipalRemark={showPrincipalRemark}
        />
      )}
    </div>
  )
}
