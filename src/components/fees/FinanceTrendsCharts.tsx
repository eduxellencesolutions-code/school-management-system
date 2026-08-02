'use client'

import { useState, useEffect } from 'react'
import { Loader2, TrendingUp } from 'lucide-react'

interface TermlyPoint {
  termId: string
  termName: string
  sessionName: string | null
  expected: number
  collected: number
  collectionRate: number
}

interface MonthlyPoint {
  month: string // YYYY-MM
  collected: number
}

function naira(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`
  return `₦${Math.round(n)}`
}

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('en-NG', { month: 'short', year: '2-digit' })
}

function TermlyBarChart({ data }: { data: TermlyPoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-ink-faint text-center py-12">No term data yet.</p>
  }

  const width = 700
  const height = 260
  const padding = { top: 20, right: 20, bottom: 50, left: 60 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const maxValue = Math.max(...data.flatMap(d => [d.expected, d.collected]), 1)
  const groupWidth = chartWidth / data.length
  const barWidth = Math.min(28, groupWidth / 3)

  const yTicks = 4
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => (maxValue / yTicks) * i)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Y-axis gridlines + labels */}
      {yTickValues.map((val, i) => {
        const y = padding.top + chartHeight - (val / maxValue) * chartHeight
        return (
          <g key={i}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#E5E7EB" strokeWidth={1} />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize={10} fill="#9CA3AF">
              {naira(val)}
            </text>
          </g>
        )
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const groupX = padding.left + i * groupWidth + groupWidth / 2
        const expectedHeight = (d.expected / maxValue) * chartHeight
        const collectedHeight = (d.collected / maxValue) * chartHeight
        return (
          <g key={d.termId}>
            <rect
              x={groupX - barWidth - 2}
              y={padding.top + chartHeight - expectedHeight}
              width={barWidth}
              height={expectedHeight}
              fill="#CBD5E1"
              rx={2}
            />
            <rect
              x={groupX + 2}
              y={padding.top + chartHeight - collectedHeight}
              width={barWidth}
              height={collectedHeight}
              fill="#1C6EF2"
              rx={2}
            />
            <text
              x={groupX}
              y={height - padding.bottom + 16}
              textAnchor="middle"
              fontSize={9}
              fill="#6B7280"
            >
              {d.termName}
            </text>
            <text
              x={groupX}
              y={height - padding.bottom + 28}
              textAnchor="middle"
              fontSize={8}
              fill="#9CA3AF"
            >
              {d.sessionName ?? ''}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function MonthlyLineChart({ data }: { data: MonthlyPoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-ink-faint text-center py-12">No payments recorded in the last 12 months.</p>
  }

  const width = 700
  const height = 220
  const padding = { top: 20, right: 20, bottom: 30, left: 60 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const maxValue = Math.max(...data.map(d => d.collected), 1)
  const stepX = data.length > 1 ? chartWidth / (data.length - 1) : 0

  const points = data.map((d, i) => {
    const x = padding.left + i * stepX
    const y = padding.top + chartHeight - (d.collected / maxValue) * chartHeight
    return { x, y, d }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`

  const yTicks = 4
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => (maxValue / yTicks) * i)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {yTickValues.map((val, i) => {
        const y = padding.top + chartHeight - (val / maxValue) * chartHeight
        return (
          <g key={i}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#E5E7EB" strokeWidth={1} />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize={10} fill="#9CA3AF">
              {naira(val)}
            </text>
          </g>
        )
      })}

      <path d={areaPath} fill="#1C6EF2" fillOpacity={0.08} />
      <path d={linePath} fill="none" stroke="#1C6EF2" strokeWidth={2} />

      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={3} fill="#1C6EF2" />
          <text x={p.x} y={height - padding.bottom + 16} textAnchor="middle" fontSize={9} fill="#6B7280">
            {monthLabel(p.d.month)}
          </text>
        </g>
      ))}
    </svg>
  )
}

export default function FinanceTrendsCharts() {
  const [termlyTrend, setTermlyTrend] = useState<TermlyPoint[]>([])
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/fees/analytics/trends')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else {
          setTermlyTrend(d.termlyTrend ?? [])
          setMonthlyTrend(d.monthlyTrend ?? [])
        }
      })
      .catch(() => setError('Failed to load trends'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="card p-8 flex justify-center"><Loader2 className="animate-spin" size={20} /></div>
  if (error) return <div className="card p-8 text-center text-sm text-ink-muted">{error}</div>

  return (
    <div className="flex flex-col gap-4">
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={16} className="text-brand-600" />
          <h2 className="font-semibold text-sm text-ink">Expected vs Collected — by Term</h2>
        </div>
        <div className="flex items-center gap-4 mb-3 text-xs text-ink-muted">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#CBD5E1] inline-block" /> Expected</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-brand-500 inline-block" /> Collected</span>
        </div>
        <TermlyBarChart data={termlyTrend} />
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-sm text-ink mb-3">Monthly Collection Trend</h2>
        <p className="text-xs text-ink-faint mb-3">Based on actual payment dates over the last 12 months.</p>
        <MonthlyLineChart data={monthlyTrend} />
      </div>
    </div>
  )
}