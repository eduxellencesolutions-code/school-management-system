'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft,
  Loader2,
  FileText,
  FileSpreadsheet,
  FileDown,
  Users,
  CheckCircle,
  AlertCircle,
  Printer
} from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { pdf } from '@react-pdf/renderer'
import { StudentReportCard } from '@/components/reports/StudentReportCard'
import JSZip from 'jszip'
import { cn } from '@/lib/utils'

export const runtime = 'nodejs'

interface ReportData {
  id: string
  organization_id: string
  group_id: string
  learner_id: string | null
  status: string
  download_url: string | null
  created_at: string
  completed_at: string | null
  group?: { name: string }
  learner?: { first_name: string; last_name: string }
  created_by_user?: { name: string }
  organization?: { name: string; logo_url: string | null; motto: string | null }
}

interface ComponentScore {
  component_id: string
  component_name: string
  score: number
  max_score: number
}

interface SubjectScore {
  subject_id: string
  subject_name: string
  components: ComponentScore[]
  total: number
  max_score: number
  percentage: number
  grade: string
  remark?: string
}

interface LearnerResult {
  id: string
  first_name: string
  last_name: string
  admission_number: string
  scores: SubjectScore[]
  total_score: number
  max_possible: number
  percentage: number
  grade: string
  position: number
  teacher_remark?: string
  principal_remark?: string
}

interface GradeRule {
  min: number
  max: number
  grade: string
  remark: string
}

// Matches DEFAULT_GRADING in utils.ts exactly
const DEFAULT_GRADE_RULES: GradeRule[] = [
  { min: 70, max: 100, grade: 'A', remark: 'Excellent' },
  { min: 60, max: 69,  grade: 'B', remark: 'Very Good' },
  { min: 50, max: 59,  grade: 'C', remark: 'Good' },
  { min: 40, max: 49,  grade: 'D', remark: 'Pass' },
  { min: 30, max: 39,  grade: 'E', remark: 'Below Pass' },
  { min: 0,  max: 29,  grade: 'F', remark: 'Fail' },
]

function getGrade(percentage: number, rules: GradeRule[]): { grade: string; remark: string } {
  const pct = Math.round(percentage * 10) / 10
  for (const g of rules) {
    if (pct >= g.min && pct <= g.max) return { grade: g.grade, remark: g.remark }
  }
  return { grade: 'F', remark: 'Fail' }
}

export default function PreviewReportPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const reportId = searchParams.get('id')

  const [report, setReport] = useState<ReportData | null>(null)
  const [learners, setLearners] = useState<LearnerResult[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<'csv' | 'excel' | 'pdf' | null>(null)
  const [isInstitution, setIsInstitution] = useState(false)
  const [gradeRules, setGradeRules] = useState<GradeRule[]>(DEFAULT_GRADE_RULES)
  const [profile, setProfile] = useState<any>(null)
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([])

  const supabase = createClient()

  useEffect(() => {
    if (!reportId) { toast.error('No report ID provided'); router.push('/reports'); return }
    fetchReportData()
  }, [reportId])

  async function fetchReportData() {
    setLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) { router.push('/login'); return }

      const { data: profileData } = await supabase
        .from('users')
        .select('*, organization:organizations(*)')
        .eq('id', userData.user.id)
        .single()

      setProfile(profileData)

      const isInst = profileData?.organization?.type === 'school' &&
        profileData?.organization?.subscription_status === 'active'
      setIsInstitution(isInst)

      // Load org grading system if available
      if (profileData?.organization_id) {
        const { data: grades } = await supabase
          .from('grading_systems')
          .select('*')
          .eq('organization_id', profileData.organization_id)
          .order('min_score', { ascending: false })

        if (grades && grades.length > 0) {
          setGradeRules(grades.map(g => ({
            min: Number(g.min_score),
            max: Number(g.max_score),
            grade: g.grade_letter,
            remark: g.remark || ''
          })))
        }
      }

      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select(`*, group:groups(name), learner:learners(first_name, last_name), created_by_user:users(name), organization:organizations(name, logo_url, motto)`)
        .eq('id', reportId!)
        .single()

      if (reportError) throw reportError
      setReport(reportData)

      if (reportData.group_id) {
        await fetchLearnerResults(reportData.group_id)
      }

      // Mark processing reports as completed
      if (reportData.status === 'processing' || reportData.status === 'pending') {
        await supabase.from('reports')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', reportId!)
      }
    } catch (error) {
      console.error('Error fetching report:', error)
      toast.error('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }

  async function fetchLearnerResults(groupId: string) {
    try {
      const { data: learnersData } = await supabase
        .from('learners')
        .select('id, first_name, last_name, admission_number')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .order('last_name')

      if (!learnersData?.length) { setLearners([]); return }

      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('id, name, template_id')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .order('name')

      if (!subjectsData?.length) { setLearners([]); return }

      setSubjects(subjectsData.map(s => ({ id: s.id, name: s.name })))

      // Fetch components
      const templateIds = [...new Set(subjectsData.map(s => s.template_id).filter(Boolean))]
      let componentsData: { id: string; name: string; max_score: number; template_id: string; sequence: number }[] = []
      if (templateIds.length > 0) {
        const { data } = await supabase
          .from('assessment_components')
          .select('id, name, max_score, template_id, sequence')
          .in('template_id', templateIds)
          .order('sequence')
        componentsData = data || []
      }

      // Map components per subject
      const subjectComponentMap: Record<string, typeof componentsData> = {}
      subjectsData.forEach(s => {
        subjectComponentMap[s.id] = componentsData.filter(c => c.template_id === s.template_id)
      })

      // Max score per subject = sum of component max_scores (fallback 100)
      const subjectMaxScore: Record<string, number> = {}
      subjectsData.forEach(s => {
        const comps = subjectComponentMap[s.id] || []
        subjectMaxScore[s.id] = comps.length > 0
          ? comps.reduce((sum, c) => sum + Number(c.max_score), 0)
          : 100
      })

      // Fetch all scores
      const { data: scoresData } = await supabase
        .from('scores')
        .select('learner_id, subject_id, component_id, score')
        .in('learner_id', learnersData.map(l => l.id))
        .in('subject_id', subjectsData.map(s => s.id))

      const scores = scoresData || []

      // Use the gradeRules from state — but since this runs async before state updates,
      // we use the rules we just fetched (passed inline)
      const currentRules = gradeRules

      const results: LearnerResult[] = learnersData.map(learner => {
        const learnerScores = scores.filter(s => s.learner_id === learner.id)

        const subjectScores: SubjectScore[] = subjectsData.map(subject => {
          const subjectScoreData = learnerScores.filter(s => s.subject_id === subject.id)
          const comps = subjectComponentMap[subject.id] || []
          const maxScore = subjectMaxScore[subject.id]

          // Build per-component breakdown
          const componentScores: ComponentScore[] = comps.map(c => {
            const scoreEntry = subjectScoreData.find(s => s.component_id === c.id)
            return {
              component_id: c.id,
              component_name: c.name,
              score: scoreEntry?.score ?? 0,
              max_score: Number(c.max_score),
            }
          })

          const total = subjectScoreData.reduce((sum, s) => sum + (s.score || 0), 0)
          const percentage = maxScore > 0 ? (total / maxScore) * 100 : 0
          const gradeResult = getGrade(percentage, currentRules)

          return {
            subject_id: subject.id,
            subject_name: subject.name,
            components: componentScores,
            total,
            max_score: maxScore,
            percentage,
            grade: gradeResult.grade,
            remark: gradeResult.remark,
          }
        })

        const totalScore = subjectScores.reduce((sum, s) => sum + s.total, 0)
        const maxPossible = subjectsData.reduce((sum, s) => sum + subjectMaxScore[s.id], 0)
        const percentage = maxPossible > 0 ? (totalScore / maxPossible) * 100 : 0
        const gradeResult = getGrade(percentage, currentRules)

        return {
          ...learner,
          scores: subjectScores,
          total_score: totalScore,
          max_possible: maxPossible,
          percentage,
          grade: gradeResult.grade,
          position: 0,
          teacher_remark: '',
          principal_remark: '',
        }
      })

      results.sort((a, b) => b.total_score - a.total_score)
      results.forEach((l, i) => { l.position = i + 1 })
      setLearners(results)
    } catch (error) {
      console.error('Error fetching learner results:', error)
      toast.error('Failed to load learner results')
    }
  }

  const handleExportCSV = async () => {
    setExporting('csv')
    try {
      // Build headers with CA columns
      const firstLearner = learners[0]
      const subjectHeaders: string[] = []
      firstLearner?.scores.forEach(s => {
        if (s.components.length > 0) {
          s.components.forEach(c => subjectHeaders.push(`${s.subject_name} - ${c.component_name}`))
          subjectHeaders.push(`${s.subject_name} - Total`)
        } else {
          subjectHeaders.push(s.subject_name)
        }
      })

      const headers = ['Position', 'Student', 'Admission Number', ...subjectHeaders, 'Grand Total', 'Percentage', 'Grade']

      const rows = learners.map(learner => {
        const subjectCells: (number | string)[] = []
        learner.scores.forEach(s => {
          if (s.components.length > 0) {
            s.components.forEach(c => subjectCells.push(c.score))
            subjectCells.push(s.total)
          } else {
            subjectCells.push(s.total)
          }
        })
        return [
          learner.position,
          `${learner.last_name} ${learner.first_name}`,
          learner.admission_number || '',
          ...subjectCells,
          learner.total_score.toFixed(1),
          learner.percentage.toFixed(1) + '%',
          learner.grade,
        ]
      })

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      saveAs(blob, `report_${report?.group?.name || 'class'}_${new Date().toISOString().slice(0, 10)}.csv`)
      toast.success('CSV exported successfully')
    } catch (error) {
      toast.error('Failed to export CSV')
    } finally {
      setExporting(null)
    }
  }

  const handleExportExcel = async () => {
    setExporting('excel')
    try {
      const wb = XLSX.utils.book_new()
      const firstLearner = learners[0]

      const subjectHeaders: string[] = []
      firstLearner?.scores.forEach(s => {
        if (s.components.length > 0) {
          s.components.forEach(c => subjectHeaders.push(`${s.subject_name}\n${c.component_name}`))
          subjectHeaders.push(`${s.subject_name}\nTotal`)
        } else {
          subjectHeaders.push(s.subject_name)
        }
      })

      const data = [
        [report?.group?.name || 'Class', '', `Generated: ${new Date().toLocaleDateString('en-NG')}`],
        [],
        ['Position', 'Student', 'Admission Number', ...subjectHeaders, 'Grand Total', '%', 'Grade'],
        ...learners.map(learner => {
          const subjectCells: (number | string)[] = []
          learner.scores.forEach(s => {
            if (s.components.length > 0) {
              s.components.forEach(c => subjectCells.push(c.score))
              subjectCells.push(s.total)
            } else {
              subjectCells.push(s.total)
            }
          })
          return [
            learner.position,
            `${learner.last_name} ${learner.first_name}`,
            learner.admission_number || '',
            ...subjectCells,
            learner.total_score.toFixed(1),
            learner.percentage.toFixed(1) + '%',
            learner.grade,
          ]
        })
      ]

      const ws = XLSX.utils.aoa_to_sheet(data)
      XLSX.utils.book_append_sheet(wb, ws, 'Broadsheet')

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, `report_${report?.group?.name || 'class'}_${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.success('Excel exported successfully')
    } catch (error) {
      toast.error('Failed to export Excel')
    } finally {
      setExporting(null)
    }
  }

  const handleExportPDF = async () => {
    if (!isInstitution) { toast.error('PDF export is only available for institution accounts'); return }
    if (learners.length === 0) { toast.error('No students to export'); return }

    setExporting('pdf')
    const loadingToast = toast.loading(`Generating PDFs for ${learners.length} students...`)

    try {
      const org = profile?.organization
      const pdfBlobs: Blob[] = []

      for (let i = 0; i < learners.length; i++) {
        const student = learners[i]
        toast.loading(`Generating PDF ${i + 1}/${learners.length}...`, { id: loadingToast })

        const pdfDoc = (
          <StudentReportCard
            student={student}
            schoolName={org?.name || 'Eduxellence School'}
            schoolLogo={org?.logo_url || undefined}
            schoolMotto={org?.motto || undefined}
            className={report?.group?.name || 'Class'}
            termName="First Term"
            sessionName="2024/2025 Session"
            teacherName={profile?.name || 'Teacher'}
            teacherSignature={profile?.signature_url || undefined}
            principalName={org?.name ? `Principal, ${org.name}` : 'Principal'}
            principalSignature={org?.signature_url || undefined}
          />
        )

        const blob = await pdf(pdfDoc).toBlob()
        pdfBlobs.push(blob)
      }

      toast.dismiss(loadingToast)

      if (pdfBlobs.length === 1) {
        saveAs(pdfBlobs[0], `${learners[0].last_name}_${learners[0].first_name}_report_card.pdf`)
      } else {
        const zip = new JSZip()
        pdfBlobs.forEach((blob, i) => {
          const s = learners[i]
          zip.file(`${s.last_name}_${s.first_name}_report_card.pdf`, blob)
        })
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        saveAs(zipBlob, `reports_${report?.group?.name}_${new Date().toISOString().slice(0, 10)}.zip`)
      }
      toast.success(`Downloaded ${pdfBlobs.length} report card${pdfBlobs.length > 1 ? 's' : ''}`)
    } catch (error) {
      console.error('PDF error:', error)
      toast.dismiss(loadingToast)
      toast.error('Failed to generate PDFs')
    } finally {
      setExporting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 size={40} className="animate-spin text-brand-500 mb-4" />
        <p className="text-ink-muted">Loading report data...</p>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <AlertCircle size={40} className="text-red-500 mb-4" />
        <p className="text-ink-muted mb-2">Report not found</p>
        <Link href="/reports" className="btn-primary btn-sm btn">Back to reports</Link>
      </div>
    )
  }

  // All unique components across all subjects for the header
  const allComponents = learners[0]?.scores.flatMap(s =>
    s.components.length > 0
      ? [...s.components.map(c => ({ subjectId: s.subject_id, subjectName: s.subject_name, ...c })), { subjectId: s.subject_id, subjectName: s.subject_name, component_id: `${s.subject_id}-total`, component_name: 'Total', score: 0, max_score: s.max_score }]
      : [{ subjectId: s.subject_id, subjectName: s.subject_name, component_id: s.subject_id, component_name: 'Score', score: 0, max_score: s.max_score }]
  ) || []

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/reports" className="text-sm text-ink-muted hover:text-brand-500 flex items-center gap-1 mb-1">
            <ArrowLeft size={14} /> Back to reports
          </Link>
          <h1 className="page-title">Report Preview</h1>
          <p className="page-subtitle">
            {report.group?.name} · {learners.length} students · {learners[0]?.scores.length || 0} subjects
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleExportCSV} disabled={exporting === 'csv' || learners.length === 0}
            className="btn-secondary btn-sm btn flex items-center gap-1">
            {exporting === 'csv' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} CSV
          </button>
          <button onClick={handleExportExcel} disabled={exporting === 'excel' || learners.length === 0}
            className="btn-secondary btn-sm btn flex items-center gap-1">
            {exporting === 'excel' ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} Excel
          </button>
          {isInstitution && (
            <button onClick={handleExportPDF} disabled={exporting === 'pdf' || learners.length === 0}
              className="btn-primary btn-sm btn flex items-center gap-1">
              {exporting === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} PDF
            </button>
          )}
          <button onClick={() => window.print()} className="btn-secondary btn-sm btn flex items-center gap-1">
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {isInstitution && (
        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full self-start">
          <CheckCircle size={14} /> Institution account · PDF export enabled
        </div>
      )}

      {/* Broadsheet */}
      <div className="card" id="report-content">
        <div className="card-header flex items-center justify-between">
          <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
            <FileText size={16} className="text-ink-muted" /> Class Broadsheet
          </h2>
          <span className="text-xs text-ink-muted">
            {learners.length} student{learners.length !== 1 ? 's' : ''} · {learners[0]?.scores.length || 0} subjects
          </span>
        </div>

        {learners.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Users size={32} className="text-surface-200 mx-auto mb-3" />
            <p className="text-sm text-ink-muted">No students found in this class</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                {/* Row 1: subject group headers */}
                <tr className="bg-surface-100 border-b border-surface-100">
                  <th className="px-2 py-1" />
                  <th className="px-2 py-1" />
                  <th className="px-2 py-1" />
                  {learners[0].scores.map(s => {
                    const colSpan = s.components.length > 0 ? s.components.length + 1 : 1
                    return (
                      <th key={s.subject_id} colSpan={colSpan}
                        className="px-2 py-1.5 text-center text-[10px] font-semibold text-ink-muted uppercase tracking-wider border-l border-surface-200 whitespace-nowrap">
                        {s.subject_name}
                      </th>
                    )
                  })}
                  <th className="px-2 py-1" colSpan={4} />
                </tr>
                {/* Row 2: column labels */}
                <tr className="bg-surface-50 border-b border-surface-200">
                  <th className="text-center px-2 py-2 font-semibold text-ink-muted uppercase tracking-wider w-8">#</th>
                  <th className="text-left px-3 py-2 font-semibold text-ink-muted uppercase tracking-wider min-w-[130px]">Student</th>
                  <th className="text-left px-2 py-2 font-semibold text-ink-muted uppercase tracking-wider">Adm. No</th>
                  {learners[0].scores.map(s => (
                    s.components.length > 0 ? (
                      <>
                        {s.components.map(c => (
                          <th key={c.component_id}
                            className="px-2 py-2 font-semibold text-ink-muted uppercase tracking-wider text-center whitespace-nowrap border-l border-surface-100">
                            {c.component_name}
                          </th>
                        ))}
                        <th key={`${s.subject_id}-total`}
                          className="px-2 py-2 font-semibold text-ink-muted uppercase tracking-wider text-center bg-surface-100 border-l border-surface-200">
                          Total
                        </th>
                      </>
                    ) : (
                      <th key={s.subject_id}
                        className="px-2 py-2 font-semibold text-ink-muted uppercase tracking-wider text-center border-l border-surface-100">
                        Score
                      </th>
                    )
                  ))}
                  <th className="px-3 py-2 font-semibold text-ink-muted uppercase tracking-wider text-center">Grand Total</th>
                  <th className="px-3 py-2 font-semibold text-ink-muted uppercase tracking-wider text-center">%</th>
                  <th className="px-3 py-2 font-semibold text-ink-muted uppercase tracking-wider text-center">Grade</th>
                  <th className="px-3 py-2 font-semibold text-ink-muted uppercase tracking-wider text-center">Pos.</th>
                </tr>
              </thead>
              <tbody>
                {learners.map((learner, i) => (
                  <tr key={learner.id} className={cn('border-b border-surface-100', i % 2 === 0 ? 'bg-white' : 'bg-surface-50/50')}>
                    <td className="text-center px-2 py-2 text-ink-muted font-mono">{learner.position}</td>
                    <td className="px-3 py-2 font-medium text-ink whitespace-nowrap">{learner.last_name} {learner.first_name}</td>
                    <td className="px-2 py-2 text-ink-muted font-mono">{learner.admission_number || '—'}</td>
                    {learner.scores.map(s => (
                      s.components.length > 0 ? (
                        <>
                          {s.components.map(c => (
                            <td key={c.component_id} className="text-center px-2 py-2 font-mono border-l border-surface-100">
                              {c.score > 0 ? (
                                <span className={cn('font-medium',
                                  (c.score / c.max_score) >= 0.7 ? 'text-green-700' :
                                  (c.score / c.max_score) >= 0.5 ? 'text-amber-700' : 'text-red-600'
                                )}>{c.score}</span>
                              ) : <span className="text-ink-faint">—</span>}
                            </td>
                          ))}
                          <td key={`${s.subject_id}-total`} className="text-center px-2 py-2 font-mono font-bold bg-surface-50 border-l border-surface-200">
                            {s.total > 0 ? (
                              <span className={cn(
                                s.percentage >= 70 ? 'text-green-700' :
                                s.percentage >= 50 ? 'text-amber-700' : 'text-red-600'
                              )}>{s.total}</span>
                            ) : <span className="text-ink-faint">—</span>}
                          </td>
                        </>
                      ) : (
                        <td key={s.subject_id} className="text-center px-2 py-2 font-mono border-l border-surface-100">
                          {s.total > 0 ? (
                            <span className={cn('font-semibold',
                              s.percentage >= 70 ? 'text-green-700' :
                              s.percentage >= 50 ? 'text-amber-700' : 'text-red-600'
                            )}>{s.total}</span>
                          ) : <span className="text-ink-faint">—</span>}
                        </td>
                      )
                    ))}
                    <td className="text-center px-3 py-2 font-bold font-mono text-ink">{learner.total_score}</td>
                    <td className="text-center px-3 py-2 font-mono text-ink-muted">{learner.percentage.toFixed(1)}%</td>
                    <td className="text-center px-3 py-2">
                      <span className={cn('font-bold',
                        learner.grade === 'A' ? 'text-green-600' : learner.grade === 'B' ? 'text-blue-600' :
                        learner.grade === 'C' ? 'text-amber-600' : learner.grade === 'D' ? 'text-orange-600' :
                        learner.grade === 'E' ? 'text-yellow-600' : 'text-red-600'
                      )}>{learner.grade}</span>
                    </td>
                    <td className="text-center px-3 py-2 font-bold text-ink">{learner.position}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-surface-200 bg-surface-100 font-semibold">
                  <td colSpan={3} className="px-3 py-2 text-xs text-ink-muted uppercase">Class avg</td>
                  {learners[0].scores.map(s => (
                    s.components.length > 0 ? (
                      <>
                        {s.components.map(c => {
                          const vals = learners.map(l => l.scores.find(ss => ss.subject_id === s.subject_id)?.components.find(cc => cc.component_id === c.component_id)?.score ?? 0)
                          const avg = vals.reduce((a, b) => a + b, 0) / vals.length
                          return <td key={c.component_id} className="text-center px-2 py-2 font-mono text-ink-muted border-l border-surface-200">{avg.toFixed(1)}</td>
                        })}
                        <td key={`${s.subject_id}-avg`} className="text-center px-2 py-2 font-mono text-ink bg-surface-100 border-l border-surface-200">
                          {(learners.reduce((sum, l) => sum + (l.scores.find(ss => ss.subject_id === s.subject_id)?.total ?? 0), 0) / learners.length).toFixed(1)}
                        </td>
                      </>
                    ) : (
                      <td key={s.subject_id} className="text-center px-2 py-2 font-mono text-ink border-l border-surface-200">
                        {(learners.reduce((sum, l) => sum + (l.scores.find(ss => ss.subject_id === s.subject_id)?.total ?? 0), 0) / learners.length).toFixed(1)}
                      </td>
                    )
                  ))}
                  <td className="text-center px-3 py-2 font-mono text-ink">
                    {(learners.reduce((sum, l) => sum + l.total_score, 0) / learners.length).toFixed(1)}
                  </td>
                  <td className="text-center px-3 py-2 font-mono text-ink-muted">
                    {(learners.reduce((sum, l) => sum + l.percentage, 0) / learners.length).toFixed(1)}%
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {!isInstitution && (
        <div className="card p-5 bg-brand-50 border-brand-200">
          <div className="flex items-center gap-2 mb-2">
            <FileDown size={15} className="text-brand-600" />
            <span className="text-xs font-semibold text-brand-700 uppercase tracking-wider">Upgrade for PDF Reports</span>
          </div>
          <p className="text-xs text-brand-700 leading-relaxed mb-3">
            PDF report cards with your school logo, teacher signatures, and principal signatures are available for institution accounts.
          </p>
          <Link href="/settings?tab=billing" className="btn-primary btn-sm btn w-full justify-center">Upgrade now</Link>
        </div>
      )}
    </div>
  )
}
