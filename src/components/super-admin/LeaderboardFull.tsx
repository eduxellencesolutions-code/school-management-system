// src/components/super-admin/LeaderboardFull.tsx
'use client'
import { useState, useEffect } from 'react'
import { Loader2, Trophy, TrendingUp, Users, DollarSign, Target } from 'lucide-react'
import Link from 'next/link'
import { RECOGNITION_LABELS } from '@/lib/leaderboard/recognitionLabels'

export default function LeaderboardFull() {
  const [loading, setLoading] = useState(true)
  const [overall, setOverall] = useState<any[]>([])
  const [rising, setRising] = useState<any[]>([])
  const [onboarders, setOnboarders] = useState<any[]>([])
  const [revenue, setRevenue] = useState<any[]>([])
  const [customer, setCustomer] = useState<any[]>([])
  const [recognitions, setRecognitions] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/representatives/leaderboard/overall').then(r => r.json()),
      fetch('/api/representatives/leaderboard/rising').then(r => r.json()),
      fetch('/api/representatives/leaderboard/onboarders').then(r => r.json()),
      fetch('/api/representatives/leaderboard/revenue').then(r => r.json()),
      fetch('/api/representatives/leaderboard/customer').then(r => r.json()),
      fetch('/api/representatives/leaderboard/recognitions').then(r => r.json()),
    ]).then(([o, r, ob, rv, cc, rec]) => {
      setOverall(o.leaderboard ?? [])
      setRising(r.rising ?? [])
      setOnboarders(ob.results ?? [])
      setRevenue(rv.results ?? [])
      setCustomer(cc.results ?? [])
      setRecognitions(rec.recognitions ?? [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Representative Leaderboard</h1>
        <p className="text-sm text-ink-muted mt-1">Track top performers across all metrics.</p>
      </div>

      {/* Overall Leaderboard */}
      <div className="card p-5">
        <h2 className="font-semibold text-sm text-ink mb-3 flex items-center gap-2">
          <Trophy size={16} className="text-amber-500" /> Overall Rankings
        </h2>
        {overall.length === 0 ? (
          <p className="text-xs text-ink-faint text-center py-4">No rankings available yet.</p>
        ) : (
          <div className="divide-y divide-surface-100">
            {overall.slice(0, 10).map((rep: any, i: number) => (
              <div key={rep.representative_id} className="py-2 flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-ink-muted w-6 text-center">#{i + 1}</span>
                  <Link href={`/representatives/${rep.representative_id}`} className="font-medium text-ink hover:text-brand-600">
                    {rep.representatives?.full_name}
                  </Link>
                </div>
                <div className="flex items-center gap-4 text-xs text-ink-faint">
                  <span>{rep.performance_score} pts</span>
                  <span>{rep.qualifying_schools_count} schools</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fastest Rising */}
      <div className="card p-5">
        <h2 className="font-semibold text-sm text-ink mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-green-500" /> Fastest Rising
        </h2>
        {rising.length === 0 ? (
          <p className="text-xs text-ink-faint text-center py-4">No rising stars yet.</p>
        ) : (
          <div className="divide-y divide-surface-100">
            {rising.map((rep: any) => (
              <div key={rep.representative_id} className="py-2 flex items-center justify-between text-sm">
                <Link href={`/representatives/${rep.representative_id}`} className="font-medium text-ink hover:text-brand-600">
                  {rep.representatives?.full_name}
                </Link>
                <span className="text-xs text-green-600 font-medium">+{rep.rank_change} places</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Recognitions */}
      <div className="card p-5">
        <h2 className="font-semibold text-sm text-ink mb-3 flex items-center gap-2">
          <Target size={16} className="text-purple-500" /> Recent Recognitions
        </h2>
        <div className="flex flex-col gap-2">
          {recognitions.slice(0, 10).map((r: any) => {
            const info = RECOGNITION_LABELS[r.category] ?? { emoji: '⭐', label: r.category }
            return (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span>{info.emoji} <span className="font-medium">{info.label}</span> — {r.representatives?.full_name}</span>
                <span className="text-xs text-ink-faint">{new Date(r.period_start).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })}</span>
              </div>
            )
          })}
          {recognitions.length === 0 && <p className="text-xs text-ink-faint text-center py-2">No recognitions awarded yet.</p>}
        </div>
      </div>

      {/* Top Onboarders */}
      <div className="card p-5">
        <h2 className="font-semibold text-sm text-ink mb-3 flex items-center gap-2">
          <Users size={16} className="text-blue-500" /> Top Onboarders
        </h2>
        {onboarders.length === 0 ? (
          <p className="text-xs text-ink-faint text-center py-4">No data yet.</p>
        ) : (
          <div className="divide-y divide-surface-100">
            {onboarders.map((rep: any) => (
              <div key={rep.representative_id} className="py-2 flex items-center justify-between text-sm">
                <Link href={`/representatives/${rep.representative_id}`} className="font-medium text-ink hover:text-brand-600">
                  {rep.representatives?.full_name}
                </Link>
                <span className="text-xs text-ink-faint">{rep.qualifying_schools_count} schools</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revenue Leaders */}
      <div className="card p-5">
        <h2 className="font-semibold text-sm text-ink mb-3 flex items-center gap-2">
          <DollarSign size={16} className="text-green-600" /> Revenue Leaders
        </h2>
        {revenue.length === 0 ? (
          <p className="text-xs text-ink-faint text-center py-4">No data yet.</p>
        ) : (
          <div className="divide-y divide-surface-100">
            {revenue.map((rep: any) => (
              <div key={rep.representative_id} className="py-2 flex items-center justify-between text-sm">
                <Link href={`/representatives/${rep.representative_id}`} className="font-medium text-ink hover:text-brand-600">
                  {rep.representatives?.full_name}
                </Link>
                <span className="text-xs font-mono text-ink-faint">₦{Number(rep.total_revenue).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Customer Champions */}
      <div className="card p-5">
        <h2 className="font-semibold text-sm text-ink mb-3 flex items-center gap-2">
          <Target size={16} className="text-purple-500" /> Customer Champions
        </h2>
        {customer.length === 0 ? (
          <p className="text-xs text-ink-faint text-center py-4">No data yet.</p>
        ) : (
          <div className="divide-y divide-surface-100">
            {customer.map((rep: any) => (
              <div key={rep.representative_id} className="py-2 flex items-center justify-between text-sm">
                <Link href={`/representatives/${rep.representative_id}`} className="font-medium text-ink hover:text-brand-600">
                  {rep.representatives?.full_name}
                </Link>
                <span className="text-xs text-ink-faint">{rep.retention_rate}% retention</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}