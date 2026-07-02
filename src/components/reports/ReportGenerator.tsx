'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import {
  Download, FileText, Loader2, Eye, CheckCircle2,
  AlertCircle, ChevronRight, Settings2, Table2,
  FileSpreadsheet, FileDown
} from 'lucide-react'
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
  userRole?: string
}

interface SubjectSummary {
  id: string
  name: string
  code?: string
  templateId?: string
  studentCount: number
  avgScore: number
  highScore: number
  lowScore: number
  components: { id: string; name: string; max_score: number }[]
  isComplete: boolean
}

interface BroadsheetRow {
  learner: {
    id: string
    first_name: string
    last_name: string
    admission_number?: string
    gender?: string
  }
  subjectTotals: (number | null)[]
  componentScores: Record<string, Record<string, number | null>>
  grandTotal: number
  pct: number
  grade: string
  position: number
  remark?: string
}

interface ReportData {
  group: Group
  subjects: { id: string; name: string; code?: string; templateId?: string }[]
  learners: { id: string; first_name: string; last_name: string; admission_number?: string; gender?: string }[]
  rows: BroadsheetRow[]
  classAvg: number
  subjectSummaries: SubjectSummary[]
}

// PDF options available to institution
const PDF_OPTIONS = [
  { key: 'show_admission', label: 'Admission number', mandatory: false },
  { key: 'show_gender', label: 'Gender', mandatory: false },
  { key: 'show_position', label: 'Position in class', mandatory: false },
  { key: 'show_components', label: 'Component breakdown (CA1, CA2, Exam…)', mandatory: false },
  { key: 'show_grade', label: 'Grade', mandatory: false },
  { key: 'show_percentage', label: 'Percentage (%)', mandatory: false },
  { key: 'show_remark', label: "Teacher's overall remark", mandatory: false },
  { key: 'show_term', label: 'Term and session name', mandatory: false },
  { key: 'show_signature', label: "Teacher & Principal signature", mandatory: false }
]

type PdfOptions = Record<string, boolean>

export default function ReportGenerator({ groups, org, userId, userRole }: Props) {
  const supabase = createClient()
  const isInstitution = userRole === 'admin' || userRole === 'institution' || (org !== null)

  const [step, setStep] = useState<'review' | 'generate' | 'preview'>('review')
  const [groupId, setGroupId] = useState('')
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)

  // PDF settings (institution only)
  const [pdfOptions, setPdfOptions] = useState<PdfOptions>({
    show_admission: true,
    show_gender: false,
    show_position: true,
    show_components: true,
    show_grade: true,
    show_percentage: true,
    show_remark: false,
    show_term: true,
    show_signature: false
  })
  const [teacherSigUrl, setTeacherSigUrl] = useState<string | null>(null)
  const [principalSigUrl, setPrincipalSigUrl] = useState<string | null>(null)
  const [uploadingTeacher, setUploadingTeacher] = useState(false)
  const [uploadingPrincipal, setUploadingPrincipal] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  async function loadScoreSummary() {
    if (!groupId) { toast.error('Select a class first'); return }
    setLoading(true)
    try {
      const { data: learners } = await supabase
        .from('learners')
        .select('id, first_name, last_name, admission_number, gender')
        .eq('group_id', groupId).eq('is_active', true).order('last_name')

      if (!learners?.length) { toast.error('No students in this class'); setLoading(false); return }

      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name, code, template_id')
        .eq('group_id', groupId).eq('is_active', true).order('name')

      if (!subjects?.length) { toast.error('No subjects in this class'); setLoading(false); return }

      const templateIds = [...new Set(subjects.map(s => s.template_id).filter(Boolean))]
      const { data: components } = templateIds.length > 0
        ? await supabase.from('assessment_components')
            .select('id, name, max_score, template_id').in('template_id', templateIds).order('sequence')
        : { data: [] }

      const { data: scores } = await supabase
        .from('scores')
        .select('learner_id, subject_id, component_id, score')
        .in('learner_id', learners.map(l => l.id))
        .in('subject_id', subjects.map(s => s.id))

      // score lookup: learner → subject → total
      const scoreLookup: Record<string, Record<string, number>> = {}
      // component lookup: learner → subject → component → score
      const compLookup: Record<string, Record<string, Record<string, number | null>>> = {}

      for (const s of scores ?? []) {
        if (!scoreLookup[s.learner_id]) scoreLookup[s.learner_id] = {}
        scoreLookup[s.learner_id][s.subject_id] =
          (scoreLookup[s.learner_id][s.subject_id] ?? 0) + (s.score ?? 0)

        if (!compLookup[s.learner_id]) compLookup[s.learner_id] = {}
        if (!compLookup[s.learner_id][s.subject_id]) compLookup[s.learner_id][s.subject_id] = {}
        compLookup[s.learner_id][s.subject_id][s.component_id] = s.score
      }

      const subjectSummaries: SubjectSummary[] = subjects.map(s => {
        const vals = learners.map(l => scoreLookup[l.id]?.[s.id]).filter((v): v is number => v !== undefined)
        const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
        const subjectComponents = (components ?? []).filter(c => c.template_id === s.template_id)
        return {
          id: s.id, name: s.name, code: s.code, templateId: s.template_id,
          studentCount: vals.length, avgScore: avg,
          highScore: vals.length > 0 ? Math.max(...vals) : 0,
          lowScore:  vals.length > 0 ? Math.min(...vals) : 0,
          components: subjectComponents.map(c => ({ id: c.id, name: c.name, max_score: Number(c.max_score) })),
          isComplete: vals.length === learners.length,
        }
      })

      const rawRows: BroadsheetRow[] = learners.map(l => {
        const subjectTotals = subjects.map(s => scoreLookup[l.id]?.[s.id] ?? null)
        const grandTotal = subjectTotals.reduce((sum, t) => sum + (t ?? 0), 0)
        const entered = subjectTotals.filter(t => t !== null).length
        const pct = entered > 0 ? (grandTotal / (entered * 100)) * 100 : 0
        const gradeObj = DEFAULT_GRADING.find(g => pct >= g.min_score && pct <= g.max_score)
        return {
          learner: l, subjectTotals,
          componentScores: compLookup[l.id] ?? {},
          grandTotal, pct,
          grade: gradeObj?.grade_letter ?? '-',
          position: 0,
        }
      })

      const sorted = [...rawRows].sort((a, b) => b.grandTotal - a.grandTotal)
      rawRows.forEach(r => { r.position = sorted.findIndex(x => x.grandTotal === r.grandTotal) + 1 })

      const totals = rawRows.map(r => r.grandTotal).filter(t => t > 0)
      const classAvg = totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : 0
      const group = groups.find(g => g.id === groupId)!

      setReportData({
        group, subjects: subjects.map(s => ({ id: s.id, name: s.name, code: s.code, templateId: s.template_id })),
        learners, rows: rawRows, classAvg, subjectSummaries,
      })
      setStep('generate')
    } catch (err) {
      toast.error('Failed to load scores'); console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function generateReport() {
    if (!reportData) return
    setLoading(true)

    const { data: profile } = await supabase.from('users').select('organization_id').eq('id', userId).single()
    const { data: rec } = await supabase.from('reports').insert({
      organization_id: profile?.organization_id,
      group_id: groupId, type: 'broadsheet', status: 'pending', filters: {}, created_by: userId,
    }).select('id').single()

    if (rec?.id) {
      await supabase.from('reports').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', rec.id)
    }
    setLoading(false)
    setStep('preview')
  }

  async function uploadSignature(type: 'teacher' | 'principal', file: File) {
    if (type === 'teacher') setUploadingTeacher(true)
    else setUploadingPrincipal(true)

    const ext = file.name.split('.').pop()
    const path = `signatures/${userId}/${type}_${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('signatures').upload(path, file, { upsert: true })

    if (!error) {
      const { data: urlData } = supabase.storage.from('signatures').getPublicUrl(path)
      if (type === 'teacher') setTeacherSigUrl(urlData.publicUrl)
      else setPrincipalSigUrl(urlData.publicUrl)
      toast.success(`${type === 'teacher' ? 'Teacher' : 'Principal'} signature uploaded`)
    } else {
      toast.error('Failed to upload signature')
    }

    if (type === 'teacher') setUploadingTeacher(false)
    else setUploadingPrincipal(false)
  }

  function downloadCSV() {
    if (!reportData) return
    const { group, subjects, rows } = reportData
    const headers = ['#', 'Admission No', 'Student Name', ...subjects.map(s => s.name), 'Total', '%', 'Grade', 'Position']
    const dataRows = rows.map((r, i) => [
      i + 1, r.learner.admission_number ?? '',
      `${r.learner.last_name} ${r.learner.first_name}`,
      ...r.subjectTotals.map(t => t ?? ''),
      r.grandTotal, r.pct.toFixed(1), r.grade, r.position,
    ])
    const csv = [headers, ...dataRows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `${group.name}_Broadsheet.csv`; a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded!')
  }

  function downloadExcel() {
    if (!reportData) return
    const { group, subjects, rows } = reportData
    const wb = XLSX.utils.book_new()
    const titleRows: unknown[][] = [
      [org?.name ?? 'School Name'],
      [(org as any)?.motto ?? ''],
      [`${group.name} — ${group.term?.name ?? ''} ${group.session?.name ?? ''}`.trim()],
      ['RESULT BROADSHEET'], [],
      ['#', 'Adm. No', 'Student Name', ...subjects.map(s => s.name), 'Total', '%', 'Grade', 'Position'],
    ]
    const dataRows = rows.map((r, i) => [
      i + 1, r.learner.admission_number ?? '',
      `${r.learner.last_name} ${r.learner.first_name}`,
      ...r.subjectTotals.map(t => t ?? ''),
      r.grandTotal, `${r.pct.toFixed(1)}%`, r.grade, r.position,
    ])
    const ws = XLSX.utils.aoa_to_sheet([...titleRows, ...dataRows])
    ws['!cols'] = [{ wch: 4 }, { wch: 12 }, { wch: 24 }, ...subjects.map(() => ({ wch: 12 })), { wch: 8 }, { wch: 7 }, { wch: 7 }, { wch: 9 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Broadsheet')
    XLSX.writeFile(wb, `${group.name}_Broadsheet.xlsx`)
    toast.success('Excel downloaded!')
  }

  // ✅ UPDATED: PDF Export using @react-pdf/renderer (matching Script 1)
  async function downloadPDF() {
    if (!reportData || !isInstitution) return
    setGeneratingPdf(true)
    const loadingToast = toast.loading(`Generating PDFs for ${reportData.learners.length} students...`)

    try {
      // Dynamically import @react-pdf/renderer
      const { pdf } = await import('@react-pdf/renderer')
      const JSZip = (await import('jszip')).default
      const { StudentReportCard } = await import('@/components/reports/StudentReportCard')
      const { saveAs } = await import('file-saver')

      const zip = new JSZip()
      const pdfBlobs: Blob[] = []

      // Convert rows to StudentReportCard format
      for (const row of reportData.rows) {
        const student = {
          id: row.learner.id,
          first_name: row.learner.first_name,
          last_name: row.learner.last_name,
          admission_number: row.learner.admission_number || '',
          scores: reportData.subjects.map((subj, idx) => {
            const total = row.subjectTotals[idx] || 0
            const maxScore = 100
            const percentage = maxScore > 0 ? (total / maxScore) * 100 : 0
            const gradeObj = DEFAULT_GRADING.find(g => percentage >= g.min_score && percentage <= g.max_score)
            return {
              subject_name: subj.name,
              total: total,
              max_score: maxScore,
              percentage: percentage,
              grade: gradeObj?.grade_letter || 'F',
              remark: gradeObj?.remark || ''
            }
          }),
          total_score: row.grandTotal,
          max_possible: reportData.subjects.length * 100,
          percentage: row.pct,
          grade: row.grade,
          position: row.position,
          teacher_remark: '',
          principal_remark: ''
        }

        const pdfDoc = (
          <StudentReportCard
            student={student}
            schoolName={org?.name || 'Eduxellence School'}
            schoolLogo={org?.logo_url || undefined}
            schoolMotto={org?.motto || undefined}
            className={reportData.group.name}
            termName={reportData.group.term?.name || 'First Term'}
            sessionName={reportData.group.session?.name || '2024/2025 Session'}
            teacherName="Teacher"
            teacherSignature={teacherSigUrl || undefined}
            principalName="Principal"
            principalSignature={principalSigUrl || undefined}
          />
        )

        const blob = await pdf(pdfDoc).toBlob()
        pdfBlobs.push(blob)
        zip.file(`${row.learner.last_name}_${row.learner.first_name}_report_card.pdf`, blob)
      }

      toast.dismiss(loadingToast)

      if (pdfBlobs.length === 1) {
        saveAs(pdfBlobs[0], `${reportData.rows[0].learner.last_name}_${reportData.rows[0].learner.first_name}_report_card.pdf`)
      } else {
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        saveAs(zipBlob, `${reportData.group.name}_ResultCards.zip`)
      }
      toast.success(`Downloaded ${pdfBlobs.length} report cards`)
    } catch (error) {
      console.error('PDF error:', error)
      toast.dismiss(loadingToast)
      toast.error('Failed to generate PDFs')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const incompleteCount = reportData?.subjectSummaries.filter(s => !s.isComplete).length ?? 0
  const allComplete = reportData?.subjectSummaries.every(s => s.isComplete)

  return (
    <div className="flex flex-col gap-6">

      {/* ── Step indicator ── */}
      <div className="flex items-center gap-2 text-sm">
        {(['review', 'generate', 'preview'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => { if (reportData || s === 'review') setStep(s) }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
                step === s ? 'bg-brand-500 text-white' : 'bg-surface-100 text-ink-muted hover:bg-surface-200'
              )}
            >
              <span className={cn(
                'w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold',
                step === s ? 'bg-white text-brand-500' : 'bg-surface-200 text-ink-faint'
              )}>{i + 1}</span>
              {s === 'review' ? 'Review scores' : s === 'generate' ? 'Configure' : 'Preview & export'}
            </button>
            {i < 2 && <ChevronRight size={13} className="text-ink-faint" />}
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          STEP 1 — REVIEW SCORES
      ══════════════════════════════════════════ */}
      {step === 'review' && (
        <div className="flex flex-col gap-4">
          <div className="card p-5">
            <h2 className="font-semibold text-sm text-ink mb-3">Select a class to review</h2>
            <div className="flex gap-3 items-end">
              <div className="flex-1 max-w-xs">
                <select className="input" value={groupId}
                  onChange={e => { setGroupId(e.target.value); setReportData(null) }}>
                  <option value="">Select class…</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}{g.code ? ` (${g.code})` : ''}</option>
                  ))}
                </select>
              </div>
              <button onClick={loadScoreSummary} disabled={loading || !groupId}
                className="btn-primary btn disabled:opacity-50">
                {loading
                  ? <><Loader2 size={14} className="animate-spin" /> Loading…</>
                  : <><Eye size={14} /> Load scores</>}
              </button>
            </div>
          </div>

          {reportData && (
            <>
              {/* Subject summary */}
              <div className="card overflow-hidden">
                <div className="card-header flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-sm text-ink">
                      Score summary — {reportData.group.name}
                    </h2>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {reportData.learners.length} students · {reportData.subjects.length} subjects
                      {incompleteCount > 0 && (
                        <span className="text-amber-600 ml-2">
                          · ⚠ {incompleteCount} subject{incompleteCount > 1 ? 's' : ''} with missing scores
                        </span>
                      )}
                    </p>
                  </div>
                  {allComplete && (
                    <span className="badge badge-green flex items-center gap-1">
                      <CheckCircle2 size={11} /> All complete
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-50 border-b border-surface-200">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase tracking-wider">Subject</th>
                        <th className="text-center px-3 py-2.5 text-xs font-semibold text-ink-muted uppercase tracking-wider">Scored</th>
                        <th className="text-center px-3 py-2.5 text-xs font-semibold text-ink-muted uppercase tracking-wider">Avg</th>
                        <th className="text-center px-3 py-2.5 text-xs font-semibold text-ink-muted uppercase tracking-wider">High</th>
                        <th className="text-center px-3 py-2.5 text-xs font-semibold text-ink-muted uppercase tracking-wider">Low</th>
                        <th className="text-center px-3 py-2.5 text-xs font-semibold text-ink-muted uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.subjectSummaries.map(s => (
                        <tr key={s.id} className="border-b border-surface-200 hover:bg-surface-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-ink text-sm">{s.name}</div>
                            {s.components.length > 0 && (
                              <div className="text-xs text-ink-faint mt-0.5">
                                {s.components.map(c => `${c.name}/${c.max_score}`).join(' · ')}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center text-sm font-mono">
                            {s.studentCount}/{reportData.learners.length}
                          </td>
                          <td className="px-3 py-3 text-center font-mono font-semibold text-ink">{s.avgScore.toFixed(1)}</td>
                          <td className="px-3 py-3 text-center font-mono text-green-600 font-semibold">{s.highScore}</td>
                          <td className="px-3 py-3 text-center font-mono text-red-500 font-semibold">{s.lowScore}</td>
                          <td className="px-3 py-3 text-center">
                            {s.isComplete
                              ? <span className="badge badge-green text-[10px]">✓ Complete</span>
                              : <span className="badge badge-amber text-[10px]">⚠ Incomplete</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Per-student score grid */}
              <div className="card overflow-hidden">
                <div className="card-header">
                  <h2 className="font-semibold text-sm text-ink">Student scores</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-surface-50 border-b border-surface-200">
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-muted uppercase tracking-wider">#</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-ink-muted uppercase tracking-wider min-w-[140px]">Student</th>
                        {reportData.subjects.map(s => (
                          <th key={s.id} className="px-3 py-2.5 font-semibold text-ink-muted uppercase tracking-wider text-center whitespace-nowrap">
                            {s.name}
                          </th>
                        ))}
                        <th className="px-3 py-2.5 font-semibold text-ink-muted uppercase tracking-wider text-center">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.rows.map((row, i) => (
                        <tr key={row.learner.id} className={cn('border-b border-surface-200', i % 2 === 0 ? 'bg-white' : 'bg-surface-50/50')}>
                          <td className="px-4 py-2 text-ink-muted">{i + 1}</td>
                          <td className="px-4 py-2 font-medium text-ink whitespace-nowrap">
                            {row.learner.last_name} {row.learner.first_name}
                          </td>
                          {row.subjectTotals.map((t, j) => (
                            <td key={j} className="px-3 py-2 text-center font-mono">
                              {t !== null ? (
                                <span className={cn('font-semibold',
                                  t >= 70 ? 'text-green-700' : t >= 50 ? 'text-amber-700' : t >= 40 ? 'text-orange-600' : 'text-red-600'
                                )}>{t}</span>
                              ) : <span className="text-ink-faint">—</span>}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-center font-bold font-mono text-ink">{row.grandTotal}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-surface-100 border-t-2 border-surface-200 font-semibold">
                        <td colSpan={2} className="px-4 py-2 text-xs text-ink-muted uppercase">Class avg</td>
                        {reportData.subjects.map((s, si) => {
                          const vals = reportData.rows.map(r => r.subjectTotals[si]).filter((v): v is number => v !== null)
                          const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
                          return <td key={s.id} className="px-3 py-2 text-center font-mono text-ink">{avg !== null ? avg.toFixed(1) : '—'}</td>
                        })}
                        <td className="px-3 py-2 text-center font-mono text-ink">{reportData.classAvg.toFixed(1)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={() => setStep('generate')} className="btn-primary btn">
                  <Settings2 size={14} /> Configure report <ChevronRight size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          STEP 2 — CONFIGURE
      ══════════════════════════════════════════ */}
      {step === 'generate' && reportData && (
        <div className="flex flex-col gap-4 max-w-2xl">
          <div className="card p-5 flex flex-col gap-4">
            <h2 className="font-semibold text-sm text-ink">Report configuration</h2>

            <div className="p-3 bg-surface-50 rounded border border-surface-200 text-sm">
              <p className="font-medium text-ink">{reportData.group.name}</p>
              <p className="text-xs text-ink-muted">
                {reportData.learners.length} students · {reportData.subjects.length} subjects ·
                Class avg: {reportData.classAvg.toFixed(1)}
              </p>
            </div>

            {/* Subject list */}
            <div>
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Subjects included</p>
              <div className="flex flex-wrap gap-2">
                {reportData.subjects.map(s => (
                  <span key={s.id} className={cn('badge', reportData.subjectSummaries.find(ss => ss.id === s.id)?.isComplete ? 'badge-green' : 'badge-amber')}>
                    {s.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Institution PDF options */}
            {isInstitution && (
              <div>
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
                  PDF result card options
                  <span className="ml-1 font-normal text-ink-faint">(student name and subject scores are always included)</span>
                </p>
                <div className="flex flex-col gap-2">
                  {PDF_OPTIONS.map(opt => (
                    <label key={opt.key} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pdfOptions[opt.key] ?? false}
                        onChange={e => setPdfOptions(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                        className="w-4 h-4 rounded border-surface-300 text-brand-500"
                      />
                      <span className="text-sm text-ink">{opt.label}</span>
                    </label>
                  ))}
                </div>

                {/* Signature uploads */}
                {pdfOptions.show_signature && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-ink mb-1">Teacher signature (optional)</p>
                      <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-surface-300 rounded cursor-pointer hover:border-brand-300 transition-colors">
                        {uploadingTeacher ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} className="text-ink-muted" />}
                        <span className="text-xs text-ink-muted">{teacherSigUrl ? '✓ Uploaded' : 'Upload image'}</span>
                        <input type="file" accept="image/*" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) uploadSignature('teacher', f) }} />
                      </label>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-ink mb-1">Principal signature (optional)</p>
                      <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-surface-300 rounded cursor-pointer hover:border-brand-300 transition-colors">
                        {uploadingPrincipal ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} className="text-ink-muted" />}
                        <span className="text-xs text-ink-muted">{principalSigUrl ? '✓ Uploaded' : 'Upload image'}</span>
                        <input type="file" accept="image/*" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) uploadSignature('principal', f) }} />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button onClick={() => setStep('review')} className="btn-secondary btn">← Back</button>
              <button onClick={generateReport} disabled={loading} className="btn-primary btn">
                {loading
                  ? <><Loader2 size={14} className="animate-spin" /> Generating…</>
                  : <><FileText size={14} /> Generate now</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          STEP 3 — PREVIEW & EXPORT
      ══════════════════════════════════════════ */}
      {step === 'preview' && reportData && (
        <div className="card overflow-hidden">
          <div className="card-header flex items-center justify-between bg-surface-50">
            <div>
              <h2 className="font-semibold text-sm text-ink">Preview & Export</h2>
              <p className="text-xs text-ink-muted">
                {reportData.group.name} · {reportData.learners.length} students · Class avg: {reportData.classAvg.toFixed(1)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={downloadCSV} className="btn-secondary btn-sm btn flex items-center gap-1.5">
                <FileDown size={13} /> CSV
              </button>
              <button onClick={downloadExcel} className="btn-secondary btn-sm btn flex items-center gap-1.5">
                <FileSpreadsheet size={13} /> Excel
              </button>
              {isInstitution && (
                <button onClick={downloadPDF} disabled={generatingPdf}
                  className="btn-primary btn-sm btn flex items-center gap-1.5 disabled:opacity-50">
                  {generatingPdf
                    ? <><Loader2 size={13} className="animate-spin" /> Generating PDFs…</>
                    : <><FileText size={13} /> PDF (per student)</>}
                </button>
              )}
            </div>
          </div>

          {/* School header */}
          <div className="px-6 py-4 text-center border-b border-surface-200">
            {org?.logo_url && (
              <img src={org.logo_url} alt="School logo" className="w-14 h-14 object-contain mx-auto mb-2" />
            )}
            <p className="font-bold text-ink text-base">{org?.name ?? 'School Name'}</p>
            {(org as any)?.motto && <p className="text-xs text-ink-muted italic">"{(org as any).motto}"</p>}
            <p className="text-sm font-semibold text-ink mt-1">
              {reportData.group.name}
              {reportData.group.term?.name ? ` — ${reportData.group.term.name}` : ''}
              {reportData.group.session?.name ? ` ${reportData.group.session.name}` : ''}
            </p>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mt-0.5">Result Broadsheet</p>
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
                  <tr key={row.learner.id} className={cn('border-b border-surface-200', i % 2 === 0 ? 'bg-white' : 'bg-surface-50/50')}>
                    <td className="px-3 py-2.5 text-ink-muted">{i + 1}</td>
                    <td className="px-3 py-2.5 font-mono text-ink-muted">{row.learner.admission_number ?? '—'}</td>
                    <td className="px-3 py-2.5 font-medium text-ink whitespace-nowrap">{row.learner.last_name} {row.learner.first_name}</td>
                    {row.subjectTotals.map((t, j) => (
                      <td key={j} className="px-3 py-2.5 text-center font-mono">
                        {t !== null ? (
                          <span className={cn('font-semibold',
                            t >= 70 ? 'text-green-700' : t >= 50 ? 'text-amber-700' : t >= 40 ? 'text-orange-600' : 'text-red-600'
                          )}>{t}</span>
                        ) : <span className="text-ink-faint">—</span>}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-center font-bold font-mono text-ink">{row.grandTotal}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-ink-muted">{row.pct.toFixed(1)}%</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={cn('font-bold',
                        row.grade === 'A' ? 'text-green-600' : row.grade === 'B' ? 'text-blue-600' :
                        row.grade === 'C' ? 'text-amber-600' : row.grade === 'D' ? 'text-orange-600' : 'text-red-600'
                      )}>{row.grade}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-ink">{row.position}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-100 border-t-2 border-surface-200 font-semibold">
                  <td colSpan={3} className="px-3 py-2.5 text-xs text-ink-muted uppercase tracking-wider">Class Average</td>
                  {reportData.subjects.map((s, si) => {
                    const vals = reportData.rows.map(r => r.subjectTotals[si]).filter((v): v is number => v !== null)
                    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
                    return <td key={s.id} className="px-3 py-2.5 text-center font-mono text-ink">{avg !== null ? avg.toFixed(1) : '—'}</td>
                  })}
                  <td className="px-3 py-2.5 text-center font-mono text-ink">{reportData.classAvg.toFixed(1)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Bottom export bar */}
          <div className="px-5 py-3 bg-surface-50 border-t border-surface-200 flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-ink-muted">
              ✓ {reportData.learners.length} students · {reportData.subjects.length} subjects · Generated
            </p>
            <div className="flex gap-2">
              <button onClick={downloadCSV} className="btn-secondary btn-sm btn"><FileDown size={12} /> CSV</button>
              <button onClick={downloadExcel} className="btn-secondary btn-sm btn"><FileSpreadsheet size={12} /> Excel</button>
              {isInstitution && (
                <button onClick={downloadPDF} disabled={generatingPdf} className="btn-primary btn-sm btn disabled:opacity-50">
                  {generatingPdf ? <><Loader2 size={12} className="animate-spin" /> Generating…</> : <><FileText size={12} /> PDF cards</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {step === 'review' && !reportData && !loading && (
        <div className="card p-12 flex flex-col items-center text-center">
          <Table2 size={40} className="text-surface-200 mb-4" />
          <p className="text-sm font-medium text-ink mb-1">Select a class to get started</p>
          <p className="text-xs text-ink-muted max-w-xs">
            Choose a class above and click "Load scores" to review all entered scores before generating the report.
          </p>
        </div>
      )}
    </div>
  )
}
