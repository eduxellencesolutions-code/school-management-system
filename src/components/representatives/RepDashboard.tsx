'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import WithdrawalPanel from './WithdrawalPanel'
import GrowthLevelCard from './GrowthLevelCard'
import SchoolPortfolioSummaryCard from './SchoolPortfolioSummaryCard'
import LeaderboardCard from './LeaderboardCard'

export default function RepDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function load() {
    fetch('/api/representatives/me')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin" /></div>
  if (error) return <div className="card p-6 text-red-600 max-w-md mx-auto text-center">{error}</div>
  if (!data) return null

  const { representative: rep, referrals, commissions, wallet, bankAccounts, withdrawals } = data

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-4">
      <div className="card p-5">
        <p className="text-sm text-ink-muted">Welcome, {rep.full_name}</p>
        <p className="text-xs text-ink-faint">Territory: {rep.territory_state ?? '—'}</p>
        <p className="text-xs text-ink-faint font-mono mt-1">Referral code: {rep.referral_code}</p>
      </div>

      <GrowthLevelCard />
      <LeaderboardCard />

      {/* ✅ Withdrawal Panel */}
      <WithdrawalPanel wallet={wallet} bankAccounts={bankAccounts} withdrawals={withdrawals} onRefresh={load} />

      <SchoolPortfolioSummaryCard />

      <div className="card">
        <div className="card-header font-semibold text-sm">Solo Teacher Referrals</div>
        <div className="divide-y divide-surface-100">
          {referrals.filter((r: any) => r.targetType !== 'school').length === 0 ? (
            <p className="p-4 text-sm text-ink-muted text-center">No solo teacher referrals yet.</p>
          ) : referrals.filter((r: any) => r.targetType !== 'school').map((r: any) => (
            <div key={r.id} className="p-3 flex justify-between items-center text-sm">
              <span>{r.targetName}</span>
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