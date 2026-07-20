'use client'

import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { approveReport } from '@/app/(dashboard)/reports/[id]/actions'
import toast from 'react-hot-toast'

interface Props {
  reportId: string
}

export default function ApproveButton({ reportId }: Props) {
  const router = useRouter()

  async function handleApprove() {
    const formData = new FormData()
    formData.append('id', reportId)
    
    const result = await approveReport(formData)
    
    if (result.success) {
      toast.success('Report approved successfully!')
      router.refresh()
    } else {
      toast.error(result.message || 'Failed to approve report')
    }
  }

  return (
    <button
      onClick={handleApprove}
      className="btn-success btn-sm btn flex items-center gap-1"
    >
      <CheckCircle2 size={14} /> Approve
    </button>
  )
}
