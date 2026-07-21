'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { softDeleteReport } from '@/app/(dashboard)/reports/[id]/actions'
import toast from 'react-hot-toast'

interface Props {
  reportId: string
  reportName: string
  canDelete: boolean
  isPermanent?: boolean  // ✅ NEW - for permanent delete in trash
}

export default function DeleteReportButton({ reportId, reportName, canDelete, isPermanent = false }: Props) {
  const [isDeleting, setIsDeleting] = useState(false)

  if (!canDelete) return null

  const handleDelete = async () => {
    const confirmMessage = isPermanent
      ? `Are you sure you want to permanently delete the report for "${reportName}"? This action cannot be undone.`
      : `Move the report for "${reportName}" to Trash? An administrator can restore it later.`
    
    if (!confirm(confirmMessage)) return
    
    setIsDeleting(true)
    try {
      const formData = new FormData()
      formData.append('id', reportId)
      
      // If permanent, we need to use a different action
      // For now, we'll use softDeleteReport and handle it differently
      // or we could pass a permanent flag
      formData.append('permanent', isPermanent ? 'true' : 'false')
      
      const result = await softDeleteReport(formData)
      if (!result.success) {
        toast.error(result.message || 'Failed to delete report')
        return
      }
      
      const successMessage = isPermanent 
        ? 'Report permanently deleted' 
        : 'Report moved to Trash'
      
      toast.success(successMessage)
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
      className={`btn-sm btn border ${isPermanent ? 'border-red-300 text-red-700 hover:bg-red-50' : 'border-red-200 text-red-600 hover:bg-red-50'} transition-colors flex items-center gap-1 disabled:opacity-50`}
    >
      <Trash2 size={14} /> 
      {isDeleting ? 'Deleting...' : isPermanent ? 'Delete' : 'Delete'}
    </button>
  )
}
