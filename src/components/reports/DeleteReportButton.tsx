'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { softDeleteReport } from '@/app/(dashboard)/reports/[id]/actions'
import toast from 'react-hot-toast'

interface Props {
  reportId: string
  reportName: string
  canDelete: boolean
}

export default function DeleteReportButton({ reportId, reportName, canDelete }: Props) {
  const [isDeleting, setIsDeleting] = useState(false)

  if (!canDelete) return null

  const handleDelete = async () => {
    if (!confirm(`Move the report for "${reportName}" to Trash? An administrator can restore it later.`)) return
    setIsDeleting(true)
    try {
      const formData = new FormData()
      formData.append('id', reportId)
      const result = await softDeleteReport(formData)
      if (!result.success) {
        toast.error(result.message || 'Failed to delete report')
        return
      }
      toast.success('Report moved to Trash')
      window.location.reload()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete report. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="btn-sm btn border border-red-200 text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1 disabled:opacity-50"
    >
      <Trash2 size={14} /> {isDeleting ? 'Deleting...' : 'Delete'}
    </button>
  )
}
