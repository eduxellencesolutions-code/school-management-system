'use client'
// src/components/super-admin/WithdrawalQueue.tsx
import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

type Action = 'approve' | 'reject' | 'verify_payout' | 'mark_paid'

const naira = (n: number | string | null | undefined) => `₦${Number(n ?? 0).toLocaleString()}`
const payAmount = (w: any) => Number(w.amount_claimed ?? w.amount_requested)

export default function WithdrawalQueue() {
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/platform-staff/withdrawals')
    const data = await res.json()
    setWithdrawals(data.withdrawals ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function act(w: any, action: Action) {
    let reason: string | null = null
    let paymentReference: string | null = null
    let note: string | null = null

    if (action === 'reject') {
      reason = prompt('Reason for rejection?')
      if (!reason) return
    }
    if (action === 'verify_payout') {
      note = prompt('Verification note — what did you check against the bank record?')
      if (!note) return
    }
    if (action === 'mark_paid') {
      const ok = confirm(`Pay exactly ${naira(payAmount(w))} to ${w.bank_account_name_snapshot} — ${w.bank_name_snapshot} ${w.bank_account_number_snapshot}?`)
      if (!ok) return
      paymentReference = prompt('Payment reference (bank transfer ID)?')
      if (!paymentReference) return
    }

    setBusyId(w.id)
    const res = await fetch(`/api/platform-staff/withdrawals/${w.id}/action`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason, paymentReference, note }),
    })
    const json = await res.json()
    setBusyId(null)
    if (json.error) alert(json.error)
    load()
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <div className="card divide-y divide-surface-100">
      {withdrawals.length === 0 ? <p className="p-6 text-sm text-ink-muted text-center">No withdrawals.</p> : withdrawals.map(w => {
        const differs = w.amount_claimed != null && Number(w.amount_claimed) !== Number(w.amount_requested)
        const verified = !!w.payout_verified_at
        const busy = busyId === w.id
        return (
          <div key={w.id} className="p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">
                {w.representativeName} · Pay {naira(payAmount(w))}
                {differs && <span className="text-xs text-ink-faint ml-1">(requested {naira(w.amount_requested)})</span>}
                {w.requires_finance_approval && <span className="text-xs text-amber-600 ml-1">(Finance approval)</span>}
              </p>
              <p className="text-xs text-ink-faint">
                {w.status}
                {w.status === 'approved' && (verified ? ' · payout verified' : ' · awaiting payout verification')}
                {' · '}{new Date(w.date_requested).toLocaleDateString('en-NG')}
                {w.rejection_reason && ` · ${w.rejection_reason}`}
                {w.payment_reference && ` · Ref: ${w.payment_reference}`}
              </p>
              {w.status === 'approved' && (
                <p className="text-xs text-ink-muted mt-0.5">
                  {w.bank_account_name_snapshot} · {w.bank_name_snapshot} · {w.bank_account_number_snapshot}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {(w.status === 'pending' || w.status === 'under_review') && (
                <button disabled={busy} onClick={() => act(w, 'approve')} className="btn-sm btn bg-green-50 text-green-600">Approve</button>
              )}
              {w.status === 'approved' && !verified && (
                <button disabled={busy} onClick={() => act(w, 'verify_payout')} className="btn-sm btn bg-blue-50 text-blue-600">Verify payout</button>
              )}
              {w.status === 'approved' && verified && (
                <button disabled={busy} onClick={() => act(w, 'mark_paid')} className="btn-primary btn-sm btn">Mark Paid</button>
              )}
              {(w.status === 'pending' || w.status === 'under_review' || w.status === 'approved') && (
                <button disabled={busy} onClick={() => act(w, 'reject')} className="btn-sm btn bg-red-50 text-red-600">Reject</button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}