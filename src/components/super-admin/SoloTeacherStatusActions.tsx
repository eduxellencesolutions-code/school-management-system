'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
// Note: You'll need to create these actions in a separate file
// or update the import path to match your actions file
import { updateSoloTeacherStatus, extendSoloTeacherSubscription } from '@/app/(super-admin)/solo-teachers/[id]/actions'

interface Props {
  userId: string
  currentStatus: string
  currentExpiry: string | null
  currentPlan: string
}

export default function SoloTeacherStatusActions({ userId, currentStatus, currentExpiry, currentPlan }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [expiryDate, setExpiryDate] = useState(currentExpiry ? currentExpiry.slice(0, 10) : '')

  async function setStatus(status: string) {
    setLoading(true)
    const fd = new FormData()
    fd.append('user_id', userId)
    fd.append('status', status)
    const result = await updateSoloTeacherStatus(fd)
    setLoading(false)
    if (!result.success) { toast.error(result.message || 'Failed'); return }
    toast.success(`Status set to ${status}`)
    router.refresh()
  }

  async function handleExtend() {
    if (!expiryDate) { toast.error('Pick a date'); return }
    setLoading(true)
    const fd = new FormData()
    fd.append('user_id', userId)
    fd.append('expires_at', expiryDate)
    const result = await extendSoloTeacherSubscription(fd)
    setLoading(false)
    if (!result.success) { toast.error(result.message || 'Failed'); return }
    toast.success('Subscription updated — status set to active')
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 flex-wrap">
        <button 
          onClick={() => setStatus('active')} 
          disabled={loading || currentStatus === 'active'} 
          className="btn-primary btn-sm btn disabled:opacity-50"
        >
          Activate
        </button>
        <button 
          onClick={() => setStatus('cancelled')} 
          disabled={loading || currentStatus === 'cancelled'} 
          className="btn-secondary btn-sm btn disabled:opacity-50"
        >
          Deactivate
        </button>
        <button 
          onClick={() => setStatus('suspended')} 
          disabled={loading || currentStatus === 'suspended'} 
          className="btn-sm btn border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Suspend
        </button>
      </div>

      <div className="flex items-end gap-2 pt-2 border-t border-surface-100">
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">Set new expiry date</label>
          <input 
            type="date" 
            value={expiryDate} 
            onChange={e => setExpiryDate(e.target.value)} 
            className="input input-sm" 
          />
        </div>
        <button onClick={handleExtend} disabled={loading} className="btn-primary btn-sm btn">
          Reactivate / extend
        </button>
      </div>
      <p className="text-xs text-ink-faint">
        Use this to manually reactivate a solo teacher or extend their subscription.
      </p>
    </div>
  )
}
