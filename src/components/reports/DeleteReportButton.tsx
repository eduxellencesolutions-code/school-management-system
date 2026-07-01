'use client'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteReport } from '@/app/(dashboard)/reports/actions'
import toast from 'react-hot-toast'

interface Props {
  reportId: string
  reportName: string
}

export default function DeleteReportButton({ reportId, reportName }: Props) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete this report for ${reportName}?`)) return

    setIsDeleting(true)
    try {
      const formData = new FormData()
      formData.append('id', reportId)

      const result = await deleteReport(formData)

      if (!result.success) {
        toast.error(result.message || 'Failed to delete report')
        return
      }

      toast.success('Report deleted')
      // Wait for server action + revalidation to complete, then reload
      await new Promise(r => setTimeout(r, 500))
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
