'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { updateSchoolStatus, extendSubscription, changeSchoolPlan } from '@/app/(super-admin)/schools/[id]/actions'

interface Props {
  orgId: string
  currentStatus: string
  currentExpiry: string | null
  currentPlan: string
}

const PLANS = ['free', 'small_school', 'standard_school', 'premium_school']

export default function SchoolStatusActions({ orgId, currentStatus, currentExpiry, currentPlan }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [expiryDate, setExpiryDate] = useState(currentExpiry ? currentExpiry.slice(0, 10) : '')
  const [plan, setPlan] = useState(currentPlan)

  async function setStatus(status: string) {
    setLoading(true)
    const fd = new FormData()
    fd.append('org_id', orgId)
    fd.append('status', status)
    const result = await updateSchoolStatus(fd)
    setLoading(false)
    if (!result.success) { toast.error(result.message || 'Failed'); return }
    toast.success(`Status set to ${status}`)
    router.refresh()
  }

  async function handleExtend() {
    if (!expiryDate) { toast.error('Pick a date'); return }
    setLoading(true)
    const fd = new FormData()
    fd.append('org_id', orgId)
    fd.append('expires_at', expiryDate)
    const result = await extendSubscription(fd)
    setLoading(false)
    if (!result.success) { toast.error(result.message || 'Failed'); return }
    toast.success('Subscription updated — status set to active')
    router.refresh()
  }

  async function handlePlanChange(newPlan: string) {
    setPlan(newPlan)
    setLoading(true)
    const fd = new FormData()
    fd.append('org_id', orgId)
    fd.append('plan', newPlan)
    const result = await changeSchoolPlan(fd)
    setLoading(false)
    if (!result.success) { toast.error(result.message || 'Failed'); return }
    toast.success(`Plan set to ${newPlan}`)
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
          <label className="block text-xs font-medium text-ink-muted mb-1">Manually set subscription expiry</label>
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

      <div className="pt-2 border-t border-surface-100">
        <label className="block text-xs font-medium text-ink-muted mb-1">Plan</label>
        <select
          value={plan}
          onChange={e => handlePlanChange(e.target.value)}
          disabled={loading}
          className="input input-sm"
        >
          {PLANS.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <p className="text-xs text-ink-faint">
        Use this if a school paid but the automatic reactivation didn't trigger.
      </p>
    </div>
  )
}
