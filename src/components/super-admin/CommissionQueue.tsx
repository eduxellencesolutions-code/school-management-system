'use client'
// src/components/super-admin/CommissionQueue.tsx
import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export default function CommissionQueue() {
  const [commissions, setCommissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
    await fetch(`/api/platform-staff/commissions/${id}/action`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason }),
    })
    load()
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <div className="card divide-y divide-surface-100">
      {commissions.length === 0 ? <p className="p-6 text-sm text-ink-muted text-center">No commissions.</p> : commissions.map(c => (
        <div key={c.id} className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{c.representativeName} · {c.subscription_plan}</p>
            <p className="text-xs text-ink-faint">₦{Number(c.amount).toLocaleString()} · {c.status} · {new Date(c.created_at).toLocaleDateString('en-NG')}</p>
          </div>
          <div className="flex gap-2">
            {c.status === 'pending' && <button onClick={() => act(c.id, 'approve')} className="btn-sm btn bg-green-50 text-green-600">Approve</button>}
            {(c.status === 'pending' || c.status === 'payable') && <button onClick={() => act(c.id, 'reject')} className="btn-sm btn bg-red-50 text-red-600">Reject</button>}
            {c.status === 'payable' && <button onClick={() => act(c.id, 'mark_paid')} className="btn-primary btn-sm btn">Mark Paid</button>}
          </div>
        </div>
      ))}
    </div>
  )
}