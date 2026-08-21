// src/components/super-admin/RepPerformanceList.tsx
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

export default function RepPerformanceList() {
  const [summaries, setSummaries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/platform-staff/representatives/management-summary')
      .then(r => r.json()).then(d => setSummaries(d.summaries ?? [])).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Representative Performance</h1>
        <p className="text-sm text-ink-muted mt-1">Click a representative for their full profile.</p>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Representative</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Schools</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Active</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Follow-ups</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Overdue</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Open Issues</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Resolved</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Growth Level</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map(r => (
                <tr key={r.id} className="border-b border-surface-100 hover:bg-surface-50">
                  <td className="px-4 py-3"><Link href={`/representatives/${r.id}`} className="font-medium text-brand-600 hover:underline">{r.full_name}</Link></td>
                  <td className="px-4 py-3 text-center font-mono">{r.total_schools}</td>
                  <td className="px-4 py-3 text-center font-mono">{r.active_schools}</td>
                  <td className="px-4 py-3 text-center font-mono">{r.followups_count}</td>
                  <td className="px-4 py-3 text-center font-mono text-red-600">{r.followups_overdue}</td>
                  <td className="px-4 py-3 text-center font-mono">{r.open_escalations}</td>
                  <td className="px-4 py-3 text-center font-mono">{r.resolved_escalations}</td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{r.level?.replace(/_/g, ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}