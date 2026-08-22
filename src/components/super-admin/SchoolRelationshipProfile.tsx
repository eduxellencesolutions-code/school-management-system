// src/components/super-admin/SchoolRelationshipProfile.tsx
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, ArrowLeft, Building, History, MessageSquare, AlertTriangle, DollarSign, UserCog, Phone, Mail } from 'lucide-react'

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

const TABS = [
  { key: 'overview', label: 'Overview', icon: Building },
  { key: 'followups', label: 'Follow-ups', icon: Phone },
  { key: 'feedback', label: 'Feedback', icon: MessageSquare },
  { key: 'escalations', label: 'Escalations', icon: AlertTriangle },
  { key: 'history', label: 'Activity History', icon: History },
  { key: 'subscription', label: 'Subscription', icon: DollarSign },
  { key: 'representative', label: 'Representative', icon: UserCog },
] as const

export default function SchoolRelationshipProfile({ organizationId }: { organizationId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<typeof TABS[number]['key']>('overview')

  const [showReassign, setShowReassign] = useState(false)
  const [reps, setReps] = useState<any[]>([])
  const [selectedRepId, setSelectedRepId] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  function load() {
    setLoading(true)
    fetch(`/api/platform-staff/schools/${organizationId}/relationship`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [organizationId])

  useEffect(() => {
    if (showReassign && reps.length === 0) {
      fetch('/api/platform-staff/representatives').then(r => r.json()).then(d => setReps(d.representatives ?? []))
    }
  }, [showReassign])

  async function submitReassign() {
    if (!reason.trim()) { setMessage({ type: 'error', text: 'A reason is required' }); return }
    setBusy(true); setMessage(null)
    const res = await fetch(`/api/platform-staff/schools/${organizationId}/reassign`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newRepresentativeId: selectedRepId || null, reason }),
    })
    const json = await res.json()
    setBusy(false)
    if (json.error) { setMessage({ type: 'error', text: json.error }); return }
    setMessage({ type: 'success', text: selectedRepId ? 'Portfolio reassigned' : 'Portfolio unassigned' })
    setShowReassign(false); setSelectedRepId(''); setReason('')
    load()
  }

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin" /></div>
  if (error) return <div className="card p-6 text-red-600 max-w-md mx-auto text-center">{error}</div>
  if (!data) return null

  const { school, currentRepresentative, relationship, portfolioHistory, followUps, feedback, escalations, studentCount } = data
  const health = HEALTH_STYLE[relationship?.health_status ?? 'no_recent_contact']

  return (
    <div className="flex flex-col gap-4">
      <Link href="/representatives/school-portfolios" className="text-xs text-ink-muted flex items-center gap-1 hover:text-ink w-fit">
        <ArrowLeft size={14} /> Back to School Portfolios
      </Link>

      {message && (
        <div className={`text-sm px-3 py-2 rounded ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {message.text}
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold text-ink">🏫 {school.name}</h1>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[school.subscription_status] ?? 'bg-gray-100 text-gray-700'}`}>
              {school.subscription_status}
            </span>
            {relationship && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${health.className}`}>{health.emoji} {health.label}</span>
            )}
          </div>
        </div>
        <p className="text-xs text-ink-faint">
          Referred by <span className="font-medium text-ink-muted">{portfolioHistory?.original_referrer?.full_name ?? 'Unknown'}</span>
          {' · '}Currently managed by <span className="font-medium text-ink-muted">{currentRepresentative?.full_name ?? 'Unassigned'}</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-surface-200">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-xs px-3 py-2 flex items-center gap-1.5 border-b-2 transition-colors ${tab === t.key ? 'border-brand-500 text-brand-600 font-medium' : 'border-transparent text-ink-muted hover:text-ink'}`}
          >
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="card p-5">
          <h2 className="font-semibold text-sm text-ink mb-3">Overview</h2>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-ink-faint">School Type</dt><dd className="text-ink capitalize">{school.type}</dd>
            <dt className="text-ink-faint">Principal / Admin</dt><dd className="text-ink">{school.principal_name ?? '—'}</dd>
            <dt className="text-ink-faint">Students</dt><dd className="text-ink">{studentCount ?? 0}</dd>
            <dt className="text-ink-faint">Phone</dt><dd className="text-ink">{school.contact_phone ?? school.phone ?? '—'}</dd>
            <dt className="text-ink-faint">Email</dt><dd className="text-ink">{school.contact_email ?? school.email ?? '—'}</dd>
            <dt className="text-ink-faint">Address</dt><dd className="text-ink">{school.address ?? '—'}</dd>
            <dt className="text-ink-faint">Registered</dt><dd className="text-ink">{new Date(school.created_at).toLocaleDateString('en-NG')}</dd>
          </dl>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-surface-100">
            <div className="text-center"><p className="text-lg font-bold text-ink">{followUps.length}</p><p className="text-xs text-ink-faint">Follow-ups Logged</p></div>
            <div className="text-center"><p className="text-lg font-bold text-red-600">{escalations.filter((e: any) => e.status !== 'resolved' && e.status !== 'closed').length}</p><p className="text-xs text-ink-faint">Open Escalations</p></div>
            <div className="text-center"><p className="text-lg font-bold text-ink">{feedback.length}</p><p className="text-xs text-ink-faint">Feedback Entries</p></div>
          </div>
        </div>
      )}

      {tab === 'followups' && (
        <div className="card p-5">
          <h2 className="font-semibold text-sm text-ink mb-3">Follow-up History</h2>
          {followUps.length === 0 ? (
            <p className="text-xs text-ink-faint">No follow-ups recorded for this school.</p>
          ) : (
            <div className="divide-y divide-surface-100">
              {followUps.map((f: any) => (
                <div key={f.id} className="py-3 text-sm">
                  <p className="font-medium text-ink">{new Date(f.contact_date).toLocaleDateString('en-NG')} — {f.contact_method.replace('_', ' ')} <span className="text-ink-faint font-normal">by {f.representatives?.full_name ?? 'Unknown rep'}</span></p>
                  {f.school_reported && <p className="text-ink-muted mt-1">School reported: {f.school_reported}</p>}
                  {f.action_taken && <p className="text-ink-muted">Action taken: {f.action_taken}</p>}
                  {f.follow_up_required && f.next_follow_up_date && (
                    <p className="text-xs text-brand-600 mt-1">Next follow-up: {new Date(f.next_follow_up_date).toLocaleDateString('en-NG')}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'feedback' && (
        <div className="card p-5">
          <h2 className="font-semibold text-sm text-ink mb-3">Feedback History</h2>
          {feedback.length === 0 ? (
            <p className="text-xs text-ink-faint">No feedback recorded for this school.</p>
          ) : (
            <div className="divide-y divide-surface-100">
              {feedback.map((f: any) => (
                <div key={f.id} className="py-2 text-sm">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-100 text-ink-muted mr-2">{f.category}</span>
                  <span className="font-medium text-ink">{(f.subtype ?? f.satisfaction ?? '').replace(/_/g, ' ')}</span>
                  <span className="text-ink-faint text-xs"> · by {f.representatives?.full_name ?? 'Unknown rep'}</span>
                  {f.biggest_challenge && <p className="text-ink-muted text-xs mt-0.5">{f.biggest_challenge}</p>}
                  <p className="text-xs text-ink-faint">{new Date(f.created_at).toLocaleDateString('en-NG')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'escalations' && (
        <div className="card p-5">
          <h2 className="font-semibold text-sm text-ink mb-3">Escalations</h2>
          {escalations.length === 0 ? (
            <p className="text-xs text-ink-faint">No issues escalated for this school.</p>
          ) : (
            <div className="divide-y divide-surface-100">
              {escalations.map((t: any) => (
                <Link key={t.id} href={`/support?ticket=${t.id}`} className="py-3 flex justify-between items-center text-sm hover:bg-surface-50 -mx-2 px-2 rounded">
                  <div>
                    <p className="font-medium text-ink">{t.subject}</p>
                    <p className="text-xs text-ink-faint">{new Date(t.created_at).toLocaleDateString('en-NG')} · {t.priority} · by {t.representatives?.full_name ?? 'Unknown rep'}</p>
                    {t.attachment_url && <a href={t.attachment_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-xs text-brand-600 hover:underline">📎 View attachment</a>}
                  </div>
                  <span className={`badge text-[10px] ${t.status === 'resolved' || t.status === 'closed' ? 'badge-green' : 'badge-gray'}`}>{t.status}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="card p-5">
          <h2 className="font-semibold text-sm text-ink mb-3">Chain of Responsibility</h2>
          <div className="mb-3 pb-3 border-b border-surface-100">
            <p className="text-xs font-medium text-ink-muted mb-1">Original Referrer</p>
            <p className="text-sm text-ink">
              {portfolioHistory?.original_referrer?.full_name ?? 'Unknown'}
              <span className="text-ink-faint text-xs ml-2">
                referred {portfolioHistory?.original_referrer?.referred_at ? new Date(portfolioHistory.original_referrer.referred_at).toLocaleDateString('en-NG') : '—'}
              </span>
            </p>
          </div>
          <p className="text-xs font-medium text-ink-muted mb-2">Portfolio Assignment History</p>
          <div className="flex flex-col gap-2">
            {(portfolioHistory?.assignment_history ?? []).map((a: any, i: number) => (
              <div key={i} className="text-sm flex items-center justify-between p-2 bg-surface-50 rounded">
                <div>
                  <span className="font-medium text-ink">{a.full_name}</span>
                  <span className="text-ink-faint text-xs ml-2">
                    {new Date(a.assigned_at).toLocaleDateString('en-NG')} → {a.unassigned_at ? new Date(a.unassigned_at).toLocaleDateString('en-NG') : 'Current'}
                  </span>
                  {a.reason && <p className="text-xs text-ink-faint mt-0.5">{a.reason}</p>}
                </div>
                {a.assigned_by && <span className="text-xs text-ink-faint">by {a.assigned_by}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'subscription' && (
        <div className="card p-5">
          <h2 className="font-semibold text-sm text-ink mb-3">Subscription</h2>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-ink-faint">Plan</dt><dd className="text-ink">{school.subscription_plan}</dd>
            <dt className="text-ink-faint">Status</dt><dd className="text-ink">{school.subscription_status}</dd>
            <dt className="text-ink-faint">Expires</dt><dd className="text-ink">{school.subscription_expires_at ? new Date(school.subscription_expires_at).toLocaleDateString('en-NG') : '—'}</dd>
            <dt className="text-ink-faint">Trial Start</dt><dd className="text-ink">{school.trial_start ? new Date(school.trial_start).toLocaleDateString('en-NG') : '—'}</dd>
            <dt className="text-ink-faint">Trial End</dt><dd className="text-ink">{school.trial_end ? new Date(school.trial_end).toLocaleDateString('en-NG') : '—'}</dd>
          </dl>
          <p className="text-xs text-ink-faint mt-3">
            For plan changes, extensions, or status overrides, use the{' '}
            <Link href={`/schools/${organizationId}`} className="text-brand-600 hover:underline">full school administration page</Link>.
          </p>
        </div>
      )}

      {tab === 'representative' && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-ink">Current Representative</h2>
            <button onClick={() => setShowReassign(v => !v)} className="btn-sm btn bg-surface-100 text-ink">
              {currentRepresentative ? 'Reassign' : 'Assign Representative'}
            </button>
          </div>

          {currentRepresentative ? (
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-ink-faint">Name</dt><dd className="text-ink">{currentRepresentative.full_name}</dd>
              <dt className="text-ink-faint">Email</dt><dd className="text-ink">{currentRepresentative.email}</dd>
              <dt className="text-ink-faint">Phone</dt><dd className="text-ink">{currentRepresentative.phone ?? '—'}</dd>
              <dt className="text-ink-faint">Level</dt><dd className="text-ink">{currentRepresentative.level?.replace(/_/g, ' ')}</dd>
              <dt className="text-ink-faint">Commission Rate</dt><dd className="text-ink">{currentRepresentative.commission_rate}%</dd>
            </dl>
          ) : (
            <p className="text-xs text-ink-faint">No representative is currently responsible for this school's relationship.</p>
          )}

          {showReassign && (
            <div className="flex flex-col gap-2 mt-4 p-3 bg-surface-50 rounded">
              <select className="input" value={selectedRepId} onChange={e => setSelectedRepId(e.target.value)}>
                <option value="">— Unassign only (no new representative) —</option>
                {reps.filter((r: any) => r.id !== currentRepresentative?.id).map((r: any) => (
                  <option key={r.id} value={r.id}>{r.full_name} ({r.referral_code})</option>
                ))}
              </select>
              <input className="input" placeholder="Reason for reassignment/unassignment" value={reason} onChange={e => setReason(e.target.value)} />
              <button disabled={busy} onClick={submitReassign} className="btn-primary btn-sm btn self-start flex items-center gap-1.5">
                {busy && <Loader2 size={14} className="animate-spin" />} Confirm
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}