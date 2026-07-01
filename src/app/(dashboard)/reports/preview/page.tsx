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

// ✅ Force Node.js runtime for Supabase compatibility
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
  organization?: {
    name: string
    logo_url: string | null
    motto: string | null
  }
}

interface SubjectScore {
  subject_id: string
  subject_name: string
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

// Grade calculation function
function getGrade(percentage: number, gradingSystem?: any[]): { grade: string; remark: string } {
  const defaultGrades = [
    { min: 70, max: 100, grade: 'A', remark: 'Excellent' },
    { min: 60, max: 69, grade: 'B', remark: 'Very Good' },
    { min: 50, max: 59, grade: 'C', remark: 'Good' },
    { min: 45, max: 49, grade: 'D', remark: 'Fair' },
    { min: 40, max: 44, grade: 'E', remark: 'Pass' },
    { min: 0, max: 39, grade: 'F', remark: 'Fail' },
  ]

  const grades = gradingSystem || defaultGrades
  for (const g of grades) {
    if (percentage >= g.min && percentage <= g.max) {
      return { grade: g.grade, remark: g.remark || '' }
    }
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
  const [gradingSystem, setGradingSystem] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)

  const supabase = createClient()

  useEffect(() => {
    if (!reportId) {
      toast.error('No report ID provided')
      router.push('/reports')
      return
    }

    async function fetchReportData() {
      setLoading(true)
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) {
          router.push('/login')
          return
        }

        const { data: profileData } = await supabase
          .from('users')
          .select('*, organization:organizations(*)')
          .eq('id', userData.user.id)
          .single()

        setProfile(profileData)

        const isInst = profileData?.organization?.type === 'school' && 
          profileData?.organization?.subscription_status === 'active'
        setIsInstitution(isInst)

        if (profileData?.organization_id) {
          const { data: grades } = await supabase
            .from('grading_systems')
            .select('*')
            .eq('organization_id', profileData.organization_id)
            .order('min_score', { ascending: false })

          if (grades && grades.length > 0) {
            setGradingSystem(grades.map(g => ({
              min: g.min_score,
              max: g.max_score,
              grade: g.grade_letter,
              remark: g.remark
            })))
          }
        }

        const { data: reportData, error: reportError } = await supabase
          .from('reports')
          .select(`
            *,
            group:groups(name),
            learner:learners(first_name, last_name),
            created_by_user:users(name),
            organization:organizations(name, logo_url, motto)
          `)
          .eq('id', reportId)
          .single()

        if (reportError) throw reportError
        setReport(reportData)

        if (reportData.group_id) {
          await fetchLearnerResults(reportData.group_id)
        }

        if (reportData.status === 'processing') {
          await supabase
            .from('reports')
            .update({ 
              status: 'completed', 
              completed_at: new Date().toISOString() 
            })
            .eq('id', reportId)
        }

      } catch (error) {
        console.error('Error fetching report:', error)
        toast.error('Failed to load report data')
      } finally {
        setLoading(false)
      }
    }

    fetchReportData()
  }, [reportId, supabase, router])

  async function fetchLearnerResults(groupId: string) {
    try {
      const { data: learnersData } = await supabase
        .from('learners')
        .select(`
          id,
          first_name,
          last_name,
          admission_number
        `)
        .eq('group_id', groupId)
        .eq('is_active', true)
        .order('last_name')

      if (!learnersData || learnersData.length === 0) {
        setLearners([])
        return
      }

      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .order('name')

      const subjectIds = subjectsData?.map(s => s.id) || []
      const learnerIds = learnersData.map(l => l.id)

      let scoresData: { learner_id: string; subject_id: string; score: number }[] = []
      if (learnerIds.length > 0 && subjectIds.length > 0) {
        const { data } = await supabase
          .from('scores')
          .select('learner_id, subject_id, score')
          .in('learner_id', learnerIds)
          .in('subject_id', subjectIds)

        scoresData = data || []
      }

      const results: LearnerResult[] = learnersData.map(learner => {
        const subjectScores: SubjectScore[] = subjectIds.map(subjectId => {
          const subject = subjectsData.find(s => s.id === subjectId)
          const score = scoresData.find(s => s.learner_id === learner.id && s.subject_id === subjectId)
          const total = score?.score || 0
          const maxScore = 100
          const percentage = maxScore > 0 ? (total / maxScore) * 100 : 0
          const gradeResult = getGrade(percentage, gradingSystem)

          return {
            subject_id: subjectId,
            subject_name: subject?.name || 'Unknown',
            total,
            max_score: maxScore,
            percentage,
            grade: gradeResult.grade,
            remark: gradeResult.remark
          }
        })

        const totalScore = subjectScores.reduce((sum, s) => sum + s.total, 0)
        const maxPossible = subjectScores.length * 100
        const percentage = maxPossible > 0 ? (totalScore / maxPossible) * 100 : 0
        const gradeResult = getGrade(percentage, gradingSystem)

        return {
          ...learner,
          scores: subjectScores,
          total_score: totalScore,
          max_possible: maxPossible,
          percentage,
          grade: gradeResult.grade,
          position: 0,
          teacher_remark: '',
          principal_remark: ''
        }
      })

      results.sort((a, b) => b.percentage - a.percentage)
      results.forEach((l, index) => {
        l.position = index + 1
      })

      setLearners(results)
    } catch (error) {
      console.error('Error fetching learner results:', error)
      toast.error('Failed to load learner results')
    }
  }

  const handleExportCSV = async () => {
    setExporting('csv')
    try {
      const headers = ['Position', 'Student', 'Admission Number']
      const subjectNames = learners[0]?.scores.map(s => s.subject_name) || []
      headers.push(...subjectNames)
      headers.push('Total', 'Percentage', 'Grade')

      const rows = learners.map(learner => {
        const row = [
          learner.position,
          `${learner.last_name} ${learner.first_name}`,
          learner.admission_number
        ]
        learner.scores.forEach(s => {
          row.push(s.total)
        })
        row.push(learner.total_score.toFixed(2))
        row.push(learner.percentage.toFixed(2))
        row.push(learner.grade)
        return row
      })

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      saveAs(blob, `report_${report?.group?.name || 'class'}_${new Date().toISOString().slice(0,10)}.csv`)
      toast.success('CSV exported successfully')
    } catch (error) {
      console.error('Error exporting CSV:', error)
      toast.error('Failed to export CSV')
    } finally {
      setExporting(null)
    }
  }

  const handleExportExcel = async () => {
    setExporting('excel')
    try {
      const wb = XLSX.utils.book_new()

      const headers = ['Position', 'Student', 'Admission Number']
      const subjectNames = learners[0]?.scores.map(s => s.subject_name) || []
      headers.push(...subjectNames)
      headers.push('Total', 'Percentage', 'Grade')

      const data = [
        headers,
        ...learners.map(learner => {
          const row = [
            learner.position,
            `${learner.last_name} ${learner.first_name}`,
            learner.admission_number
          ]
          learner.scores.forEach(s => {
            row.push(s.total)
          })
          row.push(learner.total_score.toFixed(2))
          row.push(learner.percentage.toFixed(2))
          row.push(learner.grade)
          return row
        })
      ]

      const ws = XLSX.utils.aoa_to_sheet(data)
      XLSX.utils.book_append_sheet(wb, ws, 'Broadsheet')

      const summaryData = [
        ['Report Summary'],
        ['Class', report?.group?.name || ''],
        ['Total Students', learners.length],
        ['Total Subjects', learners[0]?.scores.length || 0],
        ['Generated', new Date().toISOString().slice(0, 10)],
        [],
        ['Grade Distribution'],
        ['Grade', 'Count', 'Percentage']
      ]

      const gradeCount: Record<string, number> = {}
      learners.forEach(l => {
        gradeCount[l.grade] = (gradeCount[l.grade] || 0) + 1
      })
      Object.entries(gradeCount).forEach(([grade, count]) => {
        summaryData.push([grade, count, ((count / learners.length) * 100).toFixed(1) + '%'])
      })

      const ws2 = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(wb, ws2, 'Summary')

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, `report_${report?.group?.name || 'class'}_${new Date().toISOString().slice(0,10)}.xlsx`)
      toast.success('Excel exported successfully')
    } catch (error) {
      console.error('Error exporting Excel:', error)
      toast.error('Failed to export Excel')
    } finally {
      setExporting(null)
    }
  }

  // ✅ UPDATED: PDF Export using @react-pdf/renderer
  const handleExportPDF = async () => {
    if (!isInstitution) {
      toast.error('PDF export is only available for institution accounts')
      return
    }

    if (learners.length === 0) {
      toast.error('No students to export')
      return
    }

    setExporting('pdf')
    const loadingToast = toast.loading(`Generating PDFs for ${learners.length} students...`)

    try {
      const org = profile?.organization
      const teacherName = profile?.name || 'Teacher'
      const principalName = org?.name ? `Principal, ${org.name}` : 'Principal'

      // Get term and session - you may want to fetch these from your DB
      const termName = 'First Term'
      const sessionName = '2024/2025 Session'

      const pdfBlobs: Blob[] = []
      const totalStudents = learners.length

      for (let i = 0; i < totalStudents; i++) {
        const student = learners[i]
        
        toast.loading(`Generating PDF ${i + 1}/${totalStudents}...`, { id: loadingToast })

        const pdfDoc = (
          <StudentReportCard
            student={student}
            schoolName={org?.name || 'Eduxellence School'}
            schoolLogo={org?.logo_url || undefined}
            schoolMotto={org?.motto || undefined}
            className={report?.group?.name || 'Class'}
            termName={termName}
            sessionName={sessionName}
            teacherName={teacherName}
            teacherSignature={profile?.signature_url || undefined}
            principalName={principalName}
            principalSignature={org?.signature_url || undefined}
          />
        )

        const blob = await pdf(pdfDoc).toBlob()
        pdfBlobs.push(blob)
      }

      toast.dismiss(loadingToast)

      if (pdfBlobs.length === 1) {
        saveAs(pdfBlobs[0], `${learners[0].last_name}_${learners[0].first_name}_report_card.pdf`)
        toast.success('PDF downloaded successfully')
      } else {
        // Create a zip file for multiple PDFs
        const zip = new JSZip()
        pdfBlobs.forEach((blob, index) => {
          const student = learners[index]
          zip.file(
            `${student.last_name}_${student.first_name}_report_card.pdf`, 
            blob
          )
        })
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        saveAs(zipBlob, `reports_${report?.group?.name}_${new Date().toISOString().slice(0,10)}.zip`)
        toast.success(`Downloaded ${pdfBlobs.length} report cards`)
      }

    } catch (error) {
      console.error('Error exporting PDF:', error)
      toast.dismiss(loadingToast)
      toast.error('Failed to generate PDFs. Please try again.')
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
        <Link href="/reports" className="btn-primary btn-sm btn">
          Back to reports
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/reports" className="text-sm text-ink-muted hover:text-brand-500 flex items-center gap-1 mb-1">
            <ArrowLeft size={14} /> Back to reports
          </Link>
          <h1 className="page-title">Report Preview</h1>
          <p className="page-subtitle">
            {report.group?.name} · {learners.length} students · {learners[0]?.scores.length || 0} subjects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={exporting === 'csv' || learners.length === 0}
            className="btn-secondary btn-sm btn flex items-center gap-1"
          >
            {exporting === 'csv' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            CSV
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exporting === 'excel' || learners.length === 0}
            className="btn-secondary btn-sm btn flex items-center gap-1"
          >
            {exporting === 'excel' ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
            Excel
          </button>
          {isInstitution && (
            <button
              onClick={handleExportPDF}
              disabled={exporting === 'pdf' || learners.length === 0}
              className="btn-primary btn-sm btn flex items-center gap-1"
            >
              {exporting === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
              PDF
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="btn-secondary btn-sm btn flex items-center gap-1"
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* Institution Badge */}
      {isInstitution && (
        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full self-start">
          <CheckCircle size={14} />
          Institution account · PDF export enabled
        </div>
      )}

      {/* Broadsheet Table */}
      <div className="card" id="report-content">
        <div className="card-header">
          <h2 className="font-semibold text-sm text-ink flex items-center gap-2">
            <FileText size={16} className="text-ink-muted" />
            Class Broadsheet
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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-surface-300 bg-surface-50">
                  <th className="text-center px-2 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider sticky left-0 bg-surface-50 z-10 w-12">
                    #
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider sticky left-12 bg-surface-50 z-10 min-w-[120px]">
                    Student
                  </th>
                  <th className="text-left px-2 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    Admission
                  </th>
                  {learners[0]?.scores.map((subject) => (
                    <th key={subject.subject_id} className="text-center px-2 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider min-w-[50px]">
                      {subject.subject_name.slice(0, 4)}
                    </th>
                  ))}
                  <th className="text-center px-3 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider bg-surface-50">
                    Total
                  </th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider bg-surface-50">
                    %
                  </th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider bg-surface-50">
                    Grade
                  </th>
                </tr>
              </thead>
              <tbody>
                {learners.map((learner) => (
                  <tr key={learner.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                    <td className="text-center px-2 py-2.5 text-ink-muted font-mono text-xs sticky left-0 bg-white">
                      {learner.position}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-ink sticky left-12 bg-white whitespace-nowrap">
                      {`${learner.last_name} ${learner.first_name}`}
                    </td>
                    <td className="px-2 py-2.5 text-ink-muted text-xs font-mono">
                      {learner.admission_number || '—'}
                    </td>
                    {learner.scores.map((subject) => (
                      <td key={subject.subject_id} className="text-center px-2 py-2.5 font-mono text-sm">
                        {subject.total > 0 ? (
                          <span className={subject.percentage >= 50 ? 'text-ink' : 'text-red-500'}>
                            {subject.total}
                          </span>
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>
                    ))}
                    <td className="text-center px-3 py-2.5 font-mono font-semibold bg-surface-50/50">
                      {learner.total_score.toFixed(1)}
                    </td>
                    <td className="text-center px-3 py-2.5 font-mono font-semibold bg-surface-50/50">
                      {learner.percentage.toFixed(1)}%
                    </td>
                    <td className="text-center px-3 py-2.5 font-bold bg-surface-50/50">
                      <span className={`
                        px-2 py-0.5 rounded text-xs
                        ${learner.grade === 'A' ? 'bg-green-100 text-green-800' : ''}
                        ${learner.grade === 'B' ? 'bg-blue-100 text-blue-800' : ''}
                        ${learner.grade === 'C' ? 'bg-amber-100 text-amber-800' : ''}
                        ${learner.grade === 'D' ? 'bg-orange-100 text-orange-800' : ''}
                        ${learner.grade === 'E' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${learner.grade === 'F' ? 'bg-red-100 text-red-800' : ''}
                      `}>
                        {learner.grade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-surface-300 bg-surface-50">
                  <td colSpan={3 + (learners[0]?.scores.length || 0) + 2} className="px-3 py-2 text-xs text-ink-muted">
                    Average: {(learners.reduce((sum, l) => sum + l.percentage, 0) / (learners.length || 1)).toFixed(1)}%
                  </td>
                  <td className="text-center px-3 py-2 text-xs text-ink-muted">
                    Highest: {Math.max(...learners.map(l => l.percentage)).toFixed(1)}%
                  </td>
                  <td className="text-center px-3 py-2 text-xs text-ink-muted">
                    Lowest: {Math.min(...learners.map(l => l.percentage)).toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Export Notice for Teachers */}
      {!isInstitution && (
        <div className="card p-5 bg-brand-50 border-brand-200">
          <div className="flex items-center gap-2 mb-2">
            <FileDown size={15} className="text-brand-600" />
            <span className="text-xs font-semibold text-brand-700 uppercase tracking-wider">Upgrade for PDF Reports</span>
          </div>
          <p className="text-xs text-brand-700 leading-relaxed mb-3">
            PDF report cards with your school logo, teacher signatures, and principal signatures are available for institution accounts.
            Upgrade to Small School plan starting at ₦10,000/year.
          </p>
          <Link href="/settings?tab=billing" className="btn-primary btn-sm btn w-full justify-center">
            Upgrade now
          </Link>
        </div>
      )}
    </div>
  )
}
