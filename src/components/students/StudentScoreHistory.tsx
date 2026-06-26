import { formatDateTime, formatScore } from '@/lib/utils'
import { ClipboardList } from 'lucide-react'

interface ScoreEntry {
  score: number | null
  entered_at: string
  subject: { name: string } | null
  component: { name: string; max_score: number } | null
}

interface Props { scores: ScoreEntry[] }

export default function StudentScoreHistory({ scores }: Props) {
  if (scores.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-sm text-ink">Score history</h2>
        </div>
        <div className="card-body flex flex-col items-center py-10 text-center">
          <ClipboardList size={32} className="text-surface-200 mb-3" />
          <p className="text-sm text-ink-muted">No scores recorded yet</p>
        </div>
      </div>
    )
  }

  // Group scores by subject
  const bySubject = scores.reduce<Record<string, ScoreEntry[]>>((acc, s) => {
    const key = s.subject?.name ?? 'Unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h2 className="font-semibold text-sm text-ink">Score history</h2>
        <span className="badge badge-gray">{scores.length} entries</span>
      </div>

      <div className="divide-y divide-surface-200">
        {Object.entries(bySubject).map(([subjectName, entries]) => {
          const subTotal = entries.reduce((sum, e) => sum + (e.score ?? 0), 0)
          const maxTotal = entries.reduce((sum, e) => sum + (e.component?.max_score ?? 0), 0)
          const pct = maxTotal > 0 ? (subTotal / maxTotal) * 100 : 0

          return (
            <div key={subjectName}>
              {/* Subject header */}
              <div className="px-5 py-3 bg-surface-50 flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">{subjectName}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink-muted font-mono">
                    {subTotal}/{maxTotal}
                  </span>
                  <span className={`badge text-xs font-semibold
                    ${pct >= 70 ? 'badge-green' : pct >= 50 ? 'badge-blue' : pct >= 40 ? 'badge-amber' : 'badge-red'}`}>
                    {pct.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Component rows */}
              {entries.map((entry, i) => (
                <div key={i} className="px-5 py-2.5 flex items-center justify-between border-t border-surface-100 hover:bg-surface-50 transition-colors">
                  <div>
                    <span className="text-sm text-ink">{entry.component?.name ?? '—'}</span>
                    <span className="text-xs text-ink-faint ml-2">/ {entry.component?.max_score ?? '?'}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold font-mono text-ink">
                      {entry.score !== null ? formatScore(entry.score) : '—'}
                    </span>
                    <span className="text-xs text-ink-faint w-32 text-right">
                      {formatDateTime(entry.entered_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
