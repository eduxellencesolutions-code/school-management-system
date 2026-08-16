'use client'

import { useState, useEffect } from 'react'
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line,
} from 'recharts'

const STATUS_COLORS = { completed: '#22c55e', in_progress: '#f59e0b', not_started: '#e5e7eb' }

const STEP_LABELS: Record<string, string> = {
  profile: 'Profile', academic_term: 'Academic Term', classes: 'Classes', subjects: 'Subjects',
  students: 'Students', grading: 'Grading', staff: 'Staff', results_entered: 'Results Entered',
  results_locked_or_published: 'Lock/Publish', parent_access: 'Parent Portal',
  reports_generated: 'Reports',
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'onboarding' | 'founding500' | 'referrals'>('overview')

  useEffect(() => {
    fetch('/api/platform-staff/analytics').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>
  if (!data) return null

  const { revenue, growth, conversion, usage, onboarding, founding500, referrals } = data

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 border-b border-surface-200">
        {(['overview', 'onboarding', 'founding500', 'referrals'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {t === 'founding500' ? 'Founding 500' : t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
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
      )}

      {tab === 'onboarding' && onboarding && (
        <OnboardingTab data={onboarding} />
      )}

      {tab === 'founding500' && founding500 && (
        <Founding500Tab data={founding500} />
      )}

      {tab === 'referrals' && referrals && (
        <ReferralsTab data={referrals} />
      )}
    </div>
  )
}

function OnboardingTab({ data }: { data: any }) {
  const { institution, solo_teacher } = data

  const donutData = (seg: any) => [
    { name: 'Completed', value: seg.completed, key: 'completed' },
    { name: 'In Progress', value: seg.in_progress, key: 'in_progress' },
    { name: 'Not Started', value: seg.not_started, key: 'not_started' },
  ]

  const stuckData = (stuckByStep: Record<string, number>) =>
    Object.entries(stuckByStep)
      .map(([key, count]) => ({ step: STEP_LABELS[key] ?? key, count }))
      .sort((a, b) => b.count - a.count)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <SegmentCard title="Institutions" seg={institution} donutData={donutData(institution)} />
        <SegmentCard title="Solo Teachers" seg={solo_teacher} donutData={donutData(solo_teacher)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StuckCard title="Institutions Stuck By Step" chartData={stuckData(institution.stuck_by_step)} />
        <StuckCard title="Solo Teachers Stuck By Step" chartData={stuckData(solo_teacher.stuck_by_step)} />
      </div>
    </div>
  )
}

function SegmentCard({ title, seg, donutData }: { title: string; seg: any; donutData: any[] }) {
  return (
    <div className="card p-5">
      <p className="text-sm font-semibold text-ink mb-1">{title}</p>
      <p className="text-xs text-ink-faint mb-3">{seg.total} total · {seg.avg_percent}% average completion</p>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={60} paddingAngle={2}>
              {donutData.map((entry) => (
                <Cell key={entry.key} fill={STATUS_COLORS[entry.key as keyof typeof STATUS_COLORS]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend verticalAlign="bottom" height={24} iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function StuckCard({ title, chartData }: { title: string; chartData: { step: string; count: number }[] }) {
  if (chartData.length === 0) {
    return (
      <div className="card p-5">
        <p className="text-sm font-semibold text-ink mb-3">{title}</p>
        <p className="text-xs text-ink-faint">No one currently stuck — everyone in progress has advanced past every step, or no accounts have started yet.</p>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <p className="text-sm font-semibold text-ink mb-3">{title}</p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="step" width={100} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function Founding500Tab({ data }: { data: any }) {
  const { slots, enrollment_trend, expiry_timeline, referral_breakdown, conversion } = data

  const slotsPercent = slots.max > 0 ? Math.round((slots.claimed / slots.max) * 100) : 0

  const conversionDonut = [
    { name: 'Converted', value: conversion.converted, color: '#22c55e' },
    { name: 'Not Converted', value: conversion.not_converted, color: '#ef4444' },
    { name: 'Still Active', value: conversion.still_active, color: '#3b82f6' },
    { name: 'Cancelled', value: conversion.cancelled, color: '#9ca3af' },
  ].filter((d) => d.value > 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-ink-muted mb-1">Slots Claimed</p>
          <p className="text-xl font-bold">{slots.claimed} / {slots.max}</p>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
            <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${slotsPercent}%` }} />
          </div>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-muted mb-1">Slots Remaining</p>
          <p className="text-xl font-bold">{slots.remaining}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-muted mb-1">Converted to Paid</p>
          <p className="text-xl font-bold">{conversion.converted}</p>
          <p className="text-xs text-ink-faint">of {conversion.converted + conversion.not_converted} lapsed enrollments</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="text-sm font-semibold text-ink mb-3">Enrollment Trend</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={enrollment_trend}>
                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <p className="text-sm font-semibold text-ink mb-3">Conversion After Expiry</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={conversionDonut} dataKey="value" nameKey="name" innerRadius={40} outerRadius={60} paddingAngle={2}>
                  {conversionDonut.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={24} iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="text-sm font-semibold text-ink mb-3">Referral Source Breakdown</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={referral_breakdown} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="source" width={110} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <p className="text-sm font-semibold text-ink mb-3">Upcoming Expirations</p>
          {expiry_timeline.length === 0 ? (
            <p className="text-xs text-ink-faint">No active enrollments expiring soon.</p>
          ) : (
            <div className="divide-y divide-surface-200 max-h-56 overflow-y-auto">
              {expiry_timeline.map((e: any, i: number) => (
                <div key={i} className="py-2 flex items-center justify-between text-sm">
                  <span className="text-ink font-medium">{e.organization_name}</span>
                  <span className="text-xs text-amber-700">
                    Slot #{e.slot_number} · {new Date(e.promo_expires_at).toLocaleDateString('en-NG')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ReferralsTab({ data }: { data: any }) {
  const { representatives, referrals, commissions, top_representatives } = data

  const commissionStatusData = Object.entries(commissions.by_status).map(([status, amt]) => ({
    status: status === 'held' ? 'Held' : status.charAt(0).toUpperCase() + status.slice(1),
    amount: amt as number,
  }))

  const referralStatusData = Object.entries(referrals.by_status).map(([status, count]) => ({
    status: status.charAt(0).toUpperCase() + status.slice(1),
    count: count as number,
  }))

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-ink-muted mb-1">Representatives</p>
          <p className="text-xl font-bold">{representatives.total}</p>
          <p className="text-xs text-ink-faint">{representatives.by_status.active ?? 0} active</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-muted mb-1">Qualified Referrals</p>
          <p className="text-xl font-bold">{referrals.by_status.qualified ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-muted mb-1">Total Commission Earned</p>
          <p className="text-xl font-bold">₦{Number(commissions.total_earned).toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-muted mb-1">Total Commission Paid</p>
          <p className="text-xl font-bold">₦{Number(commissions.total_paid).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="text-sm font-semibold text-ink mb-3">Commissions by Status</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={commissionStatusData}>
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `₦${Number(v).toLocaleString()}`} />
                <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <p className="text-sm font-semibold text-ink mb-3">Referrals by Status</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={referralStatusData}>
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <p className="text-sm font-semibold text-ink mb-3">Top Representatives</p>
        <div className="divide-y divide-surface-200">
          {top_representatives.map((rep: any, i: number) => (
            <div key={i} className="py-2 flex items-center justify-between text-sm">
              <span className="text-ink font-medium">{rep.name}</span>
              <div className="flex gap-4 text-xs text-ink-faint">
                <span>{rep.qualified_customers_count} qualified</span>
                <span>₦{Number(rep.total_commission_earned).toLocaleString()} earned</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}