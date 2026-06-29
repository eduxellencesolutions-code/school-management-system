'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { Download, FileText, Loader2, Eye, X } from 'lucide-react'
import { cn, DEFAULT_GRADING } from '@/lib/utils'
import type { Organization } from '@/types'

interface Group { id: string; name: string; code?: string; session?: { name: string } | null; term?: { name: string } | null }
interface Props { groups: Group[]; org: Organization | null; userId: string }

type ReportType = 'broadsheet' | 'class_summary'

interface BroadsheetData {
  group: Group
  learners: { id: string; first_name: string; last_name: string; admission_number?: string }[]
  subjects: { id: string; name: string }[]
  scoreLookup: Record<string, Record<string, number>>
  rows: {
    learner: { id: string; first_name: string; last_name: string; admission_number?: string }
    subjectTotals: (number | null)[]
    grandTotal: number
    pct: number
    grade: string
    position: number
  }[]
  classAvg: number
}

export default function ReportGenerator({ groups, org, userId }: Props) {
  const supabase = createClient()
  const [groupId, setGroupId] = useState('')
  const [reportType, setReportType] = useState<ReportType>('broadsheet')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<BroadsheetData | null>(null)

  async function fetchData(): Promise<BroadsheetData | null> {
    const { data: learners } = await supabase
      .from('learners')
      .select('id, first_name, last_name, admission_number')
      .eq('group_id', groupId)
      .eq('is_active', true)
      .order('last_name')

    if (!learners?.length) { toast.error('No students in this class'); return null }

    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('group_id', groupId)
      .eq('is_active', true)
      .order('name')

    if (!subjects?.length) { toast.error('No subjects in this class'); return null }

    const { data: scores } = await supabase
      .from('scores')
      .select('learner_id, subject_id, score')
      .in('learner_id', learners.map(l => l.id))
      .in('subject_id', subjects.map(s => s.id))

    // Build score lookup: learner_id → subject_id → total score
    const scoreLookup: Record<string, Record<string, number>> = {}
    for (const s of scores ?? []) {
      if (!scoreLookup[s.learner_id]) scoreLookup[s.learner_id] = {}
      scoreLookup[s.learner_id][s.subject_id] =
        (scoreLookup[s.learner_id][s.subject_id] ?? 0) + (s.score ?? 0)
    }

    // Build rows
    const rawRows = learners.map(l => {
      const subjectTotals = subjects.map(s => scoreLookup[l.id]?.[s.id] ?? null)
      const grandTotal = subjectTotals.reduce((sum, t) => sum + (t ?? 0), 0)
      const entered = subjectTotals.filter(t => t !== null).length
      const pct = entered > 0 ? (grandTotal / (entered * 100)) * 100 : 0
      const gradeObj = DEFAULT_GRADING.find(g => pct >= g.min_score && pct <= g.max_score)
      return { learner: l, subjectTotals, grandTotal, pct, grade: gradeObj?.grade_letter ?? '-', position: 0 }
    })

    // Assign positions
    const sorted = [...rawRows].sort((a, b) => b.grandTotal - a.grandTotal)
    rawRows.forEach(r => {
      r.position = sorted.findIndex(x => x.grandTotal === r.grandTotal) + 1
    })

    const totals = rawRows.map(r => r.grandTotal).filter(t => t > 0)
    const classAvg = totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : 0
    const group = groups.find(g => g.id === groupId)!

    return { group, learners, subjects, scoreLookup, rows: rawRows, classAvg }
  }

  async function handlePreview() {
    if (!groupId) { toast.error('Select a class first'); return }
    setLoading(true)
    try {
      const data = await fetchData()
      if (data) setPreview(data)
    } catch (err) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload() {
    if (!preview) return
    setLoading(true)

    const { data: profile } = await supabase
      .from('users').select('organization_id').eq('id', userId).single()

    const { data: reportRecord } = await supabase
      .from('reports')
      .insert({
        organization_id: profile?.organization_id,
        group_id: groupId,
        type: reportType,
        status: 'pending',
        filters: {},
        created_by: userId,
      })
      .select('id')
      .single()

    try {
      if (reportType === 'broadsheet') {
        downloadBroadsheetExcel(preview, org)
      } else {
        downloadSummaryExcel(preview)
      }

      if (reportRecord?.id) {
        await supabase.from('reports').update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        }).eq('id', reportRecord.id)
      }

      toast.success('Report downloaded!')
    } catch (err) {
      if (reportRecord?.id) {
        await supabase.from('reports').update({ status: 'failed' }).eq('id', reportRecord.id)
      }
      toast.error('Download failed')
    } finally {
      setLoading(false)
    }
  }

  const group = groups.find(g => g.id === groupId)

  return (
    <div className="flex flex-col gap-6">
      {/* Controls */}
      <div className="card p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">Class</label>
            <select className="input" value={groupId} onChange={e => { setGroupId(e.target.value); setPreview(null) }}>
              <option value="">Select class…</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}{g.code ? ` (${g.code})` : ''}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">Report type</label>
            <select className="input" value={reportType} onChange={e => { setReportType(e.target.value as ReportType); setPreview(null) }}>
              <option value="broadsheet">Class Broadsheet</option>
              <option value="class_summary">Class Summary</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handlePreview}
              disabled={loading || !groupId}
              className="btn-secondary btn disabled:opacity-50"
            >
              {loading && !preview
                ? <><Loader2 size={14} className="animate-spin" /> Loading…</>
                : <><Eye size={14} /> Preview</>
              }
            </button>
            {preview && (
              <button
                onClick={handleDownload}
                disabled={loading}
                className="btn-primary btn disabled:opacity-50"
              >
                {loading
                  ? <><Loader2 size={14} className="animate-spin" /> Downloading…</>
                  : <><Download size={14} /> Download Excel</>
                }
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Preview */}
      {preview ? (
        <div className="card overflow-hidden">
          {/* Preview header */}
          <div className="card-header flex items-center justify-between bg-surface-50">
            <div>
              <p className="font-semibold text-ink text-sm">{preview.group.name} — Broadsheet Preview</p>
              <p className="text-xs text-ink-muted">
                {preview.learners.length} students · {preview.subjects.length} subjects · Class avg: {preview.classAvg.toFixed(1)}
              </p>
            </div>
            <button onClick={() => setPreview(null)} className="p-1.5 rounded hover:bg-surface-200 text-ink-muted">
              <X size={15} />
            </button>
          </div>

          {/* School header */}
          <div className="px-6 py-4 text-center border-b border-surface-200">
            <p className="font-bold text-ink text-base">{org?.name ?? 'School Name'}</p>
            {org?.motto && <p className="text-xs text-ink-muted italic">{org.motto}</p>}
            <p className="text-sm font-semibold text-ink mt-1">
              {preview.group.name}
              {preview.group.term?.name ? ` — ${preview.group.term.name}` : ''}
              {preview.group.session?.name ? ` ${preview.group.session.name}` : ''}
            </p>
            <p className="text-xs text-ink-muted">RESULT BROADSHEET</p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-100 border-b border-surface-200">
                  <th className="text-left px-3 py-2.5 font-semibold text-ink-muted uppercase tracking-wider whitespace-nowrap">#</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-ink-muted uppercase tracking-wider whitespace-nowrap">Adm. No</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-ink-muted uppercase tracking-wider whitespace-nowrap min-w-[140px]">Student Name</th>
                  {preview.subjects.map(s => (
                    <th key={s.id} className="px-3 py-2.5 font-semibold text-ink-muted uppercase tracking-wider text-center whitespace-nowrap">
                      {s.name}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 font-semibold text-ink-muted uppercase tracking-wider text-center whitespace-nowrap">Total</th>
                  <th className="px-3 py-2.5 font-semibold text-ink-muted uppercase tracking-wider text-center whitespace-nowrap">%</th>
                  <th className="px-3 py-2.5 font-semibold text-ink-muted uppercase tracking-wider text-center whitespace-nowrap">Grade</th>
                  <th className="px-3 py-2.5 font-semibold text-ink-muted uppercase tracking-wider text-center whitespace-nowrap">Pos.</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={row.learner.id} className={cn(
                    'border-b border-surface-200',
                    i % 2 === 0 ? 'bg-white' : 'bg-surface-50/50'
                  )}>
                    <td className="px-3 py-2 text-ink-muted">{i + 1}</td>
                    <td className="px-3 py-2 font-mono text-ink-muted">{row.learner.admission_number ?? '—'}</td>
                    <td className="px-3 py-2 font-medium text-ink whitespace-nowrap">
                      {row.learner.last_name} {row.learner.first_name}
                    </td>
                    {row.subjectTotals.map((t, j) => (
                      <td key={j} className="px-3 py-2 text-center font-mono">
                        {t !== null ? (
                          <span className={cn(
                            t >= 70 ? 'text-green-700' :
                            t >= 50 ? 'text-amber-700' :
                            t >= 40 ? 'text-orange-600' : 'text-red-600'
                          )}>
                            {t}
                          </span>
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-semibold font-mono text-ink">{row.grandTotal}</td>
                    <td className="px-3 py-2 text-center font-mono text-ink-muted">{row.pct.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-center">
                      <span className={cn(
                        'font-bold',
                        row.grade === 'A' ? 'text-green-600' :
                        row.grade === 'B' ? 'text-blue-600' :
                        row.grade === 'C' ? 'text-amber-600' :
                        row.grade === 'D' ? 'text-orange-600' : 'text-red-600'
                      )}>
                        {row.grade}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center font-semibold text-ink">{row.position}</td>
                  </tr>
                ))}
              </tbody>
              {/* Class average footer */}
              <tfoot>
                <tr className="bg-surface-100 border-t-2 border-surface-200 font-semibold">
                  <td colSpan={3} className="px-3 py-2 text-xs text-ink-muted uppercase">Class Average</td>
                  {preview.subjects.map(s => {
                    const vals = preview.rows
                      .map(r => r.subjectTotals[preview.subjects.indexOf(s)])
                      .filter((v): v is number => v !== null)
                    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
                    return (
                      <td key={s.id} className="px-3 py-2 text-center font-mono text-ink">
                        {avg !== null ? avg.toFixed(1) : '—'}
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 text-center font-mono text-ink">{preview.classAvg.toFixed(1)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Download bar */}
          <div className="px-5 py-3 bg-surface-50 border-t border-surface-200 flex items-center justify-between">
            <p className="text-xs text-ink-muted">
              Preview looks correct? Download the Excel file below.
            </p>
            <button
              onClick={handleDownload}
              disabled={loading}
              className="btn-primary btn-sm btn"
            >
              {loading
                ? <><Loader2 size={12} className="animate-spin" /> Downloading…</>
                : <><Download size={12} /> Download Excel</>
              }
            </button>
          </div>
        </div>
      ) : (
        <div className="card p-12 flex flex-col items-center text-center">
          <FileText size={40} className="text-surface-200 mb-4" />
          <p className="text-sm font-medium text-ink mb-1">No preview yet</p>
          <p className="text-xs text-ink-muted max-w-xs">
            Select a class and report type above, then click Preview to see the broadsheet before downloading.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Excel download functions ──────────────────────────────────────────────────

function downloadBroadsheetExcel(data: BroadsheetData, org: Organization | null) {
  const { group, subjects, rows } = data
  const wb = XLSX.utils.book_new()

  const titleRows: unknown[][] = [
    [org?.name ?? 'School Name'],
    [org?.motto ?? ''],
    [`${group.name} — ${group.term?.name ?? ''} ${group.session?.name ?? ''}`.trim()],
    ['RESULT BROADSHEET'],
    [],
    ['#', 'Adm. No', 'Student Name', ...subjects.map(s => s.name), 'Total', '%', 'Grade', 'Position'],
  ]

  const dataRows = rows.map((r, i) => [
    i + 1,
    r.learner.admission_number ?? '',
    `${r.learner.last_name} ${r.learner.first_name}`,
    ...r.subjectTotals.map(t => t ?? ''),
    r.grandTotal,
    `${r.pct.toFixed(1)}%`,
    r.grade,
    r.position,
  ])

  const ws = XLSX.utils.aoa_to_sheet([...titleRows, ...dataRows])
  ws['!cols'] = [
    { wch: 4 }, { wch: 12 }, { wch: 24 },
    ...subjects.map(() => ({ wch: 10 })),
    { wch: 8 }, { wch: 7 }, { wch: 7 }, { wch: 9 },
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Broadsheet')
  XLSX.writeFile(wb, `${group.name}_Broadsheet.xlsx`)
}

function downloadSummaryExcel(data: BroadsheetData) {
  const { group, subjects, rows } = data
  const wb = XLSX.utils.book_new()

  const subjectStats = subjects.map((s, si) => {
    const vals = rows.map(r => r.subjectTotals[si]).filter((v): v is number => v !== null)
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
    return [s.name, vals.length, avg.toFixed(1), vals.length ? Math.max(...vals) : 0, vals.length ? Math.min(...vals) : 0]
  })

  const ws = XLSX.utils.aoa_to_sheet([
    [`Class Summary — ${group.name}`],
    [],
    ['Subject', 'Students Scored', 'Average', 'Highest', 'Lowest'],
    ...subjectStats,
  ])
  ws['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, ws, 'Summary')
  XLSX.writeFile(wb, `${group.name}_Summary.xlsx`)
}
