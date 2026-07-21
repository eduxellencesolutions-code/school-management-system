'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { pdf } from '@react-pdf/renderer'
import { saveAs } from 'file-saver'
import { Download, FileSpreadsheet, FileDown, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { StudentReportCard } from './StudentReportCard'

interface School {
  name: string
  motto?: string
  logo_url?: string
  address?: string
}

interface ReportCardSettings {
  showAttendance: boolean
  showTeacherRemark: boolean
  showSignatoryRemark: boolean
  showSignatorySignature: boolean
  showSchoolSeal: boolean
}

interface Props {
  reportId: string
  groupName: string
  termName: string
  sessionName: string
  learners: any[]
  subjects: any[]
  school: School
  teacherName?: string
  teacherSignature?: string
  principalName?: string
  principalTitle?: string
  principalSignature?: string
  studentRemarks: Record<string, { teacher_remark?: string; principal_remark?: string }>
  generatedDate?: string
  canDownloadPdf: boolean
  isSolo: boolean  // ✅ NEW - account type for layout
  reportCardSettings?: ReportCardSettings
  subjectComponentsMap: Record<string, string[]>
}

export default function ReportDownloadButtons({
  reportId, groupName, termName, sessionName, learners, subjects,
  school, teacherName, teacherSignature, principalName, principalTitle, principalSignature,
  studentRemarks, generatedDate, canDownloadPdf, isSolo, reportCardSettings,  // ✅ add isSolo
  subjectComponentsMap,
}: Props) {
  const [generatingPdf, setGeneratingPdf] = useState(false)

  function downloadCSV() {
    // ✅ Build headers with components
    const headers = ['#', 'Student', 'Adm. No',
      ...subjects.flatMap((s: any) => [
        ...(subjectComponentsMap[s.id] ?? []).map((name: string) => `${s.name} (${name})`),
        `${s.name} (Total)`,
      ]),
      'Total', 'Average', 'Grade', 'Pos.']

    const rows = learners.map((r: any, i: number) => [
      i + 1, `${r.last_name} ${r.first_name}`, r.admission_number ?? '',
      ...subjects.flatMap((s: any) => {
        const detail = r.subject_details?.find((d: any) => d.subject_id === s.id)
        const comps = detail?.component_scores ?? []
        return [...comps.map((c: any) => c.score ?? ''), detail?.total ?? r.subject_totals?.[s.id] ?? '']
      }),
      r.overall_total, r.average, r.grade, r.position,
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${groupName}_${termName}_Broadsheet.csv`; a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded!')
  }

  function downloadExcel() {
    const wb = XLSX.utils.book_new()
    
    // ✅ Build headers with components
    const headerRow = ['#', 'Student', 'Adm. No',
      ...subjects.flatMap((s: any) => [
        ...(subjectComponentsMap[s.id] ?? []).map((name: string) => `${s.name} (${name})`),
        `${s.name} (Total)`,
      ]),
      'Total', 'Average', 'Grade', 'Pos.']

    const titleRows: unknown[][] = [
      [`${groupName} — ${termName} Result Broadsheet`], [],
      headerRow,
    ]

    const dataRows = learners.map((r: any, i: number) => [
      i + 1, `${r.last_name} ${r.first_name}`, r.admission_number ?? '',
      ...subjects.flatMap((s: any) => {
        const detail = r.subject_details?.find((d: any) => d.subject_id === s.id)
        const comps = detail?.component_scores ?? []
        return [...comps.map((c: any) => c.score ?? ''), detail?.total ?? r.subject_totals?.[s.id] ?? '']
      }),
      r.overall_total, r.average, r.grade, r.position,
    ])

    const ws = XLSX.utils.aoa_to_sheet([...titleRows, ...dataRows])
    
    // ✅ Build column widths based on the expanded header
    const totalColumns = headerRow.length
    ws['!cols'] = [
      { wch: 4 },   // #
      { wch: 24 },  // Student
      { wch: 12 },  // Adm. No
      ...Array(totalColumns - 6).fill({ wch: 10 }), // Subject columns
      { wch: 8 },   // Total
      { wch: 8 },   // Average
      { wch: 7 },   // Grade
      { wch: 6 },   // Pos.
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Broadsheet')
    XLSX.writeFile(wb, `${groupName}_${termName}_Broadsheet.xlsx`)
    toast.success('Excel downloaded!')
  }

  async function downloadPDF() {
    // ✅ FIX: Use canDownloadPdf instead of isInstitution
    if (!canDownloadPdf) {
      toast.error('PDF export is not available on your current plan. Upgrade to unlock this feature.')
      return
    }
    if (learners.length === 0) {
      toast.error('No students to export')
      return
    }

    setGeneratingPdf(true)
    const loadingToast = toast.loading(`Generating PDFs for ${learners.length} students…`)

    try {
      const pdfBlobs: { name: string; blob: Blob }[] = []
      const classAverage = learners.length > 0
        ? learners.reduce((sum: number, l: any) => sum + (l.average ?? 0), 0) / learners.length
        : undefined

      for (let i = 0; i < learners.length; i++) {
        const row = learners[i]
        toast.loading(`Generating PDF ${i + 1}/${learners.length}…`, { id: loadingToast })

        const subjectResults = subjects.map((s: any) => {
          const detail = row.subject_details?.find((d: any) => d.subject_id === s.id)
          const components = (detail?.component_scores ?? []).map((c: any) => ({
            name: c.name,
            score: c.score,
            max_score: c.max_score,
          }))

          return {
            subject_id: s.id,
            subject_name: s.name,
            components,
            total: detail?.total ?? row.subject_totals?.[s.id] ?? 0,
            max_score: detail?.max_score ?? 100,
            percentage: detail?.percentage ?? 0,
            grade: detail?.grade ?? '-',
          }
        })

        const remarks = studentRemarks[row.learner_id] ?? {}

        const pdfDoc = (
          <StudentReportCard
            student={{
              first_name: row.first_name,
              last_name: row.last_name,
              admission_number: row.admission_number,
            }}
            school={school}
            results={{
              subjects: subjectResults,
              grand_total: row.overall_total,
              max_possible: subjectResults.reduce((sum, s) => sum + s.max_score, 0),
              average: row.average,
              percentage: row.percentage,
              grade: row.grade,
              position: row.position,
              class_size: learners.length,
              class_average: classAverage,
            }}
            className={groupName}
            termName={termName}
            sessionName={sessionName}
            studentRemarks={remarks}
            teacherName={teacherName}
            teacherSignature={teacherSignature}
            principalName={principalName}
            principalTitle={principalTitle}
            principalSignature={principalSignature}
            reportId={reportId}
            generatedDate={generatedDate}
            showAttendance={reportCardSettings?.showAttendance ?? false}
            showTeacherRemark={reportCardSettings?.showTeacherRemark ?? true}
            showSignatoryRemark={reportCardSettings?.showSignatoryRemark ?? true}
            showSignatorySignature={reportCardSettings?.showSignatorySignature ?? true}
            showSchoolSeal={reportCardSettings?.showSchoolSeal ?? true}
            isSolo={isSolo}  // ✅ ADD THIS
          />
        )

        const blob = await pdf(pdfDoc).toBlob()
        pdfBlobs.push({ name: `${row.last_name}_${row.first_name}_report_card.pdf`, blob })
      }

      toast.dismiss(loadingToast)

      if (pdfBlobs.length === 1) {
        saveAs(pdfBlobs[0].blob, pdfBlobs[0].name)
      } else {
        const zip = new JSZip()
        pdfBlobs.forEach(({ name, blob }) => zip.file(name, blob))
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        saveAs(zipBlob, `${groupName}_${termName}_ResultCards.zip`)
      }
      toast.success(`Downloaded ${pdfBlobs.length} report card${pdfBlobs.length > 1 ? 's' : ''}`)
    } catch (error) {
      console.error('PDF generation error:', error)
      toast.dismiss(loadingToast)
      toast.error('Failed to generate PDFs: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setGeneratingPdf(false)
    }
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <button onClick={downloadCSV} className="btn-secondary btn-sm btn flex items-center gap-1.5">
        <Download size={13} /> CSV
      </button>
      <button onClick={downloadExcel} className="btn-secondary btn-sm btn flex items-center gap-1.5">
        <FileSpreadsheet size={13} /> Excel
      </button>
      {canDownloadPdf && (
        <button onClick={downloadPDF} disabled={generatingPdf} className="btn-primary btn-sm btn flex items-center gap-1.5 disabled:opacity-50">
          {generatingPdf ? <><Loader2 size={13} className="animate-spin" /> Generating…</> : <><FileDown size={13} /> PDF (per student)</>}
        </button>
      )}
    </div>
  )
}
