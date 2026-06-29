import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, FileSpreadsheet, FileText, Printer } from 'lucide-react'
import { downloadReport } from '../actions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ReportViewPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: report, error } = await supabase
    .from('reports')
    .select(`
      *,
      group:groups(id, name, code),
      term:terms(id, name),
      template:assessment_templates(id, name)
    `)
    .eq('id', id)
    .single()

  if (error || !report) {
    console.error('Report fetch error:', error)
    notFound()
  }

  // Handle different report data structures
  let reportData = report.report_data as {
    learners?: any[]
    subjects?: any[]
    scores?: any[]
    components?: any[]
    generated_at?: string
    summary?: any
  } | null

  // If report_data is null or empty, try to build it from the report
  if (!reportData || !reportData.learners) {
    // Check if the report has the new structure with nested data
    if (report.report_data?.learners) {
      reportData = report.report_data
    } else {
      // Try to fetch the data directly
      const { data: learners } = await supabase
        .from('learners')
        .select('id, first_name, last_name, admission_number')
        .eq('group_id', report.group_id)
        .eq('is_active', true)
        .order('last_name')

      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name, code')
        .eq('group_id', report.group_id)
        .eq('is_active', true)
        .order('name')

      const { data: scores } = await supabase
        .from('scores')
        .select('learner_id, subject_id, component_id, score')
        .in('learner_id', learners?.map((l: any) => l.id) || [])

      reportData = {
        learners: learners || [],
        subjects: subjects || [],
        scores: scores || [],
        generated_at: new Date().toISOString(),
      }
    }
  }

  if (!reportData || !reportData.learners || reportData.learners.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/reports" className="text-ink-muted hover:text-ink flex items-center gap-1">
            <ArrowLeft size={13} /> Reports
          </Link>
          <span className="text-ink-faint">/</span>
          <span className="text-ink font-medium">Report</span>
        </div>
        <div className="card py-16 text-center">
          <p className="text-ink-muted">No data available for this report.</p>
          <Link href="/reports" className="btn-primary btn-sm btn mt-4">
            Back to Reports
          </Link>
        </div>
      </div>
    )
  }

  // Process the report data
  const processedData = processReportData(reportData)

  // Calculate summary statistics
  const summary = {
    totalStudents: processedData.length,
    totalSubjects: reportData.subjects?.length || 0,
    averageScore: processedData.length > 0
      ? (processedData.reduce((sum: number, row: any) => sum + parseFloat(row.average), 0) / processedData.length).toFixed(1)
      : '0',
    highestScore: processedData.length > 0
      ? Math.max(...processedData.map((row: any) => parseFloat(row.average)))
      : 0,
    lowestScore: processedData.length > 0
      ? Math.min(...processedData.map((row: any) => parseFloat(row.average)))
      : 0,
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/reports" className="text-ink-muted hover:text-ink flex items-center gap-1">
              <ArrowLeft size={13} /> Reports
            </Link>
            <span className="text-ink-faint">/</span>
            <span className="text-ink font-medium">{report.group?.name || 'Report'}</span>
          </div>
          <h1 className="page-title mt-2">
            {report.group?.name || 'Report'} - {report.term?.name || 'Current Term'}
          </h1>
          <p className="page-subtitle">
            Generated: {report.completed_at ? new Date(report.completed_at).toLocaleDateString('en-NG') : new Date(report.created_at).toLocaleDateString('en-NG')}
            {report.template?.name && ` • Template: ${report.template.name}`}
            {report.type && ` • Type: ${report.type.replace('_', ' ').toUpperCase()}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
          <button 
            onClick={() => window.print()} 
            className="btn-secondary btn-sm btn"
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-value">{summary.totalStudents}</div>
          <div className="stat-label">Students</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary.totalSubjects}</div>
          <div className="stat-label">Subjects</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary.averageScore}%</div>
          <div className="stat-label">Class Average</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary.highestScore}%</div>
          <div className="stat-label">Highest Score</div>
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
                {reportData.subjects?.map((s: any) => (
                  <th key={s.id} className="px-3 py-3 text-center text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    {s.name}
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-xs font-semibold text-ink-muted uppercase tracking-wider">Total</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-ink-muted uppercase tracking-wider">Avg</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-ink-muted uppercase tracking-wider">%</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-ink-muted uppercase tracking-wider">Grade</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-ink-muted uppercase tracking-wider">Position</th>
              </tr>
            </thead>
            <tbody>
              {processedData.map((row: any, i: number) => (
                <tr key={row.learnerId} className="border-b border-surface-200 hover:bg-surface-50/50 transition-colors">
                  <td className="px-4 py-2 text-xs text-ink-muted">{i + 1}</td>
                  <td className="px-4 py-2">
                    <div className="font-medium text-ink text-sm">{row.studentName}</div>
                    {row.admissionNumber && (
                      <div className="text-[11px] text-ink-faint font-mono">{row.admissionNumber}</div>
                    )}
                  </td>
                  {reportData.subjects?.map((s: any) => (
                    <td key={s.id} className="px-3 py-2 text-center font-mono text-sm">
                      {row.subjectScores[s.id] ?? '-'}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center font-semibold font-mono text-sm">{row.total}</td>
                  <td className="px-3 py-2 text-center font-mono text-sm">{row.average}</td>
                  <td className="px-3 py-2 text-center font-mono text-sm">{row.percentage}%</td>
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
            <tfoot>
              <tr className="bg-surface-50 border-t-2 border-surface-200">
                <td colSpan={2} className="px-4 py-2 text-xs font-semibold text-ink-muted">
                  Averages
                </td>
                {reportData.subjects?.map((s: any) => {
                  const vals = processedData
                    .map((row: any) => row.subjectScores[s.id])
                    .filter((v: any) => v !== undefined && v !== null)
                  const avg = vals.length > 0 ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : 0
                  return (
                    <td key={s.id} className="px-3 py-2 text-center text-xs font-semibold text-ink font-mono">
                      {avg > 0 ? avg.toFixed(1) : '-'}
                    </td>
                  )
                })}
                <td className="px-3 py-2 text-center text-xs font-semibold text-ink font-mono">
                  {summary.averageScore}%
                </td>
                <td colSpan={3} className="px-3 py-2" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs text-ink-faint text-center border-t border-surface-200 pt-4">
        Report generated on {new Date().toLocaleString('en-NG')}
        {report.created_by && ` • Generated by: ${report.created_by}`}
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

    // Calculate max possible score
    const maxPossible = subjects.length > 0 ? subjects.length * 100 : 1
    const avg = subjects.length > 0 ? (total / subjects.length) : 0
    const percentage = maxPossible > 0 ? (total / maxPossible) * 100 : 0

    let grade = 'F'
    if (percentage >= 70) grade = 'A'
    else if (percentage >= 60) grade = 'B'
    else if (percentage >= 50) grade = 'C'
    else if (percentage >= 40) grade = 'D'

    return {
      learnerId: learner.id,
      studentName: `${learner.last_name} ${learner.first_name}`,
      admissionNumber: learner.admission_number,
      subjectScores,
      total,
      average: avg.toFixed(1),
      percentage: Math.round(percentage * 10) / 10,
      grade,
    }
  })

  // Sort by total descending and assign positions
  const sorted = [...processed].sort((a, b) => b.total - a.total)
  sorted.forEach((row, index) => {
    // Handle ties
    if (index > 0 && row.total === sorted[index - 1].total) {
      row.position = sorted[index - 1].position
    } else {
      row.position = index + 1
    }
  })

  // Sort back to original order
  const originalOrder = processed.map((row: any) => row.learnerId)
  return sorted.sort((a, b) => originalOrder.indexOf(a.learnerId) - originalOrder.indexOf(b.learnerId))
}
