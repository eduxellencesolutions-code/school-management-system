'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { Download, FileText, Loader2 } from 'lucide-react'
import { cn, DEFAULT_GRADING, calculatePercentage } from '@/lib/utils'
import type { Organization } from '@/types'

interface Group { id: string; name: string; code?: string; session?: { name: string } | null; term?: { name: string } | null }
interface Props { groups: Group[]; org: Organization | null; userId: string }

type ReportType = 'broadsheet' | 'subject_report' | 'class_summary'

export default function ReportGenerator({ groups, org, userId }: Props) {
  const supabase = createClient()
  const [groupId, setGroupId] = useState('')
  const [reportType, setReportType] = useState<ReportType>('broadsheet')
  const [loading, setLoading] = useState(false)

  async function generate() {
    if (!groupId) { toast.error('Select a class first'); return }
    setLoading(true)
    try {
      // 1. Fetch learners
      const { data: learners } = await supabase
        .from('learners')
        .select('id, first_name, last_name, admission_number')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .order('last_name')

      if (!learners?.length) { toast.error('No students in this class'); setLoading(false); return }

      // 2. Fetch subjects
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .order('name')

      if (!subjects?.length) { toast.error('No subjects in this class'); setLoading(false); return }

      // 3. Fetch all scores
      const { data: scores } = await supabase
        .from('scores')
        .select('learner_id, subject_id, component_id, score')
        .in('learner_id', learners.map(l => l.id))
        .in('subject_id', subjects.map(s => s.id))

      // 4. Fetch components per subject
      const { data: components } = await supabase
        .from('assessment_components')
        .select('id, name, max_score, template_id')

      // 5. Build score lookup
      type ScoreLookup = Record<string, Record<string, number>>
      const scoreLookup: ScoreLookup = {}
      for (const s of scores ?? []) {
        if (!scoreLookup[s.learner_id]) scoreLookup[s.learner_id] = {}
        const key = `${s.subject_id}`
        scoreLookup[s.learner_id][key] = (scoreLookup[s.learner_id][key] ?? 0) + (s.score ?? 0)
      }

      const group = groups.find(g => g.id === groupId)

      if (reportType === 'broadsheet') {
        await generateBroadsheet({ learners, subjects, scoreLookup, group, org })
      } else if (reportType === 'class_summary') {
        await generateSummary({ learners, subjects, scoreLookup, group })
      }

      toast.success('Report downloaded!')
    } catch (err) {
      toast.error('Failed to generate report')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Config panel */}
      <div className="lg:col-span-1 flex flex-col gap-4">
        <div className="card p-5 flex flex-col gap-4">
          <h2 className="font-semibold text-ink text-sm">Report settings</h2>

          <div>
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">Class</label>
            <select className="input" value={groupId} onChange={e => setGroupId(e.target.value)}>
              <option value="">Select class…</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name}{g.code ? ` (${g.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">Report type</label>
            <div className="flex flex-col gap-2">
              {REPORT_TYPES.map(rt => (
                <label
                  key={rt.value}
                  className={cn(
                    'flex items-start gap-3 p-3 border rounded cursor-pointer transition-colors',
                    reportType === rt.value
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-surface-200 hover:border-brand-300'
                  )}
                >
                  <input
                    type="radio"
                    name="report_type"
                    value={rt.value}
                    checked={reportType === rt.value}
                    onChange={() => setReportType(rt.value as ReportType)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className={cn('text-sm font-medium', reportType === rt.value ? 'text-brand-700' : 'text-ink')}>
                      {rt.label}
                    </p>
                    <p className="text-xs text-ink-muted mt-0.5">{rt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={generate}
            disabled={loading || !groupId}
            className="btn-primary btn w-full justify-center"
          >
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> Generating…</>
              : <><Download size={14} /> Generate & Download</>
            }
          </button>
        </div>

        {/* Branding notice */}
        {!org && (
          <div className="card p-4 bg-amber-50 border-amber-200">
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>School branding</strong> (logo, motto, signature) is available on Small School plan and above. Reports currently export without branding.
            </p>
          </div>
        )}
      </div>

      {/* Preview area */}
      <div className="lg:col-span-2 card p-6 flex flex-col items-center justify-center min-h-[400px]">
        <FileText size={48} className="text-surface-200 mb-4" />
        <p className="text-sm font-medium text-ink mb-1">Report preview</p>
        <p className="text-xs text-ink-muted text-center max-w-xs">
          Select a class and report type, then click Generate. Your Excel file will download automatically.
        </p>
      </div>
    </div>
  )
}

const REPORT_TYPES = [
  {
    value: 'broadsheet',
    label: 'Class Broadsheet',
    description: 'All students × all subjects with totals, percentages, and positions',
  },
  {
    value: 'class_summary',
    label: 'Class Summary',
    description: 'Statistical overview: class average, pass rate, grade distribution',
  },
]

// ─── Excel Broadsheet ─────────────────────────────────────────────────────────

async function generateBroadsheet({
  learners, subjects, scoreLookup, group, org,
}: {
  learners: { id: string; first_name: string; last_name: string; admission_number?: string }[]
  subjects: { id: string; name: string }[]
  scoreLookup: Record<string, Record<string, number>>
  group?: { name: string; code?: string; session?: { name: string } | null; term?: { name: string } | null } | null
  org: Organization | null
}) {
  const wb = XLSX.utils.book_new()

  // Title rows
  const titleRows: unknown[][] = [
    [org?.name ?? 'Eduxellence Results', '', '', ...Array(subjects.length + 2).fill('')],
    [org?.motto ?? '', '', '', ...Array(subjects.length + 2).fill('')],
    [`${group?.name ?? 'Class'} — ${group?.term?.name ?? ''} ${group?.session?.name ?? ''}`.trim()],
    [], // spacer
    // Header row
    ['#', 'Adm. No', 'Student Name', ...subjects.map(s => s.name), 'Total', '%', 'Grade', 'Position'],
  ]

  // Data rows
  const maxTotal = subjects.length * 100 // placeholder; should use actual max
  const studentData = learners.map((l, i) => {
    const subjectTotals = subjects.map(s => scoreLookup[l.id]?.[s.id] ?? null)
    const grandTotal = subjectTotals.reduce((sum, t) => sum + (t ?? 0), 0)
    const enteredSubjects = subjectTotals.filter(t => t !== null).length
    const avgPct = enteredSubjects > 0 ? (grandTotal / (enteredSubjects * 100)) * 100 : 0
    const grade = DEFAULT_GRADING.find(g => avgPct >= g.min_score && avgPct <= g.max_score)

    return {
      row: [i + 1, l.admission_number ?? '', `${l.last_name} ${l.first_name}`, ...subjectTotals, grandTotal, `${avgPct.toFixed(1)}%`, grade?.grade_letter ?? '-', ''],
      grandTotal,
    }
  })

  // Assign positions
  const sorted = [...studentData].sort((a, b) => b.grandTotal - a.grandTotal)
  studentData.forEach(s => {
    const pos = sorted.findIndex(x => x.grandTotal === s.grandTotal) + 1
    s.row[s.row.length - 1] = pos
  })

  const allRows = [
    ...titleRows,
    ...studentData.map(s => s.row),
  ]

  const ws = XLSX.utils.aoa_to_sheet(allRows)

  // Column widths
  ws['!cols'] = [
    { wch: 4 }, { wch: 12 }, { wch: 24 },
    ...subjects.map(() => ({ wch: 12 })),
    { wch: 8 }, { wch: 7 }, { wch: 7 }, { wch: 9 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Broadsheet')
  XLSX.writeFile(wb, `${group?.name ?? 'Class'}_Broadsheet.xlsx`)
}

async function generateSummary({
  learners, subjects, scoreLookup, group,
}: {
  learners: { id: string; first_name: string; last_name: string }[]
  subjects: { id: string; name: string }[]
  scoreLookup: Record<string, Record<string, number>>
  group?: { name: string } | null
}) {
  const wb = XLSX.utils.book_new()

  const subjectStats = subjects.map(s => {
    const scores = learners
      .map(l => scoreLookup[l.id]?.[s.id])
      .filter((v): v is number => v !== undefined && v !== null)
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    const highest = scores.length > 0 ? Math.max(...scores) : 0
    const lowest  = scores.length > 0 ? Math.min(...scores) : 0
    return [s.name, scores.length, avg.toFixed(1), highest, lowest]
  })

  const ws = XLSX.utils.aoa_to_sheet([
    [`Class Summary — ${group?.name ?? ''}`],
    [],
    ['Subject', 'Students Scored', 'Average', 'Highest', 'Lowest'],
    ...subjectStats,
  ])
  ws['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, ws, 'Summary')
  XLSX.writeFile(wb, `${group?.name ?? 'Class'}_Summary.xlsx`)
}
