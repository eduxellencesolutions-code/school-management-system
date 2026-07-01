import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ReportDownloadButtons from '@/components/reports/ReportDownloadButtons'
import DeleteReportButton from '@/components/reports/DeleteReportButton'

interface Props { params: Promise<{ id: string }> }

export default async function ReportDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: report, error } = await supabase
    .from('reports')
    .select('*, group:groups(id, name, code), term:terms(id, name)')
    .eq('id', id)
    .single()

  if (error || !report) notFound()

  const group   = report.group   as { id: string; name: string; code?: string } | null
  const term    = report.term    as { id: string; name: string } | null
  const data    = report.report_data ?? {}
  const learners  = data.learners  ?? []
  const subjects  = data.subjects  ?? []

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/reports" className="text-ink-muted hover:text-ink flex items-center gap-1">
          <ArrowLeft size={13} /> Reports
        </Link>
        <span className="text-ink-faint">/</span>
        <span className="text-ink font-medium">{group?.name} — {term?.name ?? 'Report'}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">{group?.name}</h1>
          <p className="page-subtitle">
            {term?.name ?? ''} · {learners.length} students · {subjects.length} subjects ·
            Generated {new Date(report.completed_at ?? report.created_at).toLocaleDateString('en-NG')}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Client component handles all downloads */}
          <ReportDownloadButtons
            reportId={id}
            groupName={group?.name ?? 'Report'}
            termName={term?.name ?? ''}
            learners={learners}
            subjects={subjects}
          />
          <DeleteReportButton 
            reportId={id} 
            reportName={group?.name || 'Report'} 
          />
        </div>
      </div>

      {/* Broadsheet table */}
      {learners.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 bg-surface-50 border-b border-surface-200 text-center">
            <p className="font-bold text-ink">{group?.name}</p>
            {term?.name && <p className="text-xs text-ink-muted">{term.name} — Result Broadsheet</p>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-100 border-b border-surface-200">
                  <th className="text-left px-3 py-2.5 font-semibold text-ink-muted uppercase">#</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-ink-muted uppercase min-w-[140px]">Student</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-ink-muted uppercase">Adm. No</th>
                  {subjects.map((s: any) => (
                    <th key={s.id} className="px-3 py-2.5 font-semibold text-ink-muted uppercase text-center whitespace-nowrap">
                      {s.name}
                    </th>
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
                    <td className="px-3 py-2 text-ink-muted">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-ink whitespace-nowrap">{row.last_name} {row.first_name}</td>
                    <td className="px-3 py-2 font-mono text-ink-muted">{row.admission_number ?? '—'}</td>
                    {subjects.map((s: any) => (
                      <td key={s.id} className="px-3 py-2 text-center font-mono">
                        {row.subject_totals?.[s.id] ?? '—'}
                      </td>
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
        <div className="card py-12 text-center text-ink-muted text-sm">
          No report data available.
        </div>
      )}
    </div>
  )
}
