// src/components/representatives/LeaderboardFull.tsx
'use client'
import { useState, useEffect } from 'react'
import { Loader2, Trophy, TrendingUp, Building2, DollarSign, Handshake } from 'lucide-react'

const TABS = [
  { key: 'overall', label: 'Overall' }, { key: 'month', label: 'This Month' },
  { key: 'quarter', label: 'This Quarter' }, { key: 'year', label: 'This Year' },
] as const

export default function LeaderboardFull() {
  const [tab, setTab] = useState<typeof TABS[number]['key']>('overall')
  const [overall, setOverall] = useState<any[]>([])
  const [rising, setRising] = useState<any[]>([])
  const [onboarders, setOnboarders] = useState<any[]>([])
  const [revenue, setRevenue] = useState<any[]>([])
  const [customer, setCustomer] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const period = tab === 'overall' ? 'month' : tab
    Promise.all([
      fetch('/api/representatives/leaderboard').then(r => r.json()),
      fetch('/api/representatives/leaderboard/rising').then(r => r.json()),
      fetch(`/api/representatives/leaderboard/category?category=top_onboarders&period=${period}`).then(r => r.json()),
      fetch(`/api/representatives/leaderboard/category?category=revenue_champions&period=${period}`).then(r => r.json()),
      fetch(`/api/representatives/leaderboard/category?category=customer_champions&period=${period}`).then(r => r.json()),
    ]).then(([o, r, ob, rv, cc]) => {
      setOverall(o.leaderboard ?? []); setRising(r.rising ?? [])
      setOnboarders(ob.results ?? []); setRevenue(rv.results ?? []); setCustomer(cc.results ?? [])
    }).finally(() => setLoading(false))
  }, [tab])

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink flex items-center gap-2"><Trophy className="text-amber-500" /> Leadership Board</h1>
        <p className="text-sm text-ink-muted mt-1">Recognizing top-performing representatives across the Eduxellence network.</p>
      </div>

      <div className="flex gap-2">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`text-xs px-3 py-1.5 rounded-full border ${tab === t.key ? 'bg-ink text-white border-ink' : 'border-surface-200 text-ink-muted hover:bg-surface-50'}`}>{t.label}</button>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-sm text-ink mb-3">🥇 Top Performers</h2>
        <div className="divide-y divide-surface-100">
          {overall.map((r: any) => (
            <div key={r.representative_id} className="py-2.5 flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span className="w-6 text-center font-bold text-ink-faint">#{r.rank}</span>
                <span className="font-medium text-ink">{r.full_name}</span>
              </div>
              <span className="font-mono text-brand-600 font-semibold">{r.performance_score} pts</span>
            </div>
          ))}
          {overall.length === 0 && <p className="text-xs text-ink-faint py-4 text-center">No ranking data yet.</p>}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-sm text-ink mb-3 flex items-center gap-1.5"><TrendingUp size={14} className="text-green-600" /> Fastest Rising</h2>
        <div className="divide-y divide-surface-100">
          {rising.map((r: any) => (
            <div key={r.representative_id} className="py-2.5 flex items-center justify-between text-sm">
              <span className="font-medium text-ink">{r.full_name}</span>
              <span className="text-green-600 text-xs font-medium">↑ {r.rank_improvement} places (#{r.previous_rank} → #{r.current_rank})</span>
            </div>
          ))}
          {rising.length === 0 && <p className="text-xs text-ink-faint py-4 text-center">Not enough history yet to show movement.</p>}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold text-xs text-ink-muted uppercase mb-2 flex items-center gap-1"><Building2 size={12} /> Top Onboarders</h3>
          {onboarders.slice(0, 5).map((r: any) => <div key={r.representative_id} className="flex justify-between text-xs py-1"><span className="text-ink">{r.full_name}</span><span className="font-mono">{r.value}</span></div>)}
          {onboarders.length === 0 && <p className="text-xs text-ink-faint">No data for this period.</p>}
        </div>
        <div className="card p-4">
          <h3 className="font-semibold text-xs text-ink-muted uppercase mb-2 flex items-center gap-1"><DollarSign size={12} /> Revenue Generators</h3>
          {revenue.slice(0, 5).map((r: any) => <div key={r.representative_id} className="flex justify-between text-xs py-1"><span className="text-ink">{r.full_name}</span><span className="font-mono">₦{Number(r.value).toLocaleString()}</span></div>)}
          {revenue.length === 0 && <p className="text-xs text-ink-faint">No data for this period.</p>}
        </div>
        <div className="card p-4">
          <h3 className="font-semibold text-xs text-ink-muted uppercase mb-2 flex items-center gap-1"><Handshake size={12} /> Customer Champions</h3>
          {customer.slice(0, 5).map((r: any) => <div key={r.representative_id} className="flex justify-between text-xs py-1"><span className="text-ink">{r.full_name}</span><span className="font-mono">{r.value}</span></div>)}
          {customer.length === 0 && <p className="text-xs text-ink-faint">No data for this period.</p>}
        </div>
      </div>
    </div>
  )
}