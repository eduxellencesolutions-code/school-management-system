'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { requestDowngrade } from '@/app/(dashboard)/settings/billing/actions'
import type { PlanKey } from '@/lib/plans/config'

interface Props { plan: PlanKey; label: string }

export default function PlanDowngradeCard({ plan, label }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [blockedChecks, setBlockedChecks] = useState<{ label: string; current: number; limit: number | 'unlimited' }[] | null>(null)

  async function handleDowngrade() {
    if (!confirm(`Downgrade to ${label}? This takes effect immediately.`)) return
    setLoading(true)
    const fd = new FormData()
    fd.append('target_plan', plan)
    const result = await requestDowngrade(fd)
    setLoading(false)

    if (!result.success) {
      if (result.checks) {
        setBlockedChecks(result.checks)
      } else {
        toast.error(result.message || 'Failed to downgrade')
      }
      return
    }

    toast.success(`Switched to ${label}`)
    router.refresh()
  }

  return (
    <div className="p-3 border border-surface-200 rounded-lg flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink">{label}</p>
        <button onClick={handleDowngrade} disabled={loading} className="btn-secondary btn-sm btn">
          {loading ? <Loader2 size={13} className="animate-spin" /> : 'Downgrade'}
        </button>
      </div>

      {blockedChecks && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
          <p className="font-medium flex items-center gap-1.5 mb-1.5">
            <AlertTriangle size={13} /> Your current usage exceeds this plan's limits:
          </p>
          <ul className="flex flex-col gap-0.5 ml-5 list-disc">
            {blockedChecks.map(c => (
              <li key={c.label}>{c.label}: {c.current} / {c.limit}</li>
            ))}
          </ul>
          <p className="mt-1.5">Please reduce usage before downgrading.</p>
        </div>
      )}
    </div>
  )
}
