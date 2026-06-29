import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, FileSpreadsheet, FileText } from 'lucide-react'
import { downloadReport } from '../actions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ReportViewPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: report } = await supabase
    .from('reports')
    .select(`
      *,
      group:groups(name, code),
      term:terms(name),
      template:assessment_templates(name)
    `)
    .eq('id', id)
    .single()

  if (!report) notFound()

  const reportData = report.report_data as {
    learners: any[]
    subjects: any[]
    scores: any[]
    generated_at: string
  } | null

  if (!reportData) {
    return (
      <div className="flex flex-col gap-6">
        <div className="card py-12 text-center">
          <p className="text-ink-muted">Report data not found</p>
        </div>
      </div>
    )
  }

  // Calculate totals, averages, grades, positions
  const processedData = processReportData(reportData)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/reports" className="text-ink-muted hover:text-ink flex items-center gap-1">
              <ArrowLeft size={13} /> Reports
            </Link>
            <span className="text-ink-faint">/</span>
            <span className="text-ink font-medium">{report.group?.name}</span>
          </div>
          <h1 className="page-title mt-2">{report.group?.name} - {report.term?.name}</h1>
          <p className="page-subtitle">
            Generated: {new Date(report.created_at).toLocaleDateString('en-NG')}
            {report.template?.name && ` • Template: ${report.template.name}`}
          </p>
        </div>
        <div className="flex gap-2">
          <form action={downloadReport}>
            <input type="hidden" name="id" value={report.id} />
            <input type="hidden" name="format" value="csv" />
            <button type="submit" className="btn-secondary btn-sm btn">
              <FileText size={14} /> CSV
            </button>
          </form>
          <form action={downloadReport}>
            <input type="hidden" name="id" value={report.id} />
            <input type="hidden" name="format" value="xls" />
            <button type="submit" className="btn-secondary btn-sm btn">
              <FileSpreadsheet size={14} /> XLS
            </button>
          </form>
          <form action={downloadReport}>
            <input type="hidden" name="id" value={report.id} />
            <input type="hidden" name="format" value="pdf" />
            <button type="submit" className="btn-primary btn-sm btn">
              <Download size={14} /> PDF
            </button>
          </form>
        </div>
      </div>

      {/* Report Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">Student</th>
                {reportData.subjects.map((s: any) => (
                  <th key={s.id} className="px-3 py-3 text-center text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    {s.name}
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-xs font-semibold text-ink-muted uppercase tracking-wider">Total</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-ink-muted uppercase tracking-wider">Average</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-ink-muted uppercase tracking-wider">Grade</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-ink-muted uppercase tracking-wider">Position</th>
              </tr>
            </thead>
            <tbody>
              {processedData.map((row: any, i: number) => (
                <tr key={row.learnerId} className="border-b border-surface-200 hover:bg-surface-50/50">
                  <td className="px-4 py-2 text-xs text-ink-muted">{i + 1}</td>
                  <td className="px-4 py-2">
                    <div className="font-medium text-ink text-sm">{row.studentName}</div>
                    {row.admissionNumber && (
                      <div className="text-[11px] text-ink-faint font-mono">{row.admissionNumber}</div>
                    )}
                  </td>
                  {reportData.subjects.map((s: any) => (
                    <td key={s.id} className="px-3 py-2 text-center font-mono text-sm">
                      {row.subjectScores[s.id] ?? '-'}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center font-semibold font-mono text-sm">{row.total}</td>
                  <td className="px-3 py-2 text-center font-mono text-sm">{row.average}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      row.grade === 'A' ? 'bg-green-100 text-green-700' :
                      row.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                      row.grade === 'C' ? 'bg-amber-100 text-amber-700' :
                      row.grade === 'D' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {row.grade}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center font-semibold text-sm">
                    {row.position}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Helper function to process report data
function processReportData(data: any) {
  const learners = data.learners || []
  const subjects = data.subjects || []
  const scores = data.scores || []

  const processed = learners.map((learner: any) => {
    const learnerScores = scores.filter((s: any) => s.learner_id === learner.id)
    const subjectScores: Record<string, number> = {}
    let total = 0

    subjects.forEach((subject: any) => {
      const subjectScore = learnerScores
        .filter((s: any) => s.subject_id === subject.id)
        .reduce((sum: number, s: any) => sum + (s.score || 0), 0)
      subjectScores[subject.id] = subjectScore
      total += subjectScore
    })

    const avg = subjects.length > 0 ? (total / subjects.length) : 0
    const grade = avg >= 70 ? 'A' : avg >= 60 ? 'B' : avg >= 50 ? 'C' : avg >= 40 ? 'D' : 'F'

    return {
      learnerId: learner.id,
      studentName: `${learner.last_name} ${learner.first_name}`,
      admissionNumber: learner.admission_number,
      subjectScores,
      total,
      average: avg.toFixed(1),
      grade,
    }
  })

  // Sort by total descending and assign positions
  const sorted = [...processed].sort((a, b) => b.total - a.total)
  sorted.forEach((row, index) => {
    row.position = index + 1
  })

  // Sort back to original order
  const originalOrder = processed.map((row: any) => row.learnerId)
  return sorted.sort((a, b) => originalOrder.indexOf(a.learnerId) - originalOrder.indexOf(b.learnerId))
}