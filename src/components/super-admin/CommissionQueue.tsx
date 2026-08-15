'use client'
// src/components/super-admin/CommissionQueue.tsx
import { useState, useEffect } from 'react'
import { Loader2, Clock, ShieldAlert } from 'lucide-react'

function formatCountdown(holdUntil: string): string {
  const diffMs = new Date(holdUntil).getTime() - Date.now()
  if (diffMs <= 0) return 'Available now'
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0) return `Available in ${days} day${days === 1 ? '' : 's'}`
  return `Available in ${hours} hour${hours === 1 ? '' : 's'}`
}

export default function CommissionQueue({
  canEarlyRelease,
  canVoid,
  canApprove,
}: {
  canEarlyRelease: boolean
  canVoid: boolean
  canApprove: boolean
}) {
  const [commissions, setCommissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tooltipId, setTooltipId] = useState<string | null>(null)
  const [overrideTarget, setOverrideTarget] = useState<any | null>(null)
  const [overrideReason, setOverrideReason] = useState('')
  const [submittingOverride, setSubmittingOverride] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/platform-staff/commissions')
    const data = await res.json()
    setCommissions(data.commissions ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function act(id: string, action: string) {
    const reason = action === 'reject' ? prompt('Reason for rejection?') : null
    const res = await fetch(`/api/platform-staff/commissions/${id}/action`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason }),
    })
    const json = await res.json()
    if (json.error && json.error !== 'holding_period_active') alert(json.error)
    load()
  }

  async function submitOverride() {
    if (!overrideReason.trim()) {
      alert('A reason is required for an early release override')
      return
    }
    if (!confirm(`Confirm early release of ₦${Number(overrideTarget.amount).toLocaleString()} for ${overrideTarget.representativeName}? This bypasses the 14-day holding period and will be permanently logged.`)) {
      return
    }
    setSubmittingOverride(true)
    const res = await fetch(`/api/platform-staff/commissions/${overrideTarget.id}/action`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'early_release', reason: overrideReason }),
    })
    const json = await res.json()
    setSubmittingOverride(false)
    if (json.error) {
      alert(json.error)
      return
    }
    setOverrideTarget(null)
    setOverrideReason('')
    load()
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <>
      <div className="card divide-y divide-surface-100">
        {commissions.length === 0 ? <p className="p-6 text-sm text-ink-muted text-center">No commissions.</p> : commissions.map(c => {
          const isHeld = c.status === 'pending' && new Date(c.hold_until) > new Date()
          return (
            <div key={c.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{c.representativeName} · {c.subscription_plan}</p>
                <p className="text-xs text-ink-faint">
                  ₦{Number(c.amount).toLocaleString()} · {isHeld ? 'Pending (Holding Period)' : c.status} · {new Date(c.created_at).toLocaleDateString('en-NG')}
                </p>
                {isHeld && (
                  <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                    <Clock size={11} /> {formatCountdown(c.hold_until)} · Releases {new Date(c.hold_until).toLocaleDateString('en-NG')}
                  </p>
                )}
              </div>
              <div className="flex gap-2 items-center relative">
                {c.status === 'pending' && !isHeld && canApprove && (
                  <button onClick={() => act(c.id, 'approve')} className="btn-sm btn bg-green-50 text-green-600">Approve</button>
                )}

                {c.status === 'pending' && isHeld && (
                  <div className="relative">
                    <button
                      disabled
                      onMouseEnter={() => setTooltipId(c.id)}
                      onMouseLeave={() => setTooltipId(null)}
                      onClick={() => setTooltipId(tooltipId === c.id ? null : c.id)}
                      className="btn-sm btn bg-surface-100 text-ink-faint cursor-not-allowed"
                    >
                      Approve
                    </button>
                    {tooltipId === c.id && (
                      <div className="absolute right-0 top-full mt-1 w-72 bg-ink text-white text-xs rounded p-3 z-10 shadow-lg">
                        This commission is currently under the mandatory 14-day holding period and cannot be released until {new Date(c.hold_until).toLocaleDateString('en-NG')}. If an exceptional early release is required, contact a Super Administrator or Finance Administrator.
                      </div>
                    )}
                  </div>
                )}

                {isHeld && canEarlyRelease && (
                  <button
                    onClick={() => setOverrideTarget(c)}
                    className="btn-sm btn bg-amber-50 text-amber-700 flex items-center gap-1"
                  >
                    <ShieldAlert size={13} /> Early Release
                  </button>
                )}

                {(c.status === 'pending' || c.status === 'payable') && canVoid && (
                  <button onClick={() => act(c.id, 'reject')} className="btn-sm btn bg-red-50 text-red-600">Reject</button>
                )}

                {c.status === 'payable' && canApprove && (
                  <button onClick={() => act(c.id, 'mark_paid')} className="btn-primary btn-sm btn">Mark Paid</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {overrideTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-5 max-w-md w-full flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-amber-600" />
              <p className="font-semibold text-ink">Early Release Override</p>
            </div>
            <p className="text-sm text-ink-muted">
              {overrideTarget.representativeName} · ₦{Number(overrideTarget.amount).toLocaleString()} · Holding period ends {new Date(overrideTarget.hold_until).toLocaleDateString('en-NG')}
            </p>
            <p className="text-xs text-ink-faint">
              This is an exceptional action. It will be permanently recorded in the audit log with your user ID, timestamp, the original holding date, and this reason.
            </p>
            <textarea
              className="input"
              rows={3}
              placeholder="Reason for early release (required)"
              value={overrideReason}
              onChange={e => setOverrideReason(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setOverrideTarget(null); setOverrideReason('') }}
                className="btn-sm btn bg-surface-100 text-ink-muted"
              >
                Cancel
              </button>
              <button
                onClick={submitOverride}
                disabled={submittingOverride}
                className="btn-sm btn bg-amber-600 text-white flex items-center gap-1.5"
              >
                {submittingOverride && <Loader2 size={13} className="animate-spin" />}
                Confirm Early Release
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}