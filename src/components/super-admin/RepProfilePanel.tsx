'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, ArrowLeft } from 'lucide-react'
import IdCardGenerator from '@/components/representatives/IdCardGenerator'
import RepSchoolPortfolioSection from '@/components/super-admin/RepSchoolPortfolioSection'

export default function RepProfilePanel({ repId }: { repId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/platform-staff/representatives/${repId}`)
    const json = await res.json()
    setData(json)
    setLoading(false)
  }
  useEffect(() => { load() }, [repId])

  async function reviewPhoto(approve: boolean) {
    const declineReason = approve ? null : prompt('Reason for declining this photo?')
    if (!approve && !declineReason) return
    setBusy(true)
    const res = await fetch(`/api/platform-staff/representatives/${repId}/photo/review`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approve, reason: declineReason }),
    })
    const json = await res.json()
    setBusy(false)
    if (json.error) alert(json.error)
    else load()
  }

  async function changeStatus(status: 'active' | 'suspended' | 'terminated') {
    if (status !== 'active' && !reason.trim()) {
      alert('Please provide a reason before suspending or terminating.')
      return
    }
    if (!confirm(`Set status to ${status}?`)) return
    setBusy(true)
    const res = await fetch(`/api/platform-staff/representatives/${repId}/status`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason: reason.trim() || null }),
    })
    const json = await res.json()
    setBusy(false)
    if (json.error) alert(json.error)
    else { setReason(''); load() }
  }

  if (loading || !data) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>
  if (data.error) return <p className="text-sm text-red-600">{data.error}</p>

  const rep = data.representative

  return (
    <div className="flex flex-col gap-6">
      <Link href="/representatives" className="text-xs text-ink-muted flex items-center gap-1 hover:text-ink w-fit">
        <ArrowLeft size={14} /> Back to Representatives
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5">
          <h2 className="font-semibold text-sm text-ink mb-3">Passport Photo</h2>
          {data.signedPhotoUrl ? (
            <img src={data.signedPhotoUrl} alt={rep.full_name} className="w-full rounded-lg border border-surface-200" />
          ) : (
            <div className="aspect-square bg-surface-100 rounded-lg flex items-center justify-center text-xs text-ink-faint">
              No photo submitted
            </div>
          )}
          <div className="mt-3 text-xs">
            <span className={
              rep.photo_status === 'approved' ? 'text-green-600 font-medium' :
              rep.photo_status === 'rejected' ? 'text-red-600 font-medium' :
              rep.photo_status === 'pending_review' ? 'text-amber-600 font-medium' :
              'text-ink-faint'
            }>
              {rep.photo_status === 'pending_review' ? 'Pending Approval' : rep.photo_status.replace('_', ' ')}
            </span>
            {rep.photo_status === 'rejected' && rep.photo_rejection_reason && (
              <p className="text-ink-faint mt-1">Reason: {rep.photo_rejection_reason}</p>
            )}
          </div>
          {rep.photo_status === 'pending_review' && (
            <div className="flex gap-2 mt-3">
              <button disabled={busy} onClick={() => reviewPhoto(true)} className="btn-primary btn-sm btn flex-1">Approve Photo</button>
              <button disabled={busy} onClick={() => reviewPhoto(false)} className="btn-sm btn bg-red-50 text-red-600 flex-1">Decline Photo</button>
            </div>
          )}
        </div>

        <div className="card p-5 lg:col-span-2 space-y-4">
          <div>
            <h2 className="font-semibold text-sm text-ink mb-2">Identity</h2>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-ink-faint">Full Name</dt><dd className="text-ink">{rep.full_name}</dd>
              <dt className="text-ink-faint">Representative ID</dt><dd className="text-ink font-mono">{rep.referral_code}</dd>
              <dt className="text-ink-faint">Email</dt><dd className="text-ink">{rep.email}</dd>
              <dt className="text-ink-faint">Phone</dt><dd className="text-ink">{rep.phone ?? '—'}</dd>
              <dt className="text-ink-faint">Registered</dt><dd className="text-ink">{new Date(rep.joined_at).toLocaleString('en-NG')}</dd>
              <dt className="text-ink-faint">Last Login</dt><dd className="text-ink">{data.lastLogin ? new Date(data.lastLogin).toLocaleString('en-NG') : 'Never'}</dd>
            </dl>
          </div>

          <div>
            <h2 className="font-semibold text-sm text-ink mb-2">Verification</h2>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-ink-faint">Agreement</dt>
              <dd className="text-ink">
                {data.agreement.accepted
                  ? <span className="text-green-600 font-medium">Accepted (v{data.agreement.version})</span>
                  : <span className="text-amber-600 font-medium">Not accepted</span>}
              </dd>
              <dt className="text-ink-faint">Accepted On</dt>
              <dd className="text-ink">{data.agreement.acceptedAt ? new Date(data.agreement.acceptedAt).toLocaleString('en-NG') : '—'}</dd>
            </dl>
          </div>

          <div>
            <h2 className="font-semibold text-sm text-ink mb-2">Performance & Growth</h2>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-ink-faint">Prospects</dt><dd className="text-ink">{data.referrals.length}</dd>
              <dt className="text-ink-faint">Qualified Schools</dt><dd className="text-ink">{rep.qualified_customers_count}</dd>
              <dt className="text-ink-faint">Commission Rate</dt><dd className="text-ink font-semibold">{rep.commission_rate}%</dd>
              <dt className="text-ink-faint">Commission Earned</dt><dd className="text-ink">₦{Number(rep.total_commission_earned).toLocaleString()}</dd>
              <dt className="text-ink-faint">Commission Paid</dt><dd className="text-ink">₦{Number(rep.total_commission_paid).toLocaleString()}</dd>
              <dt className="text-ink-faint">Pending Commission</dt><dd className="text-ink">₦{data.pendingCommission.toLocaleString()}</dd>
            </dl>
          </div>

          <div>
            <h2 className="font-semibold text-sm text-ink mb-2">Account Controls</h2>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              rep.status === 'active' ? 'bg-green-50 text-green-600' :
              rep.status === 'suspended' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
            }`}>{rep.status}</span>
            <input
              placeholder="Reason (required for suspend/terminate)"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm mt-2"
            />
            <div className="flex gap-2 mt-2">
              {rep.status !== 'active' && <button disabled={busy} onClick={() => changeStatus('active')} className="btn-sm btn bg-green-50 text-green-600">Reactivate</button>}
              {rep.status !== 'suspended' && <button disabled={busy} onClick={() => changeStatus('suspended')} className="btn-sm btn bg-amber-50 text-amber-600">Suspend</button>}
              {rep.status !== 'terminated' && <button disabled={busy} onClick={() => changeStatus('terminated')} className="btn-sm btn bg-red-50 text-red-600">Terminate</button>}
            </div>
          </div>
        </div>
      </div>

      <RepSchoolPortfolioSection repId={repId} />

      <div className="card p-5">
        <h2 className="font-semibold text-sm text-ink mb-3">Representative ID Card</h2>
        <IdCardGenerator apiUrl={`/api/platform-staff/representatives/${repId}/id-card`} />
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-sm text-ink mb-3">Approval History / Audit Trail</h2>
        {data.auditHistory.length > 0 ? (
          <div className="divide-y divide-surface-100">
            {data.auditHistory.map((a: any) => (
              <div key={a.id} className="py-2 text-sm">
                <span className="text-ink font-medium">{a.action.replace(/_/g, ' ')}</span>
                <span className="text-ink-faint"> by {a.actorName} · {new Date(a.created_at).toLocaleString('en-NG')}</span>
                {a.reason && <p className="text-xs text-ink-muted mt-0.5">Reason: {a.reason}</p>}
              </div>
            ))}
          </div>
        ) : <p className="text-xs text-ink-faint">No actions recorded yet.</p>}
      </div>
    </div>
  )
}