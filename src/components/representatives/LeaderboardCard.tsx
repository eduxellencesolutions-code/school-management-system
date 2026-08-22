// src/components/representatives/LeaderboardCard.tsx
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, Trophy } from 'lucide-react'

export default function LeaderboardCard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/representatives/leaderboard/summary').then(r => r.json()).then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="card p-4 flex justify-center"><Loader2 className="animate-spin" size={16} /></div>
  if (!data || data.error || !data.leaderboard?.has_snapshot) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-1"><Trophy size={14} className="text-amber-500" /><p className="text-sm font-semibold text-ink">Leadership Board</p></div>
        <p className="text-xs text-ink-faint">Rankings are calculated daily. Check back after your first activity is recorded.</p>
      </div>
    )
  }

  const lb = data.leaderboard
  const rankChangeText = lb.rank_change == null ? null
    : lb.rank_change > 0 ? `↑ moved up ${lb.rank_change} place${lb.rank_change > 1 ? 's' : ''}`
    : lb.rank_change < 0 ? `↓ down ${Math.abs(lb.rank_change)} place${Math.abs(lb.rank_change) > 1 ? 's' : ''}`
    : 'No change since last snapshot'

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2"><Trophy size={14} className="text-amber-500" /><p className="text-sm font-semibold text-ink">Leadership Board</p></div>
        <Link href="/rep/leaderboard" className="text-xs text-brand-600 hover:underline">View Full Leaderboard</Link>
      </div>
      <p className="text-lg font-bold text-ink">🏆 Your Rank: #{lb.rank} of {lb.total_representatives}</p>
      <p className="text-sm text-brand-600 font-semibold">{lb.performance_score} Performance Points</p>
      <p className="text-xs text-ink-muted mt-1">{lb.qualifying_schools_count} qualifying active schools</p>
      {lb.next_growth_level && (
        <p className="text-xs text-ink-faint mt-1">⭐ {lb.next_growth_level.schools_needed} more school{lb.next_growth_level.schools_needed !== 1 ? 's' : ''} to reach {lb.next_growth_level.label}</p>
      )}
      {lb.points_behind_next_rank != null && lb.points_behind_next_rank > 0 && (
        <p className="text-xs text-ink-faint">You're only {lb.points_behind_next_rank} points behind the next rank</p>
      )}
      {rankChangeText && <p className="text-xs text-ink-faint mt-1">{rankChangeText}</p>}
      <p className="text-[10px] text-ink-faint mt-2 pt-2 border-t border-surface-100">
        Ranking calculated {new Date(lb.computed_at).toLocaleString('en-NG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC
      </p>
    </div>
  )
}