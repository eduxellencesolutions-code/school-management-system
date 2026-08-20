// src/components/representatives/SchoolPortfolio.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, Building, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'

// NOTE: statusStyle map follows the same inline-Tailwind pattern already
// used in (super-admin)/schools/page.tsx, rather than guessing at a
// `badge-amber` class that hasn't been confirmed to exist in the design system.
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

export default function SchoolPortfolio() {
  const [schools, setSchools] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'active' | 'attention' | 'inactive' | 'all'>('active')

  function load() {
    setLoading(true)
    Promise.all([
      fetch('/api/representatives/schools').then(r => r.json()),
      fetch('/api/representatives/portfolio-summary').then(r => r.json()),
    ])
      .then(([schoolsRes, summaryRes]) => {
        if (schoolsRes.error) { setError(schoolsRes.error); return }
        setSchools(schoolsRes.schools ?? [])
        setSummary(summaryRes)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin" /></div>
  if (error) return <div className="card p-6 text-red-600 max-w-md mx-auto text-center">{error}</div>

  const filtered = schools.filter(s => {
    if (filter === 'active') return s.subscriptionStatus === 'active'
    if (filter === 'attention') return ['needs_attention', 'at_risk', 'critical'].includes(s.healthStatus)
    if (filter === 'inactive') return ['expired', 'suspended', 'cancelled'].includes(s.subscriptionStatus)
    return true
  })

  const cards = summary ? [
    { label: 'Active Schools', value: summary.active_schools, icon: Building, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Needs Attention', value: summary.needs_attention, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'At Risk', value: summary.at_risk, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Follow-ups Due', value: summary.followups_due_this_week, icon: Clock, color: 'text-brand-600', bg: 'bg-brand-50' },
    { label: 'Open Escalations', value: summary.open_escalations, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Healthy', value: summary.healthy, icon: CheckCircle2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ] : []

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">🏫 My Schools</h1>
        <p className="text-sm text-ink-muted mt-1">Schools you brought onto Eduxellence, and their current health.</p>
      </div>

      {summary && summary.followups_overdue > 0 && (
        <div className="card p-3 bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={14} />
          {summary.followups_overdue} follow-up{summary.followups_overdue === 1 ? '' : 's'} overdue
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {cards.map(c => (
          <div key={c.label} className="card p-3">
            <div className={`w-8 h-8 rounded ${c.bg} flex items-center justify-center mb-2`}>
              <c.icon size={16} className={c.color} />
            </div>
            <div className="text-lg font-bold text-ink">{c.value}</div>
            <div className="text-xs text-ink-muted">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(['active', 'attention', 'inactive', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border ${filter === f ? 'bg-ink text-white border-ink' : 'border-surface-200 text-ink-muted hover:bg-surface-50'}`}
          >
            {f === 'active' ? 'Active' : f === 'attention' ? 'Needs Attention' : f === 'inactive' ? 'Inactive' : 'All'}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">School</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Contact</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Plan</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Status</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Health</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Next Follow-up</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const health = HEALTH_STYLE[s.healthStatus] ?? HEALTH_STYLE.no_recent_contact
                return (
                  <tr key={s.organizationId} className="border-b border-surface-100 hover:bg-surface-50">
                    <td className="px-4 py-3 font-medium text-ink">
                      <div className="flex items-center gap-2">
                        <Building size={14} className="text-ink-faint" /> {s.name}
                        {s.openEscalations > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-800">{s.openEscalations} open</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-muted text-xs">
                      {s.principalName ?? '—'}<br />{s.contactPhone ?? s.contactEmail ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{s.subscriptionPlan}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[s.subscriptionStatus] ?? 'bg-gray-100 text-gray-700'}`}>
                        {s.subscriptionStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${health.className}`}>{health.emoji} {health.label}</span>
                    </td>
                    <td className="px-4 py-3 text-ink-faint text-xs">
                      {s.nextFollowUpAt ? new Date(s.nextFollowUpAt).toLocaleDateString('en-NG') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/rep/schools/${s.organizationId}`} className="text-brand-600 text-xs font-medium hover:underline">
                        View →
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-ink-faint text-sm">No schools match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}