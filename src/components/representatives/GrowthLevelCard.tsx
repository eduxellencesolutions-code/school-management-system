'use client'
import { useState, useEffect } from 'react'
import { Loader2, Trophy } from 'lucide-react'

const LEVEL_ICONS: Record<number, string> = { 1: '??', 2: '?', 3: '??', 4: '??', 5: '??' }

export default function GrowthLevelCard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/representatives/growth-status').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return <div className="card p-4 flex justify-center"><Loader2 className="animate-spin" size={16} /></div>
  if (!data || data.error) return null

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy size={14} className="text-amber-500" />
        <p className="text-sm font-semibold text-ink">Your Growth Level</p>
      </div>

      <p className="text-lg font-bold text-ink">{LEVEL_ICONS[data.currentLevel]} {data.currentLabel}</p>
      <p className="text-sm text-brand-600 font-semibold mb-3">{data.currentCommissionRate}% Commission</p>

      {data.nextLevel ? (
        <>
          <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-brand-500" style={{ width: `${data.progressPct}%` }} />
          </div>
          <p className="text-xs text-ink-faint mb-3">
            {data.qualifiedCount} qualifying schools � {data.schoolsNeededForNext} more to reach {data.nextLabel} ({data.nextCommissionRate}%)
          </p>
        </>
      ) : (
        <p className="text-xs text-ink-faint mb-3">Top level reached � {data.qualifiedCount} qualifying schools</p>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-surface-100">
        <div><span className="text-ink-faint">Current Commission:</span> <span className="font-medium text-ink">{data.currentCommissionRate}%</span></div>
        <div><span className="text-ink-faint">Next Commission:</span> <span className="font-medium text-ink">{data.nextCommissionRate ? `${data.nextCommissionRate}%` : '�'}</span></div>
        <div><span className="text-ink-faint">Total Successful Schools:</span> <span className="font-medium text-ink">{data.qualifiedCount}</span></div>
        <div><span className="text-ink-faint">Schools Needed:</span> <span className="font-medium text-ink">{data.schoolsNeededForNext || '�'}</span></div>
      </div>
    </div>
  )
}
