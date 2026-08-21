'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, Building2, AlertTriangle, Clock, ArrowRight } from 'lucide-react'

export default function SchoolPortfolioSummaryCard() {
  const [summary, setSummary] = useState<any>(null)
  const [dueTasks, setDueTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/representatives/portfolio-summary').then(r => r.json()),
      fetch('/api/representatives/schools').then(r => r.json()),
    ]).then(([summaryRes, schoolsRes]) => {
      setSummary(summaryRes)
      const schools = schoolsRes.schools ?? []
      // Build a simple task list from data already returned by /schools —
      // no separate "tasks" table; tasks are derived, not stored.
      const tasks = schools
        .filter((s: any) =>
          s.followUpStatus === 'pending' ||
          s.openEscalations > 0 ||
          (s.subscriptionExpiresAt && daysUntil(s.subscriptionExpiresAt) <= 14 && daysUntil(s.subscriptionExpiresAt) >= 0)
        )
        .map((s: any) => ({
          organizationId: s.organizationId,
          name: s.name,
          reason: s.openEscalations > 0
            ? `${s.openEscalations} open issue${s.openEscalations > 1 ? 's' : ''}`
            : s.nextFollowUpAt && new Date(s.nextFollowUpAt) < new Date()
              ? 'Follow-up overdue'
              : s.followUpStatus === 'pending'
                ? 'Follow-up due'
                : `Subscription expires in ${daysUntil(s.subscriptionExpiresAt)} days`,
        }))
      setDueTasks(tasks.slice(0, 5))
    }).finally(() => setLoading(false))
  }, [])

  function daysUntil(dateStr: string) {
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  }

  if (loading) return <div className="card p-4 flex justify-center"><Loader2 className="animate-spin" size={16} /></div>
  if (!summary) return null

  const cards = [
    { label: 'Total Schools', value: summary.total_schools },
    { label: 'Active', value: summary.active_schools, className: 'text-green-600' },
    { label: 'Needs Follow-up', value: summary.needs_attention + summary.followups_due_this_week, className: 'text-amber-600' },
    { label: 'Open Issues', value: summary.open_escalations, className: 'text-red-600' },
  ]

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Building2 size={14} className="text-brand-500" />
          <p className="text-sm font-semibold text-ink">My School Portfolio</p>
        </div>
        <Link href="/rep/schools" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
          View all <ArrowRight size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        {cards.map(c => (
          <div key={c.label} className="text-center">
            <p className={`text-lg font-bold ${c.className ?? 'text-ink'}`}>{c.value}</p>
            <p className="text-xs text-ink-faint">{c.label}</p>
          </div>
        ))}
      </div>

      {summary.followups_overdue > 0 && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded px-2 py-1.5 mb-2">
          <AlertTriangle size={12} /> {summary.followups_overdue} follow-up{summary.followups_overdue > 1 ? 's' : ''} overdue
        </div>
      )}

      {dueTasks.length > 0 && (
        <div className="border-t border-surface-100 pt-2 mt-2">
          <p className="text-xs font-medium text-ink-muted mb-1.5 flex items-center gap-1"><Clock size={12} /> Needs your attention</p>
          <div className="flex flex-col gap-1">
            {dueTasks.map((t, i) => (
              <Link key={i} href={`/rep/schools/${t.organizationId}`} className="text-xs text-ink hover:text-brand-600 flex justify-between">
                <span>{t.name}</span>
                <span className="text-ink-faint">{t.reason}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}