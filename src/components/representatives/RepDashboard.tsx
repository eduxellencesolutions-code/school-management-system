'use client'

import { useState, useEffect } from 'react'
import { Loader2, TrendingUp } from 'lucide-react'

const LEVEL_THRESHOLDS: Record<string, { next: string; target: number }> = {
  growth_volunteer: { next: 'Certified Representative', target: 20 },
  certified_representative: { next: 'State Representative', target: 100 },
  state_representative: { next: 'Zonal Representative', target: 300 },
  zonal_representative: { next: '', target: 0 },
}

export default function RepDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/representatives/me')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin" /></div>
  if (error) return <div className="card p-6 text-red-600 max-w-md mx-auto text-center">{error}</div>
  if (!data) return null

  const { representative: rep, referrals, commissions, pendingCommission } = data
  const levelInfo = LEVEL_THRESHOLDS[rep.level]
  const progressPct = levelInfo?.target ? Math.min(100, (rep.qualified_customers_count / levelInfo.target) * 100) : 100

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-4">
      <div className="card p-5">
        <p className="text-sm text-ink-muted">Welcome, {rep.full_name}</p>
        <p className="text-xs text-ink-faint">Level: {rep.level.replace(/_/g, ' ')} · Territory: {rep.territory_state ?? '—'}</p>
        <p className="text-xs text-ink-faint font-mono mt-1">Referral code: {rep.referral_code}</p>
      </div>

      {levelInfo?.target > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-brand-500" />
            <p className="text-sm font-medium text-ink">Progress to {levelInfo.next}</p>
          </div>
          <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-brand-500" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="text-xs text-ink-faint">
            {rep.qualified_customers_count} / {levelInfo.target} qualified customers
            {rep.qualified_customers_count < levelInfo.target && ` — ${levelInfo.target - rep.qualified_customers_count} more to go`}
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center"><p className="text-xl font-bold">{rep.qualified_customers_count}</p><p className="text-xs text-ink-faint">Qualified Customers</p></div>
        <div className="card p-4 text-center"><p className="text-xl font-bold">₦{Number(rep.total_commission_earned).toLocaleString()}</p><p className="text-xs text-ink-faint">Total Earned</p></div>
        <div className="card p-4 text-center"><p className="text-xl font-bold">₦{pendingCommission.toLocaleString()}</p><p className="text-xs text-ink-faint">Pending</p></div>
      </div>

      <div className="card">
        <div className="card-header font-semibold text-sm">My Referrals</div>
        <div className="divide-y divide-surface-100">
          {referrals.length === 0 ? (
            <p className="p-4 text-sm text-ink-muted text-center">No referrals yet. Share your code to get started.</p>
          ) : referrals.map((r: any) => (
            <div key={r.id} className="p-3 flex justify-between items-center text-sm">
              <span>{r.targetName} <span className="text-xs text-ink-faint">({r.targetType === 'school' ? 'School' : 'Solo Teacher'})</span></span>
              <span className={`badge text-[10px] ${r.status === 'qualified' ? 'badge-green' : 'badge-gray'}`}>{r.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header font-semibold text-sm">Commissions</div>
        <div className="divide-y divide-surface-100">
          {commissions.length === 0 ? (
            <p className="p-4 text-sm text-ink-muted text-center">No commissions yet.</p>
          ) : commissions.map((c: any) => (
            <div key={c.id} className="p-3 flex justify-between items-center text-sm">
              <span>{c.subscription_plan} · ₦{Number(c.amount).toLocaleString()}</span>
              <span className={`badge text-[10px] ${c.status === 'paid' ? 'badge-green' : c.status === 'payable' ? 'badge-blue' : 'badge-gray'}`}>{c.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}