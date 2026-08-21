// src/components/super-admin/SchoolPortfoliosTable.tsx
'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Loader2, Building, AlertTriangle, UserPlus } from 'lucide-react'

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  trial: 'bg-amber-100 text-amber-800',
  grace_period: 'bg-amber-100 text-amber-800',
  expired: 'bg-red-100 text-red-800',
  suspended: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-700',
}

const HEALTH_STYLE: Record<string, { label: string; emoji: string; className: string }> = {
  healthy: { label: 'Healthy', emoji: '🟢', className: 'bg-green-100 text-green-800' },
  needs_attention: { label: 'Needs Attention', emoji: '🟡', className: 'bg-amber-100 text-amber-800' },
  at_risk: { label: 'At Risk', emoji: '🟠', className: 'bg-orange-100 text-orange-800' },
  critical: { label: 'Critical', emoji: '🔴', className: 'bg-red-100 text-red-800' },
  no_recent_contact: { label: 'No Recent Contact', emoji: '⚪', className: 'bg-gray-100 text-gray-700' },
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'attention', label: 'Needs Attention' },
  { key: 'expiring', label: 'Expiring Soon' },
  { key: 'issues', label: 'Open Issues' },
  { key: 'unassigned', label: '⚠️ Unassigned' },
] as const

export default function SchoolPortfoliosTable() {
  const [portfolios, setPortfolios] = useState<any[]>([])
  const [unassigned, setUnassigned] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<typeof FILTERS[number]['key']>('all')
  const [search, setSearch] = useState('')
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null)
  const [reps, setReps] = useState<any[]>([])
  const [selectedRepId, setSelectedRepId] = useState('')
  const [assignReason, setAssignReason] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/platform-staff/schools/portfolios').then(r => r.json()),
      fetch('/api/platform-staff/schools/unassigned').then(r => r.json()),
    ]).then(([portfoliosRes, unassignedRes]) => {
      if (portfoliosRes.error) { setError(portfoliosRes.error); return }
      setPortfolios(portfoliosRes.portfolios ?? [])
      setUnassigned(unassignedRes.unassigned ?? [])
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (showAssignModal && reps.length === 0) {
      fetch('/api/platform-staff/representatives').then(r => r.json()).then(d => setReps(d.representatives ?? []))
    }
  }, [showAssignModal])

  async function submitAssign() {
    if (!showAssignModal || !selectedRepId) return
    setBusy(true)
    const res = await fetch(`/api/platform-staff/schools/${showAssignModal}/reassign`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newRepresentativeId: selectedRepId, reason: assignReason || 'Assigned from Unassigned Schools view' }),
    })
    const json = await res.json()
    setBusy(false)
    if (json.error) { alert(json.error); return }
    setShowAssignModal(null); setSelectedRepId(''); setAssignReason('')
    // reload both lists so the school moves from Unassigned to the main table
    setLoading(true)
    const [portfoliosRes, unassignedRes] = await Promise.all([
      fetch('/api/platform-staff/schools/portfolios').then(r => r.json()),
      fetch('/api/platform-staff/schools/unassigned').then(r => r.json()),
    ])
    setPortfolios(portfoliosRes.portfolios ?? [])
    setUnassigned(unassignedRes.unassigned ?? [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    let list = portfolios
    if (filter === 'attention') {
      list = list.filter(p => ['needs_attention', 'at_risk', 'critical'].includes(p.health_status))
    } else if (filter === 'expiring') {
      list = list.filter(p => p.subscription_expires_at && daysUntil(p.subscription_expires_at) <= 14 && daysUntil(p.subscription_expires_at) >= 0)
    } else if (filter === 'issues') {
      list = list.filter(p => p.open_escalations > 0)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(p => p.name?.toLowerCase().includes(q) || p.representative_name?.toLowerCase().includes(q))
    }
    return list
  }, [portfolios, filter, search])

  function daysUntil(dateStr: string) {
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  }

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin" /></div>
  if (error) return <div className="card p-6 text-red-600 max-w-md mx-auto text-center">{error}</div>

  const summary = {
    total: portfolios.length,
    attention: portfolios.filter(p => ['needs_attention', 'at_risk', 'critical'].includes(p.health_status)).length,
    issues: portfolios.filter(p => p.open_escalations > 0).length,
    expiring: portfolios.filter(p => p.subscription_expires_at && daysUntil(p.subscription_expires_at) <= 14 && daysUntil(p.subscription_expires_at) >= 0).length,
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">School Portfolios</h1>
        <p className="text-sm text-ink-muted mt-1">Every school currently assigned to a representative for relationship management.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card p-4"><div className="text-xl font-bold text-ink">{summary.total}</div><div className="text-xs text-ink-muted">Total Portfolio Schools</div></div>
        <div className="card p-4"><div className="text-xl font-bold text-amber-600">{summary.attention}</div><div className="text-xs text-ink-muted">Needs Attention</div></div>
        <div className="card p-4"><div className="text-xl font-bold text-red-600">{summary.issues}</div><div className="text-xs text-ink-muted">Open Issues</div></div>
        <div className="card p-4"><div className="text-xl font-bold text-orange-600">{summary.expiring}</div><div className="text-xs text-ink-muted">Expiring Within 14 Days</div></div>
        <button onClick={() => setFilter('unassigned')} className="card p-4 text-left hover:shadow-md transition-shadow">
          <div className="text-xl font-bold text-red-700">⚠️ {unassigned.length}</div>
          <div className="text-xs text-ink-muted">Unassigned Schools</div>
        </button>
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
          placeholder="Search school or representative..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ml-auto border rounded px-3 py-1.5 text-xs w-64"
        />
      </div>

      {filter === 'unassigned' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-200">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">School</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Original Referrer</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Last Assigned Rep</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Expires</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Last Activity</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Days Unassigned</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Priority</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {unassigned
                  .filter(u => !search.trim() || u.name?.toLowerCase().includes(search.trim().toLowerCase()))
                  .map(u => (
                  <tr key={u.organization_id} className="border-b border-surface-100 hover:bg-surface-50">
                    <td className="px-4 py-3 font-medium text-ink">
                      <div className="flex items-center gap-2"><Building size={14} className="text-ink-faint" /> {u.name}</div>
                    </td>
                    <td className="px-4 py-3 text-ink-muted text-xs">
                      {u.original_referrer_name ?? '—'}
                      <br /><span className="text-ink-faint">{u.original_referred_at ? new Date(u.original_referred_at).toLocaleDateString('en-NG') : ''}</span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted text-xs">
                      {u.was_ever_assigned ? (
                        <>
                          {u.last_assignment_representative_name}
                          <br /><span className="text-ink-faint">until {new Date(u.last_assignment_unassigned_at).toLocaleDateString('en-NG')}</span>
                          {u.last_assignment_reason && <p className="text-ink-faint mt-0.5">{u.last_assignment_reason}</p>}
                        </>
                      ) : (
                        <span className="text-ink-faint italic">Never assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[u.subscription_status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {u.subscription_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-faint text-xs">
                      {u.subscription_expires_at ? new Date(u.subscription_expires_at).toLocaleDateString('en-NG') : '—'}
                    </td>
                    <td className="px-4 py-3 text-ink-faint text-xs">
                      {u.last_follow_up_at ? new Date(u.last_follow_up_at).toLocaleDateString('en-NG') : 'None'}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-xs">{u.days_unassigned}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        u.priority === 'high' ? 'bg-red-100 text-red-800' : u.priority === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {u.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setShowAssignModal(u.organization_id)} className="btn-sm btn bg-brand-50 text-brand-700 flex items-center gap-1">
                          <UserPlus size={12} /> Assign
                        </button>
                        <Link href={`/representatives/schools/${u.organization_id}`} className="text-brand-600 text-xs font-medium hover:underline">
                          View →
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {unassigned.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-ink-faint text-sm">No unassigned schools. Every referred school has an active portfolio representative.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-200">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">School</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Representative</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Contact</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Plan</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Status</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Health</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Expires</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Next Follow-up</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const health = HEALTH_STYLE[p.health_status] ?? HEALTH_STYLE.no_recent_contact
                  return (
                    <tr key={p.organization_id} className="border-b border-surface-100 hover:bg-surface-50">
                      <td className="px-4 py-3 font-medium text-ink">
                        <div className="flex items-center gap-2">
                          <Building size={14} className="text-ink-faint" /> {p.name}
                          {p.open_escalations > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-800 flex items-center gap-1">
                              <AlertTriangle size={10} /> {p.open_escalations}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-muted">{p.representative_name}</td>
                      <td className="px-4 py-3 text-ink-faint text-xs">{p.contact_person || '—'}<br />{p.contact_phone ?? '—'}</td>
                      <td className="px-4 py-3 text-ink-muted">{p.subscription_plan}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[p.subscription_status] ?? 'bg-gray-100 text-gray-700'}`}>
                          {p.subscription_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${health.className}`}>{health.emoji} {health.label}</span>
                      </td>
                      <td className="px-4 py-3 text-ink-faint text-xs">
                        {p.subscription_expires_at ? new Date(p.subscription_expires_at).toLocaleDateString('en-NG') : '—'}
                      </td>
                      <td className="px-4 py-3 text-ink-faint text-xs">
                        {p.next_follow_up_at ? new Date(p.next_follow_up_at).toLocaleDateString('en-NG') : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/representatives/schools/${p.organization_id}`} className="text-brand-600 text-xs font-medium hover:underline">
                          View →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-ink-faint text-sm">No schools match this filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-5 max-w-sm w-full">
            <h3 className="font-semibold text-sm text-ink mb-3">Assign Representative</h3>
            <select className="input w-full mb-2" value={selectedRepId} onChange={e => setSelectedRepId(e.target.value)}>
              <option value="">Select a representative…</option>
              {reps.map((r: any) => <option key={r.id} value={r.id}>{r.full_name} ({r.referral_code})</option>)}
            </select>
            <input className="input w-full mb-3" placeholder="Reason (optional)" value={assignReason} onChange={e => setAssignReason(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAssignModal(null)} className="btn-sm btn bg-surface-100 text-ink">Cancel</button>
              <button disabled={busy || !selectedRepId} onClick={submitAssign} className="btn-primary btn-sm btn flex items-center gap-1.5">
                {busy && <Loader2 size={14} className="animate-spin" />} Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}