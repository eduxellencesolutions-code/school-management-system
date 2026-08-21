// src/components/super-admin/RepresentativeSummaryPicker.tsx
'use client'
import { Loader2 } from 'lucide-react'

export default function RepresentativeSummaryPicker({
  summaries, loading, selectedRepId, onSelect, countKey, overdueKey,
}: {
  summaries: any[]; loading: boolean; selectedRepId: string | null
  onSelect: (id: string | null) => void
  countKey: 'followups_count' | 'feedback_count' | 'open_escalations'
  overdueKey?: 'followups_overdue'
}) {
  if (loading) return <div className="card p-4 flex justify-center"><Loader2 className="animate-spin" size={16} /></div>

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-50 border-b border-surface-200">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Representative</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Code</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Status</th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Schools</th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Count</th>
              {overdueKey && <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Overdue</th>}
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Growth Level</th>
            </tr>
          </thead>
          <tbody>
            <tr
              onClick={() => onSelect(null)}
              className={`border-b border-surface-100 cursor-pointer hover:bg-surface-50 ${selectedRepId === null ? 'bg-brand-50' : ''}`}
            >
              <td colSpan={overdueKey ? 7 : 6} className="px-4 py-3 font-medium text-brand-700">— All Representatives —</td>
            </tr>
            {summaries.map(r => (
              <tr
                key={r.id}
                onClick={() => onSelect(r.id)}
                className={`border-b border-surface-100 cursor-pointer hover:bg-surface-50 ${selectedRepId === r.id ? 'bg-brand-50' : ''}`}
              >
                <td className="px-4 py-3 font-medium text-ink">{r.full_name}</td>
                <td className="px-4 py-3 text-ink-muted font-mono text-xs">{r.referral_code}</td>
                <td className="px-4 py-3">
                  <span className={r.status === 'active' ? 'text-green-600 font-medium text-xs' : 'text-amber-600 font-medium text-xs'}>{r.status}</span>
                </td>
                <td className="px-4 py-3 text-center font-mono">{r.total_schools}</td>
                <td className="px-4 py-3 text-center font-mono">{r[countKey]}</td>
                {overdueKey && <td className="px-4 py-3 text-center font-mono text-red-600">{r[overdueKey]}</td>}
                <td className="px-4 py-3 text-xs text-ink-muted">{r.level?.replace(/_/g, ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}