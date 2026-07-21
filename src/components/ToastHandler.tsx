'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import toast from 'react-hot-toast'

export default function ToastHandler() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    
    if (success === 'restored') {
      toast.success('✅ Report restored successfully')
    } else if (success === 'emptied') {
      toast.success('🗑️ Trash emptied successfully')
    }
    
    if (error === 'unauthorized') {
      toast.error('🔒 You do not have permission to perform this action')
    } else if (error === 'not_found') {
      toast.error('📄 Report not found')
    } else if (error === 'failed') {
      toast.error('❌ Operation failed. Please try again.')
    } else if (error === 'missing_id') {
      toast.error('⚠️ Report ID is required')
    }
  }, [searchParams])

  return null
}
