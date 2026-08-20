'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Loader2, Users, Clock, CheckCircle2, XCircle, FileWarning, UserCheck } from 'lucide-react'
import PassportReview from '@/components/super-admin/PassportReview'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending_photo', label: 'Pending Photo' },
  { key: 'photo_approved', label: 'Photo Approved' },
  { key: 'photo_declined', label: 'Photo Declined' },
  { key: 'agreement_pending', label: 'Agreement Not Accepted' },
  { key: 'active', label: 'Active' },
  { key: 'suspended', label: 'Suspended' },
] as const

export default function RepManagementCentre() {
  const [reps, setReps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/platform-staff/representatives')
    const json = await res.json()
    setReps(json.representatives ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const summary = useMemo(() => ({
    total: reps.length,
    pendingPhoto: reps.filter(r => r.photo_status === 'pending_review').length,
    approvedPhoto: reps.filter(r => r.photo_status === 'approved').length,
    declinedPhoto: reps.filter(r => r.photo_status === 'rejected').length,
    agreementPending: reps.filter(r => !r.agreementAccepted).length,
    active: reps.filter(r => r.status === 'active').length,
  }), [reps])

  const filtered = useMemo(() => {
    let list = reps
    if (filter === 'pending_photo') list = list.filter(r => r.photo_status === 'pending_review')
    else if (filter === 'photo_approved') list = list.filter(r => r.photo_status === 'approved')
    else if (filter === 'photo_declined') list = list.filter(r => r.photo_status === 'rejected')
    else if (filter === 'agreement_pending') list = list.filter(r => !r.agreementAccepted)
    else if (filter === 'active') list = list.filter(r => r.status === 'active')
    else if (filter === 'suspended') list = list.filter(r => r.status === 'suspended')

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(r =>
        r.full_name?.toLowerCase().includes(q) ||
        r.referral_code?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q)
      )
    }
    return list
  }, [reps, filter, search])

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

  const cards = [
    { key: 'all', label: 'Total Representatives', value: summary.total, icon: Users, color: 'text-brand-500', bg: 'bg-brand-50' },
    { key: 'pending_photo', label: 'Pending Photo Approval', value: summary.pendingPhoto, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { key: 'photo_approved', label: 'Approved Photos', value: summary.approvedPhoto, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { key: 'photo_declined', label: 'Declined Photos', value: summary.declinedPhoto, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { key: 'agreement_pending', label: 'Agreement Pending', value: summary.agreementPending, icon: FileWarning, color: 'text-orange-600', bg: 'bg-orange-50' },
    { key: 'active', label: 'Active Representatives', value: summary.active, icon: UserCheck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {cards.map(c => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={`card p-4 text-left transition-shadow hover:shadow-md ${filter === c.key ? 'ring-2 ring-brand-500' : ''}`}
          >
            <div className={`w-9 h-9 rounded ${c.bg} flex items-center justify-center mb-2`}>
              <c.icon size={18} className={c.color} />
            </div>
            <div className="text-xl font-bold text-ink">{c.value}</div>
            <div className="text-xs text-ink-muted">{c.label}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs px-3 py-1.5 rounded-full border ${filter === f.key ? 'bg-ink text-white border-ink' : 'border-surface-200 text-ink-muted hover:bg-surface-50'}`}
          >
            {f.label}
          </button>
        ))}
        <input
          placeholder="Search name, ID, email, phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ml-auto border rounded px-3 py-1.5 text-xs w-64"
        />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-50 border-b border-surface-200">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Representative</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Rep ID</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Account</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Agreement</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Passport</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Growth Level</th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Qualified</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Pending ₦</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-b border-surface-100">
                <td className="px-4 py-3 font-medium">{r.full_name}<div className="text-xs text-ink-faint">{r.email}</div></td>
                <td className="px-4 py-3 text-ink-muted font-mono text-xs">{r.referral_code}</td>
                <td className="px-4 py-3">
                  <span className={
                    r.status === 'active' ? 'text-green-600 font-medium' :
                    r.status === 'suspended' ? 'text-amber-600 font-medium' : 'text-red-600 font-medium'
                  }>{r.status}</span>
                </td>
                <td className="px-4 py-3">
                  {r.agreementAccepted ? (
                    <span className="text-green-600 text-xs font-medium">Accepted v{r.agreementVersion}</span>
                  ) : (
                    <span className="text-amber-600 text-xs font-medium">Not accepted</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <PassportReview rep={r} onDone={load} />
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-medium text-ink">{r.growthLabel}</span>
                  <div className="text-xs text-ink-faint">{r.commission_rate}% · {r.qualified_customers_count} schools</div>
                </td>
                <td className="px-4 py-3 text-center font-mono">{r.qualifiedReferrals}</td>
                <td className="px-4 py-3 text-right font-mono">₦{r.pendingCommission.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/representatives/${r.id}`} className="text-xs text-indigo-600 font-medium">View Profile</Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-ink-faint text-sm">No representatives match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}