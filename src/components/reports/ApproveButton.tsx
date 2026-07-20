'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { approveReport } from '@/app/(dashboard)/reports/[id]/actions'
import toast from 'react-hot-toast'

interface Props {
  reportId: string
}

export default function ApproveButton({ reportId }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function handleApprove() {
    // Prevent multiple clicks
    if (isLoading) return
    
    setIsLoading(true)
    const formData = new FormData()
    formData.append('id', reportId)
    
    try {
      const result = await approveReport(formData)
      
      if (result.success) {
        toast.success('Report approved successfully!')
        router.refresh()
      } else {
        toast.error(result.message || 'Failed to approve report')
      }
    } catch (err) {
      console.error('Approve error:', err)
      toast.error('Something went wrong while approving this report')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleApprove}
      disabled={isLoading}
      className="btn-success btn-sm btn flex items-center gap-1 disabled:opacity-50"
    >
      {isLoading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <CheckCircle2 size={14} />
      )}
      {isLoading ? 'Approving...' : 'Approve'}
    </button>
  )
}
