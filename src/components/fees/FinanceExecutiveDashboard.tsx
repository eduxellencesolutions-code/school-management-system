'use client'

import { useState, useEffect } from 'react'
import { Loader2, TrendingUp, TrendingDown, Users, Wallet, AlertCircle, CheckCircle2 } from 'lucide-react'

interface Snapshot {
  expected: number
  collected: number
  outstanding: number
  collectionRate: number
}

interface TermStats {
  snapshot: Snapshot
  totalStudents: number
  payingStudents: number
  fullyPaidStudents: number
  studentsWithOutstanding: number
}

interface OverviewData {
  term: { id: string; name: string }
  session: { id: string; name: string } | null
  termOverTerm: { current: TermStats; previous: { term: { id: string; name: string }; stats: TermStats } | null }
  sessionOverSession: { current: TermStats; previous: { session: { id: string; name: string }; stats: TermStats } | null }
  sameTermAcrossSessions: { term: { id: string; name: string }; stats: TermStats } | null
}

function naira(n: number) {
  return `₦${Math.round(n).toLocaleString('en-NG')}`
}

function ChangeBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null
  const change = ((current - previous) / Math.abs(previous)) * 100
  const isUp = change >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isUp ? 'text-green-600' : 'text-red-600'}`}>
      {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {Math.abs(Math.round(change))}%
    </span>
  )
}

export default function FinanceExecutiveDashboard() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/fees/analytics/overview')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(() => setError('Failed to load financial overview'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="p-12 flex justify-center"><Loader2 className="animate-spin" size={24} /></div>
  }

  if (error) {
    return <div className="card p-8 text-center text-sm text-ink-muted">{error}</div>
  }

  if (!data) return null

  const { snapshot, totalStudents, payingStudents, fullyPaidStudents, studentsWithOutstanding } = data.termOverTerm.current
  const avgPerStudent = payingStudents > 0 ? snapshot.collected / payingStudents : 0

  const kpis = [
    { label: 'Total Students', value: totalStudents.toLocaleString('en-NG'), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Paying Students', value: payingStudents.toLocaleString('en-NG'), icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Fully Paid Students', value: fullyPaidStudents.toLocaleString('en-NG'), icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Students with Outstanding', value: studentsWithOutstanding.toLocaleString('en-NG'), icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Total Revenue', value: naira(snapshot.collected), icon: Wallet, color: 'text-brand-600', bg: 'bg-brand-50' },
    { label: 'Outstanding Revenue', value: naira(Math.max(snapshot.outstanding, 0)), icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Collection Rate', value: `${snapshot.collectionRate}%`, icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Avg. Payment / Student', value: naira(avgPerStudent), icon: Wallet, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Executive Financial Dashboard</h1>
        <p className="text-sm text-ink-muted mt-1">
          {data.session ? `${data.session.name} · ${data.term.name}` : data.term.name}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-4">
            <div className={`w-9 h-9 rounded ${bg} flex items-center justify-center mb-2`}>
              <Icon size={18} className={color} />
            </div>
            <div className="text-lg font-bold text-ink">{value}</div>
            <div className="text-xs text-ink-muted">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-semibold text-sm text-ink mb-3">
            Term-over-Term
            {data.termOverTerm.previous && (
              <span className="text-xs font-normal text-ink-faint ml-2">
                vs {data.termOverTerm.previous.term.name}
              </span>
            )}
          </h2>
          {data.termOverTerm.previous ? (
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Revenue</span>
                <span className="flex items-center gap-2">
                  {naira(snapshot.collected)}
                  <ChangeBadge current={snapshot.collected} previous={data.termOverTerm.previous.stats.snapshot.collected} />
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Collection Rate</span>
                <span className="flex items-center gap-2">
                  {snapshot.collectionRate}%
                  <ChangeBadge current={snapshot.collectionRate} previous={data.termOverTerm.previous.stats.snapshot.collectionRate} />
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Outstanding</span>
                <span className="flex items-center gap-2">
                  {naira(Math.max(snapshot.outstanding, 0))}
                  <ChangeBadge current={snapshot.outstanding} previous={data.termOverTerm.previous.stats.snapshot.outstanding} />
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-ink-faint">No prior term to compare against yet.</p>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-sm text-ink mb-3">
            Session-over-Session
            {data.sessionOverSession.previous && (
              <span className="text-xs font-normal text-ink-faint ml-2">
                vs {data.sessionOverSession.previous.session.name}
              </span>
            )}
          </h2>
          {data.sessionOverSession.previous ? (
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Revenue</span>
                <span className="flex items-center gap-2">
                  {naira(data.sessionOverSession.current.snapshot.collected)}
                  <ChangeBadge
                    current={data.sessionOverSession.current.snapshot.collected}
                    previous={data.sessionOverSession.previous.stats.snapshot.collected}
                  />
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Collection Rate</span>
                <span className="flex items-center gap-2">
                  {data.sessionOverSession.current.snapshot.collectionRate}%
                  <ChangeBadge
                    current={data.sessionOverSession.current.snapshot.collectionRate}
                    previous={data.sessionOverSession.previous.stats.snapshot.collectionRate}
                  />
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-ink-faint">No prior academic session to compare against yet.</p>
          )}
        </div>
      </div>

      {data.sameTermAcrossSessions && (
        <div className="card p-5">
          <h2 className="font-semibold text-sm text-ink mb-3">
            {data.term.name} — This Session vs {data.sameTermAcrossSessions.term.name} Last Session
          </h2>
          <div className="flex justify-between items-center text-sm">
            <span className="text-ink-muted">Revenue</span>
            <span className="flex items-center gap-2">
              {naira(snapshot.collected)}
              <ChangeBadge current={snapshot.collected} previous={data.sameTermAcrossSessions.stats.snapshot.collected} />
            </span>
          </div>
        </div>
      )}
    </div>
  )
}