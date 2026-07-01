'use client'

import * as XLSX from 'xlsx'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  reportId: string
  groupName: string
  termName: string
  learners: any[]
  subjects: any[]
}

export default function ReportDownloadButtons({ reportId, groupName, termName, learners, subjects }: Props) {

  function downloadCSV() {
    const headers = ['#', 'Student', 'Adm. No', ...subjects.map((s: any) => s.name), 'Total', '%', 'Grade', 'Pos.']
    const rows = learners.map((r: any, i: number) => [
      i + 1,
      `${r.last_name} ${r.first_name}`,
      r.admission_number ?? '',
      ...subjects.map((s: any) => r.subject_totals?.[s.id] ?? ''),
      r.overall_total, r.percentage, r.grade, r.position,
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${groupName}_${termName}_Broadsheet.csv`; a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded!')
  }

  function downloadExcel() {
    const wb = XLSX.utils.book_new()
    const titleRows: unknown[][] = [
      [`${groupName} — ${termName} Result Broadsheet`], [],
      ['#', 'Student', 'Adm. No', ...subjects.map((s: any) => s.name), 'Total', '%', 'Grade', 'Pos.'],
    ]
    const dataRows = learners.map((r: any, i: number) => [
      i + 1, `${r.last_name} ${r.first_name}`, r.admission_number ?? '',
      ...subjects.map((s: any) => r.subject_totals?.[s.id] ?? ''),
      r.overall_total, `${r.percentage}%`, r.grade, r.position,
    ])
    const ws = XLSX.utils.aoa_to_sheet([...titleRows, ...dataRows])
    ws['!cols'] = [{ wch: 4 }, { wch: 24 }, { wch: 12 }, ...subjects.map(() => ({ wch: 10 })), { wch: 8 }, { wch: 7 }, { wch: 7 }, { wch: 6 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Broadsheet')
    XLSX.writeFile(wb, `${groupName}_${termName}_Broadsheet.xlsx`)
    toast.success('Excel downloaded!')
  }

  function printPDF() {
    window.print()
    toast.success('Print dialog opened')
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <button onClick={downloadCSV} className="btn-secondary btn-sm btn flex items-center gap-1.5">
        <Download size={13} /> CSV
      </button>
      <button onClick={downloadExcel} className="btn-secondary btn-sm btn flex items-center gap-1.5">
        <FileSpreadsheet size={13} /> Excel
      </button>
      <button onClick={printPDF} className="btn-primary btn-sm btn flex items-center gap-1.5">
        <FileText size={13} /> Print / PDF
      </button>
    </div>
  )
}
