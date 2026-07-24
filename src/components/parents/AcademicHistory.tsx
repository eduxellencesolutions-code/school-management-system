'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface HistoryEntry {
  id: string
  sessionName: string | null
  className: string | null
  status: string
  average: number | null
  position: number | null
  promotedToClassName: string | null
  date: string
}

export default function AcademicHistory({ learnerId }: { learnerId: string }) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/parents/history?learnerId=${learnerId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else setHistory(data.history ?? [])
      })
      .catch(() => setError('Could not load academic history.'))
      .finally(() => setLoading(false))
  }, [learnerId])

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-ink-muted flex items-center justify-center gap-2">
        <Loader2 size={16} className="animate-spin" /> Loading history...
      </div>
    )
  }

  if (error) {
    return <div className="card p-6 text-sm text-red-600 bg-red-50 border-red-100">{error}</div>
  }

  // Oldest first for trend comparison, but we display newest first
  const chronological = [...history].reverse()

  function trendIcon(idx: number) {
    if (idx === 0) return null
    const prev = chronological[idx - 1]?.average
    const curr = chronological[idx]?.average
    if (prev == null || curr == null) return null
    if (curr > prev) return <TrendingUp size={14} className="text-green-600" />
    if (curr < prev) return <TrendingDown size={14} className="text-red-600" />
    return <Minus size={14} className="text-ink-faint" />
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/parent/dashboard" className="text-sm text-brand-500 hover:underline flex items-center gap-1 w-fit">
        <ArrowLeft size={14} /> Back to dashboard
      </Link>

      <div>
        <h1 className="page-title">Academic History</h1>
        <p className="page-subtitle">Every past term and class on record.</p>
      </div>

      {history.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-muted">
          No academic history recorded yet.
        </div>
      ) : (
        <div className="card divide-y divide-surface-100">
          {history.map((h, displayIdx) => {
            const chronoIdx = chronological.findIndex((c) => c.id === h.id)
            return (
              <div key={h.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {h.sessionName ?? '—'} · {h.className ?? '—'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`badge text-[10px] ${
                      h.status === 'promoted' ? 'badge-green'
                      : h.status === 'repeated' ? 'badge-amber'
                      : 'badge-gray'
                    }`}>
                      {h.status}
                    </span>
                    {h.promotedToClassName && (
                      <span className="text-xs text-ink-faint">→ {h.promotedToClassName}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-right">
                  {h.average !== null && (
                    <>
                      {trendIcon(chronoIdx)}
                      <div>
                        <p className="text-sm font-bold text-ink font-mono">{h.average}%</p>
                        {h.position && <p className="text-xs text-ink-faint">Position {h.position}</p>}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}