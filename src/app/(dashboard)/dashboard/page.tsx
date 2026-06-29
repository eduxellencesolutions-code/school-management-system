'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { Download, FileText, Loader2, Eye, ChevronDown, ChevronUp, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn, DEFAULT_GRADING } from '@/lib/utils'
import type { Organization } from '@/types'

interface Group {
  id: string
  name: string
  code?: string
  session?: { name: string } | null
  term?: { name: string } | null
}

interface Props {
  groups: Group[]
  org: Organization | null
  userId: string
}

interface SubjectSummary {
  id: string
  name: string
  studentCount: number
  avgScore: number
  highScore: number
  lowScore: number
  components: { name: string; max_score: number }[]
  isComplete: boolean
}

interface BroadsheetRow {
  learner: { id: string; first_name: string; last_name: string; admission_number?: string }
  subjectTotals: (number | null)[]
  grandTotal: number
  pct: number
  grade: string
  position: number
}

interface ReportData {
  group: Group
  subjects: { id: string; name: string }[]
  learners: { id: string; first_name: string; last_name: string; admission_number?: string }[]
  rows: BroadsheetRow[]
  classAvg: number
  subjectSummaries: SubjectSummary[]
}

export default function ReportGenerator({ groups, org, userId }: Props) {
  const supabase = createClient()
  const [groupId, setGroupId] = useState('')
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [step, setStep] = useState<'select' | 'review' | 'preview'>('select')

  async function loadScoreSummary() {
    if (!groupId) { toast.error('Select a class first'); return }
    setLoading(true)
    setShowPreview(false)

    try {
      // Fetch learners
      const { data: learners } = await supabase
        .from('learners')
        .select('id, first_name, last_name, admission_number')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .order('last_name')

      if (!learners?.length) { toast.error('No students in this class'); setLoading(false); return }

      // Fetch subjects
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name, template_id')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .order('name')

      if (!subjects?.length) { toast.error('No subjects in this class'); setLoading(false); return }

      // Fetch components for all templates
      const templateIds = [...new Set(subjects.map(s => s.template_id).filter(Boolean))]
      const { data: components } = templateIds.length > 0
        ? await supabase
            .from('assessment_components')
            .select('id, name, max_score, template_id')
            .in('template_id', templateIds)
        : { data: [] }

      // Fetch all scores
      const { data: scores } = await supabase
        .from('scores')
        .select('learner_id, subject_id, component_id, score')
        .in('learner_id', learners.map(l => l.id))
        .in('subject_id', subjects.map(s => s.id))

      // Build score lookup: learner_id → subject_id → total
      const scoreLookup: Record<string, Record<string, number>> = {}
      const scoresBySubjectLearner: Record<string, Record<string, number[]>> = {}

      for (const s of scores ?? []) {
        if (!scoreLookup[s.learner_id]) scoreLookup[s.learner_id] = {}
        scoreLookup[s.learner_id][s.subject_id] =
          (scoreLookup[s.learner_id][s.subject_id] ?? 0) + (s.score ?? 0)

        if (!scoresBySubjectLearner[s.subject_id]) scoresBySubjectLearner[s.subject_id] = {}
        if (!scoresBySubjectLearner[s.subject_id][s.learner_id]) scoresBySubjectLearner[s.subject_id][s.learner_id] = []
        scoresBySubjectLearner[s.subject_id][s.learner_id].push(s.score ?? 0)
      }

      // Build subject summaries
      const subjectSummaries: SubjectSummary[] = subjects.map(s => {
        const subjectScores = learners
          .map(l => scoreLookup[l.id]?.[s.id])
          .filter((v): v is number => v !== undefined)
        const avg = subjectScores.length > 0
          ? subjectScores.reduce((a, b) => a + b, 0) / subjectScores.length : 0
        const subjectComponents = (components ?? []).filter(c => c.template_id === s.template_id)
        return {
          id: s.id,
          name: s.name,
          studentCount: subjectScores.length,
          avgScore: avg,
          highScore: subjectScores.length > 0 ? Math.max(...subjectScores) : 0,
          lowScore: subjectScores.length > 0 ? Math.min(...subjectScores) : 0,
          components: subjectComponents.map(c => ({ name: c.name, max_score: Number(c.max_score) })),
          isComplete: subjectScores.length === learners.length,
        }
      })

      // Build broadsheet rows
      const rawRows: BroadsheetRow[] = learners.map(l => {
        const subjectTotals = subjects.map(s => scoreLookup[l.id]?.[s.id] ?? null)
        const grandTotal = subjectTotals.reduce((sum, t) => sum + (t ?? 0), 0)
        const entered = subjectTotals.filter(t => t !== null).length
        const pct = entered > 0 ? (grandTotal / (entered * 100)) * 100 : 0
        const gradeObj = DEFAULT_GRADING.find(g => pct >= g.min_score && pct <= g.max_score)
        return {
          learner: l,
          subjectTotals,
          grandTotal,
          pct,
          grade: gradeObj?.grade_letter ?? '-',
          position: 0,
        }
      })

      // Assign positions
      const sorted = [...rawRows].sort((a, b) => b.grandTotal - a.grandTotal)
      rawRows.forEach(r => {
        r.position = sorted.findIndex(x => x.grandTotal === r.grandTotal) + 1
      })

      const totals = rawRows.map(r => r.grandTotal).filter(t => t > 0)
      const classAvg = totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : 0
      const group = groups.find(g => g.id === groupId)!

      setReportData({ group, subjects, learners, rows: rawRows, classAvg, subjectSummaries })
      setStep('review')
    } catch (err) {
      toast.error('Failed to load scores')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function generateReport() {
    if (!reportData) return
    setShowPreview(true)
    setStep('preview')

    // Save report record
    const { data: profile } = await supabase
      .from('users').select('organization_id').eq('id', userId).single()

    const { data: reportRecord } = await supabase
      .from('reports')
      .insert({
        organization_id: profile?.organization_id,
        group_id: groupId,
        type: 'broadsheet',
        status: 'pending',
        filters: {},
        created_by: userId,
      })
      .select('id')
      .single()

    if (reportRecord?.id) {
      await supabase.from('reports').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      }).eq('id', reportRecord.id)
    }
  }

  function downloadExcel() {
    if (!reportData) return
    const { group, subjects, rows } = reportData

    const wb = XLSX.utils.book_new()
    const titleRows: unknown[][] = [
      [org?.name ?? 'School Name'],
      [(org as any)?.motto ?? ''],
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
      ...subjects.map(() => ({ wch: 12 })),
      { wch: 8 }, { wch: 7 }, { wch: 7 }, { wch: 9 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, 'Broadsheet')
    XLSX.writeFile(wb, `${group.name}_Broadsheet.xlsx`)
    toast.success('Excel downloaded!')
  }

  const group = groups.find(g => g.id === groupId)
  const allComplete = reportData?.subjectSummaries.every(s => s.isComplete)
  const incompleteCount = reportData?.subjectSummaries.filter(s => !s.isComplete).length ?? 0

  return (
    <div className="flex flex-col gap-6">

      {/* ── STEP 1: Select class ── */}
      <div className="card p-5">
        <h2 className="font-semibold text-sm text-ink mb-3">Step 1 — Select a class</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1 max-w-xs">
            <select
              className="input"
              value={groupId}
              onChange={e => { setGroupId(e.target.value); setReportData(null); setStep('select') }}
            >
              <option value="">Select class…</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}{g.code ? ` (${g.code})` : ''}</option>
              ))}
            </select>
          </div>
          <button
            onClick={loadScoreSummary}
            disabled={loading || !groupId}
            className="btn-secondary btn disabled:opacity-50"
          >
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> Loading…</>
              : <><Eye size={14} /> Load scores</>
            }
          </button>
        </div>
      </div>

      {/* ── STEP 2: Review scores by subject ── */}
      {reportData && step !== 'select' && (
        <div className="card overflow-hidden">
          <div className="card-header flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-sm text-ink">
                Step 2 — Review scores for {reportData.group.name}
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                {reportData.learners.length} students · {reportData.subjects.length} subjects
                {incompleteCount > 0 && (
                  <span className="text-amber-600 ml-2">· ⚠ {incompleteCount} subject{incompleteCount > 1 ? 's' : ''} incomplete</span>
                )}
              </p>
            </div>
            {allComplete && (
              <span className="badge badge-green flex items-center gap-1">
                <CheckCircle2 size={11} /> All scores complete
              </span>
            )}
          </div>

          {/* Subject summary cards */}
          <div className="divide-y divide-surface-200">
            {reportData.subjectSummaries.map(s => (
              <div key={s.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded text-xs font-bold flex items-center justify-center shrink-0',
                      s.isComplete ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                    )}>
                      {s.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-ink">{s.name}</p>
                        {s.isComplete
                          ? <CheckCircle2 size={13} className="text-green-500" />
                          : <AlertCircle size={13} className="text-amber-500" />
                        }
                      </div>
                      <p className="text-xs text-ink-muted">
                        {s.studentCount}/{reportData.learners.length} students scored
                        {s.components.length > 0 && (
                          <span className="ml-2 text-ink-faint">
                            · {s.components.map(c => `${c.name}(${c.max_score})`).join(', ')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-right shrink-0">
                    <div>
                      <p className="text-xs text-ink-muted">Avg</p>
                      <p className="text-sm font-semibold font-mono text-ink">{s.avgScore.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-muted">High</p>
                      <p className="text-sm font-semibold font-mono text-green-600">{s.highScore}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-muted">Low</p>
                      <p className="text-sm font-semibold font-mono text-red-500">{s.lowScore}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Generate button */}
          <div className="px-5 py-4 bg-surface-50 border-t border-surface-200 flex items-center justify-between">
            {incompleteCount > 0 && (
              <p className="text-xs text-amber-700">
                ⚠ {incompleteCount} subject{incompleteCount > 1 ? 's have' : ' has'} missing scores. You can still generate.
              </p>
            )}
            {allComplete && (
              <p className="text-xs text-green-700">All scores entered. Ready to generate report.</p>
            )}
            <button
              onClick={generateReport}
              className="btn-primary btn ml-auto"
            >
              <FileText size={14} /> Generate Report
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Preview & Export ── */}
      {showPreview && reportData && (
        <div className="card overflow-hidden">
          <div className="card-header flex items-center justify-between bg-surface-50">
            <div>
              <h2 className="font-semibold text-sm text-ink">
                Step 3 — Preview & Export
              </h2>
              <p className="text-xs text-ink-muted">
                {reportData.group.name} · {reportData.learners.length} students · Class avg: {reportData.classAvg.toFixed(1)}
              </p>
            </div>
            <button
              onClick={downloadExcel}
              className="btn-primary btn-sm btn"
            >
              <Download size={13} /> Download Excel
            </button>
          </div>

          {/* School header */}
          <div className="px-6 py-4 text-center border-b border-surface-200">
            <p className="font-bold text-ink text-base">{org?.name ?? 'School Name'}</p>
            {(org as any)?.motto && (
              <p className="text-xs text-ink-muted italic">{(org as any).motto}</p>
            )}
            <p className="text-sm font-semibold text-ink mt-1">
              {reportData.group.name}
              {reportData.group.term?.name ? ` — ${reportData.group.term.name}` : ''}
              {reportData.group.session?.name ? ` ${reportData.group.session.name}` : ''}
            </p>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mt-0.5">
              Result Broadsheet
            </p>
          </div>

          {/* Broadsheet table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-100 border-b border-surface-200">
                  <th className="text-left px-3 py-2.5 font-semibold text-ink-muted uppercase tracking-wider">#</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-ink-muted uppercase tracking-wider">Adm. No</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-ink-muted uppercase tracking-wider min-w-[140px]">Student Name</th>
                  {reportData.subjects.map(s => (
                    <th key={s.id} className="px-3 py-2.5 font-semibold text-ink-muted uppercase tracking-wider text-center whitespace-nowrap">
                      {s.name}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 font-semibold text-ink-muted uppercase tracking-wider text-center">Total</th>
                  <th className="px-3 py-2.5 font-semibold text-ink-muted uppercase tracking-wider text-center">%</th>
                  <th className="px-3 py-2.5 font-semibold text-ink-muted uppercase tracking-wider text-center">Grade</th>
                  <th className="px-3 py-2.5 font-semibold text-ink-muted uppercase tracking-wider text-center">Pos.</th>
                </tr>
              </thead>
              <tbody>
                {reportData.rows.map((row, i) => (
                  <tr key={row.learner.id} className={cn(
                    'border-b border-surface-200',
                    i % 2 === 0 ? 'bg-white' : 'bg-surface-50/50'
                  )}>
                    <td className="px-3 py-2.5 text-ink-muted">{i + 1}</td>
                    <td className="px-3 py-2.5 font-mono text-ink-muted">{row.learner.admission_number ?? '—'}</td>
                    <td className="px-3 py-2.5 font-medium text-ink whitespace-nowrap">
                      {row.learner.last_name} {row.learner.first_name}
                    </td>
                    {row.subjectTotals.map((t, j) => (
                      <td key={j} className="px-3 py-2.5 text-center font-mono">
                        {t !== null ? (
                          <span className={cn(
                            'font-semibold',
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
                    <td className="px-3 py-2.5 text-center font-bold font-mono text-ink">{row.grandTotal}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-ink-muted">{row.pct.toFixed(1)}%</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={cn(
                        'font-bold text-sm',
                        row.grade === 'A' ? 'text-green-600' :
                        row.grade === 'B' ? 'text-blue-600' :
                        row.grade === 'C' ? 'text-amber-600' :
                        row.grade === 'D' ? 'text-orange-600' : 'text-red-600'
                      )}>
                        {row.grade}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-ink">{row.position}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-100 border-t-2 border-surface-300 font-semibold">
                  <td colSpan={3} className="px-3 py-2.5 text-xs text-ink-muted uppercase tracking-wider">
                    Class Average
                  </td>
                  {reportData.subjects.map((s, si) => {
                    const vals = reportData.rows
                      .map(r => r.subjectTotals[si])
                      .filter((v): v is number => v !== null)
                    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
                    return (
                      <td key={s.id} className="px-3 py-2.5 text-center font-mono text-ink">
                        {avg !== null ? avg.toFixed(1) : '—'}
                      </td>
                    )
                  })}
                  <td className="px-3 py-2.5 text-center font-mono text-ink">
                    {reportData.classAvg.toFixed(1)}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Bottom export bar */}
          <div className="px-5 py-3 bg-surface-50 border-t border-surface-200 flex items-center justify-between">
            <p className="text-xs text-ink-muted">
              ✓ Report generated · {reportData.learners.length} students · {reportData.subjects.length} subjects
            </p>
            <button onClick={downloadExcel} className="btn-primary btn-sm btn">
              <Download size={12} /> Download Excel
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!reportData && (
        <div className="card p-12 flex flex-col items-center text-center">
          <FileText size={40} className="text-surface-200 mb-4" />
          <p className="text-sm font-medium text-ink mb-1">No report loaded yet</p>
          <p className="text-xs text-ink-muted max-w-xs">
            Select a class above and click "Load scores" to see a summary of all entered scores before generating the report.
          </p>
        </div>
      )}
    </div>
  )
}
