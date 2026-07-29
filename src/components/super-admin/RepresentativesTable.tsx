'use client'
// src/components/super-admin/RepresentativesTable.tsx
import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export default function RepresentativesTable() {
  const [reps, setReps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/platform-staff/representatives').then(r => r.json()).then(d => { setReps(d.representatives ?? []); setLoading(false) })
  }, [])

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-50 border-b border-surface-200">
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Representative</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">State</th>
            <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Referrals</th>
            <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Qualified</th>
            <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Conversion</th>
            <th className="text-right px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Pending ₦</th>
            <th className="text-right px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Paid ₦</th>
          </tr>
        </thead>
        <tbody>
          {reps.map(r => (
            <tr key={r.id} className="border-b border-surface-100">
              <td className="px-4 py-3 font-medium">{r.full_name}<div className="text-xs text-ink-faint">{r.level.replace(/_/g,' ')}</div></td>
              <td className="px-4 py-3 text-ink-muted">{r.territory_state ?? '—'}</td>
              <td className="px-4 py-3 text-center font-mono">{r.totalReferrals}</td>
              <td className="px-4 py-3 text-center font-mono">{r.qualifiedReferrals}</td>
              <td className="px-4 py-3 text-center font-mono">{r.conversionRate}%</td>
              <td className="px-4 py-3 text-right font-mono">₦{r.pendingCommission.toLocaleString()}</td>
              <td className="px-4 py-3 text-right font-mono">₦{Number(r.total_commission_paid).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}