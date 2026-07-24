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

const GOLD = '#C8960C'
const MUTED = '#6B6456'
const BORDER = '#E2D9C8'

function ProgressChart({ entries }: { entries: HistoryEntry[] }) {
  // Chronological order (oldest first), only entries with a real average
  const points = [...entries]
    .reverse()
    .filter((e) => e.average !== null && e.average !== undefined)

  if (points.length === 0) {
    return (
      <div className="card p-6 text-center text-sm text-ink-muted">
        No completed terms with results yet — the progress chart will appear once results are available.
      </div>
    )
  }

  if (points.length === 1) {
    return (
      <div className="card p-6 text-center">
        <p className="text-xs text-ink-muted mb-2">Progress Trend</p>
        <p className="text-3xl font-bold" style={{ color: GOLD }}>{points[0].average}%</p>
        <p className="text-xs text-ink-faint mt-1">
          {points[0].sessionName ?? '—'} · {points[0].className ?? '—'}
        </p>
        <p className="text-[11px] text-ink-faint mt-3 italic">
          Only one completed term on record — a trend will appear once more terms are available.
        </p>
      </div>
    )
  }

  // SVG geometry
  const width = 600
  const height = 200
  const paddingX = 40
  const paddingY = 30
  const chartWidth = width - paddingX * 2
  const chartHeight = height - paddingY * 2

  const maxVal = 100
  const minVal = 0

  const stepX = chartWidth / (points.length - 1)

  const coords = points.map((p, i) => {
    const x = paddingX + i * stepX
    const y = paddingY + chartHeight - ((p.average! - minVal) / (maxVal - minVal)) * chartHeight
    return { x, y, ...p }
  })

  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')

  return (
    <div className="card p-4">
      <p className="text-xs font-semibold text-ink-muted mb-2 px-2">Progress Trend</p>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          style={{ minWidth: Math.max(400, points.length * 90) }}
          preserveAspectRatio="none"
        >
          {/* Gridlines at 0/50/100 */}
          {[0, 50, 100].map((val) => {
            const y = paddingY + chartHeight - ((val - minVal) / (maxVal - minVal)) * chartHeight
            return (
              <g key={val}>
                <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke={BORDER} strokeWidth={1} />
                <text x={paddingX - 8} y={y + 3} fontSize={9} fill={MUTED} textAnchor="end">{val}%</text>
              </g>
            )
          })}

          {/* Trend line */}
          <path d={pathD} fill="none" stroke={GOLD} strokeWidth={2} />

          {/* Points + labels */}
          {coords.map((c, i) => (
            <g key={c.id}>
              <circle cx={c.x} cy={c.y} r={4} fill={GOLD} stroke="#fff" strokeWidth={1.5} />
              <text x={c.x} y={c.y - 10} fontSize={10} fontWeight="bold" fill="#0D0D0D" textAnchor="middle">
                {c.average}%
              </text>
              <text x={c.x} y={height - 6} fontSize={8.5} fill={MUTED} textAnchor="middle">
                {c.sessionName ?? '—'}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

function trendIcon(chronological: HistoryEntry[], idx: number) {
  if (idx === 0) return null
  const prev = chronological[idx - 1]?.average
  const curr = chronological[idx]?.average
  if (prev == null || curr == null) return null
  if (curr > prev) return <TrendingUp size={14} className="text-green-600" />
  if (curr < prev) return <TrendingDown size={14} className="text-red-600" />
  return <Minus size={14} className="text-ink-faint" />
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

  const chronological = [...history].reverse()

  return (
    <div className="flex flex-col gap-4">
      <Link href="/parent/dashboard" className="text-sm text-brand-500 hover:underline flex items-center gap-1 w-fit">
        <ArrowLeft size={14} /> Back to dashboard
      </Link>

      <div>
        <h1 className="page-title">Academic History</h1>
        <p className="page-subtitle">Every past term and class on record.</p>
      </div>

      <ProgressChart entries={history} />

      {history.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-muted">
          No academic history recorded yet.
        </div>
      ) : (
        <div className="card divide-y divide-surface-100">
          {history.map((h) => {
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
                      {trendIcon(chronological, chronoIdx)}
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