'use client'

import { useState, useEffect } from 'react'
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react'

export default function AnalyticsDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/platform-staff/analytics').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>
  if (!data) return null

  const { revenue, growth, conversion, usage } = data

  return (
    <div className="flex flex-col gap-4">
      <div className="card p-5">
        <p className="text-xs text-ink-muted mb-1">Estimated Monthly Revenue</p>
        <p className="text-2xl font-bold text-ink">₦{revenue.total.toLocaleString()}</p>
        <div className="grid grid-cols-4 gap-2 mt-3">
          {Object.entries(revenue.byPlan).map(([plan, amt]: [string, any]) => (
            <div key={plan} className="text-center">
              <p className="text-sm font-bold">₦{amt.toLocaleString()}</p>
              <p className="text-[10px] text-ink-faint capitalize">{plan.replace(/_/g, ' ')}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-1 mb-1">
            {growth.growthRatePercent !== null && growth.growthRatePercent >= 0
              ? <TrendingUp size={14} className="text-green-600" />
              : <TrendingDown size={14} className="text-red-600" />}
            <p className="text-xs text-ink-muted">New Schools (Growth)</p>
          </div>
          <p className="text-xl font-bold">{growth.newOrgsThisMonth}</p>
          <p className="text-xs text-ink-faint">{growth.growthRatePercent !== null ? `${growth.growthRatePercent}% vs last month` : '—'}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-muted mb-1">Free → Paid Conversion</p>
          <p className="text-xl font-bold">{conversion.freeToPaidPercent}%</p>
          <p className="text-xs text-ink-faint">{conversion.paidOrgs} paid / {conversion.totalOrgs} total</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-muted mb-1">Solo Teacher Revenue</p>
          <p className="text-xl font-bold">₦{revenue.soloRevenue.toLocaleString()}</p>
        </div>
      </div>

      <div className="card p-5">
        <p className="text-sm font-semibold text-ink mb-3">Platform Usage</p>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div><p className="text-lg font-bold">{usage.reportsGenerated.toLocaleString()}</p><p className="text-[10px] text-ink-faint">Reports</p></div>
          <div><p className="text-lg font-bold">{usage.attendanceRecords.toLocaleString()}</p><p className="text-[10px] text-ink-faint">Attendance</p></div>
          <div><p className="text-lg font-bold">{usage.homeworkSubmissions.toLocaleString()}</p><p className="text-[10px] text-ink-faint">Homework</p></div>
          <div><p className="text-lg font-bold">{usage.feePayments.toLocaleString()}</p><p className="text-[10px] text-ink-faint">Fee Payments</p></div>
        </div>
      </div>
    </div>
  )
}