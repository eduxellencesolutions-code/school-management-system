'use client'
// src/components/super-admin/WithdrawalQueue.tsx
import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export default function WithdrawalQueue() {
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/platform-staff/withdrawals')
    const data = await res.json()
    setWithdrawals(data.withdrawals ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function act(id: string, action: string) {
    const reason = action === 'reject' ? prompt('Reason for rejection?') : null
    const paymentReference = action === 'mark_paid' ? prompt('Payment reference (bank transfer ID)?') : null
    if (action === 'mark_paid' && !paymentReference) return
    if (action === 'reject' && !reason) return

    const res = await fetch(`/api/platform-staff/withdrawals/${id}/action`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason, paymentReference }),
    })
    const json = await res.json()
    if (json.error) alert(json.error)
    load()
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <div className="card divide-y divide-surface-100">
      {withdrawals.length === 0 ? <p className="p-6 text-sm text-ink-muted text-center">No withdrawals.</p> : withdrawals.map(w => (
        <div key={w.id} className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">
              {w.representativeName} · ₦{Number(w.amount_requested).toLocaleString()}
              {w.requires_finance_approval && <span className="text-xs text-amber-600 ml-1">(Finance approval)</span>}
            </p>
            <p className="text-xs text-ink-faint">
              {w.status} · {new Date(w.date_requested).toLocaleDateString('en-NG')}
              {w.rejection_reason && ` · ${w.rejection_reason}`}
              {w.payment_reference && ` · Ref: ${w.payment_reference}`}
            </p>
          </div>
          <div className="flex gap-2">
            {(w.status === 'pending' || w.status === 'under_review') && (
              <button onClick={() => act(w.id, 'approve')} className="btn-sm btn bg-green-50 text-green-600">Approve</button>
            )}
            {(w.status === 'pending' || w.status === 'under_review' || w.status === 'approved') && (
              <button onClick={() => act(w.id, 'reject')} className="btn-sm btn bg-red-50 text-red-600">Reject</button>
            )}
            {w.status === 'approved' && (
              <button onClick={() => act(w.id, 'mark_paid')} className="btn-primary btn-sm btn">Mark Paid</button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}