// src/components/super-admin/RepLeaderboardDetail.tsx
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, ArrowLeft } from 'lucide-react'

export default function RepLeaderboardDetail({ representativeId }: { representativeId: string }) {
  const [data, setData] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/platform-staff/leaderboard/${representativeId}/detail`).then(r => r.json()),
      fetch(`/api/platform-staff/leaderboard/${representativeId}/history`).then(r => r.json()),
    ]).then(([d, h]) => { setData(d); setHistory(h.history ?? []) }).finally(() => setLoading(false))
  }, [representativeId])

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>
  if (!data?.has_snapshot) return <p className="text-sm text-ink-faint p-8 text-center">No leaderboard data for this representative yet.</p>

  const { representative: rep, snapshot, qualifying_schools, recent_followups, recent_feedback, recent_commissions } = data
  const bd = snapshot.score_breakdown

  return (
    <div className="flex flex-col gap-6">
      <Link href="/representatives/leaderboard" className="text-xs text-ink-muted flex items-center gap-1 hover:text-ink w-fit"><ArrowLeft size={14} /> Back to Leaderboard</Link>

      <div className="card p-5">
        <h1 className="font-bold text-lg text-ink">{rep.full_name}</h1>
        <p className="text-sm text-ink-muted">#{snapshot.rank} of {snapshot.total_representatives} · {snapshot.performance_score} points</p>
        <p className="text-xs text-ink-faint mt-1">Snapshot: {new Date(snapshot.snapshot_date).toLocaleDateString('en-NG')} · Computed {new Date(snapshot.computed_at).toLocaleString('en-NG')}</p>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-sm text-ink mb-3">Score Breakdown (Audit)</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-ink-faint uppercase"><th className="py-1">Metric</th><th>Raw</th><th>Normalized /100</th><th>Weight</th><th>Contribution</th></tr></thead>
          <tbody>
            {Object.keys(bd.weighted_contribution ?? {}).map(k => (
              <tr key={k} className="border-t border-surface-100">
                <td className="py-1.5 capitalize">{k}</td>
                <td className="font-mono">{JSON.stringify(bd.raw?.[k === 'schools' ? 'qualifying_schools' : k === 'followup' ? 'followups_last_30d' : k === 'feedback' ? 'feedback_last_30d' : k] ?? '—')}</td>
                <td className="font-mono">{bd.normalized_0_100?.[k]?.toFixed?.(1) ?? '—'}</td>
                <td className="font-mono">{bd.weights?.[k]}</td>
                <td className="font-mono font-semibold text-brand-600">{bd.weighted_contribution?.[k]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-semibold text-sm text-ink mb-2">Qualifying Schools ({qualifying_schools.length})</h2>
          {qualifying_schools.map((s: any) => <p key={s.organization_id} className="text-xs text-ink-muted py-1">{s.name} · {s.subscription_status}</p>)}
        </div>
        <div className="card p-5">
          <h2 className="font-semibold text-sm text-ink mb-2">Recent Follow-ups ({recent_followups.length})</h2>
          {recent_followups.map((f: any, i: number) => <p key={i} className="text-xs text-ink-muted py-1">{new Date(f.contact_date).toLocaleDateString('en-NG')} · {f.contact_method}</p>)}
        </div>
        <div className="card p-5">
          <h2 className="font-semibold text-sm text-ink mb-2">Recent Feedback ({recent_feedback.length})</h2>
          {recent_feedback.map((f: any, i: number) => <p key={i} className="text-xs text-ink-muted py-1">{f.category} · {new Date(f.created_at).toLocaleDateString('en-NG')}</p>)}
        </div>
        <div className="card p-5">
          <h2 className="font-semibold text-sm text-ink mb-2">Recent Commissions ({recent_commissions.length})</h2>
          {recent_commissions.map((c: any, i: number) => <p key={i} className="text-xs text-ink-muted py-1">₦{Number(c.amount).toLocaleString()} · {c.status}</p>)}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-sm text-ink mb-3">Rank History (90 days)</h2>
        <div className="flex flex-col gap-1">
          {history.map((h: any, i: number) => (
            <div key={i} className="flex justify-between text-xs text-ink-muted py-1 border-b border-surface-50">
              <span>{new Date(h.snapshot_date).toLocaleDateString('en-NG')}</span>
              <span>#{h.rank}</span>
              <span className="font-mono">{h.performance_score} pts</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}