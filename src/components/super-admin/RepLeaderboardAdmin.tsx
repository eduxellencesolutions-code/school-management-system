// src/components/super-admin/RepLeaderboardAdmin.tsx
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, Trophy, TrendingDown, TrendingUp, Settings } from 'lucide-react'

const PERIODS = [
  { key: 'latest', label: 'Latest' }, { key: 'month', label: 'This Month' },
  { key: 'quarter', label: 'This Quarter' }, { key: 'year', label: 'This Year' },
  { key: 'all_time', label: 'All Time' },
] as const

export default function RepLeaderboardAdmin() {
  const [period, setPeriod] = useState<typeof PERIODS[number]['key']>('latest')
  const [board, setBoard] = useState<any>(null)
  const [rising, setRising] = useState<any[]>([])
  const [falling, setFalling] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showWeights, setShowWeights] = useState(false)
  const [weights, setWeights] = useState<Record<string, number> | null>(null)
  const [savingWeights, setSavingWeights] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/platform-staff/leaderboard?period=${period}`).then(r => r.json()),
      fetch('/api/representatives/leaderboard/rising').then(r => r.json()),
      fetch('/api/platform-staff/leaderboard/falling').then(r => r.json()),
    ]).then(([b, r, f]) => {
      setBoard(b); setRising(r.rising ?? []); setFalling(f.falling ?? [])
    }).finally(() => setLoading(false))
  }, [period])

  function openWeights() {
    setShowWeights(true)
    if (!weights) {
      fetch('/api/platform-staff/leaderboard/weights').then(r => r.json()).then(d => setWeights(d.weights))
    }
  }

  async function saveWeights() {
    if (!weights) return
    setSavingWeights(true)
    const res = await fetch('/api/platform-staff/leaderboard/weights', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(weights),
    })
    const json = await res.json()
    setSavingWeights(false)
    if (json.error) alert(json.error)
    else setShowWeights(false)
  }

  const reps: any[] = board?.representatives ?? []
  const top = reps.slice(0, 10)
  const bottom = [...reps].sort((a, b) => b.rank - a.rank).slice(0, 10)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink flex items-center gap-2"><Trophy className="text-amber-500" /> Representative Leaderboard</h1>
          <p className="text-sm text-ink-muted mt-1">
            {board?.snapshot_date ? `Snapshot: ${new Date(board.snapshot_date).toLocaleDateString('en-NG')}` : 'No snapshot data yet'}
          </p>
        </div>
        <button onClick={openWeights} className="btn-secondary btn-sm btn flex items-center gap-1.5">
          <Settings size={14} /> Configure Weights
        </button>
      </div>

      <div className="flex gap-2">
        {PERIODS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)} className={`text-xs px-3 py-1.5 rounded-full border ${period === p.key ? 'bg-ink text-white border-ink' : 'border-surface-200 text-ink-muted hover:bg-surface-50'}`}>{p.label}</button>
        ))}
      </div>

      {loading ? <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div> : (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card p-5">
              <h2 className="font-semibold text-sm text-ink mb-3">Top Performers</h2>
              <div className="divide-y divide-surface-100">
                {top.map(r => (
                  <Link key={r.representative_id} href={`/representatives/leaderboard/${r.representative_id}`} className="py-2 flex items-center justify-between text-sm hover:bg-surface-50 -mx-2 px-2 rounded">
                    <span><span className="text-ink-faint font-mono mr-2">#{r.rank}</span>{r.full_name}</span>
                    <span className="font-mono text-brand-600">{r.performance_score} pts</span>
                  </Link>
                ))}
                {top.length === 0 && <p className="text-xs text-ink-faint py-4 text-center">No data.</p>}
              </div>
            </div>
            <div className="card p-5">
              <h2 className="font-semibold text-sm text-ink mb-3">Bottom Performers</h2>
              <div className="divide-y divide-surface-100">
                {bottom.map(r => (
                  <Link key={r.representative_id} href={`/representatives/leaderboard/${r.representative_id}`} className="py-2 flex items-center justify-between text-sm hover:bg-surface-50 -mx-2 px-2 rounded">
                    <span><span className="text-ink-faint font-mono mr-2">#{r.rank}</span>{r.full_name}</span>
                    <span className="font-mono text-ink-muted">{r.performance_score} pts</span>
                  </Link>
                ))}
                {bottom.length === 0 && <p className="text-xs text-ink-faint py-4 text-center">No data.</p>}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="card p-5">
              <h2 className="font-semibold text-sm text-ink mb-3 flex items-center gap-1.5"><TrendingUp size={14} className="text-green-600" /> Rising</h2>
              <div className="divide-y divide-surface-100">
                {rising.map((r: any) => (
                  <div key={r.representative_id} className="py-2 flex justify-between text-sm">
                    <span>{r.full_name}</span>
                    <span className="text-green-600 text-xs">↑ {r.rank_improvement} (#{r.previous_rank} → #{r.current_rank})</span>
                  </div>
                ))}
                {rising.length === 0 && <p className="text-xs text-ink-faint py-4 text-center">No movement data yet.</p>}
              </div>
            </div>
            <div className="card p-5">
              <h2 className="font-semibold text-sm text-ink mb-3 flex items-center gap-1.5"><TrendingDown size={14} className="text-red-600" /> Falling</h2>
              <div className="divide-y divide-surface-100">
                {falling.map((r: any) => (
                  <div key={r.representative_id} className="py-2 flex justify-between text-sm">
                    <span>{r.full_name}</span>
                    <span className="text-red-600 text-xs">↓ {r.rank_decline} (#{r.previous_rank} → #{r.current_rank})</span>
                  </div>
                ))}
                {falling.length === 0 && <p className="text-xs text-ink-faint py-4 text-center">No movement data yet.</p>}
              </div>
            </div>
          </div>
        </>
      )}

      {showWeights && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowWeights(false)}>
          <div className="bg-white rounded-lg p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-sm text-ink mb-3">Performance Score Weights</h3>
            {!weights ? <Loader2 className="animate-spin" size={16} /> : (
              <>
                {Object.entries(weights).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-2 mb-2">
                    <label className="text-xs text-ink-muted capitalize">{k}</label>
                    <input type="number" step="0.01" min="0" max="1" value={v}
                      onChange={e => setWeights({ ...weights, [k]: Number(e.target.value) })}
                      className="input w-20 text-xs" />
                  </div>
                ))}
                <p className="text-xs text-ink-faint mb-3">Sum: {Object.values(weights).reduce((a, b) => a + b, 0).toFixed(2)} (must equal 1.00)</p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowWeights(false)} className="btn-sm btn bg-surface-100 text-ink">Cancel</button>
                  <button disabled={savingWeights} onClick={saveWeights} className="btn-primary btn-sm btn">Save</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}