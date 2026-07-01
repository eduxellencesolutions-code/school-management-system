'use client'

import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deleteReport } from '@/app/(dashboard)/reports/actions'

interface Props {
  reportId: string
  reportName: string
}

export default function DeleteReportButton({ reportId, reportName }: Props) {
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete this report for ${reportName}?`)) {
      return
    }

    const formData = new FormData()
    formData.append('id', reportId)
    await deleteReport(formData)
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      className="btn-sm btn border border-red-200 text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1"
    >
      <Trash2 size={14} /> Delete
    </button>
  )
}
