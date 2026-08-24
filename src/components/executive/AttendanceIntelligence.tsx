// src/components/executive/AttendanceIntelligence.tsx
'use client'
import { useState, useEffect } from 'react'
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'

const TIERS = [
  { key: 'consecutive_5plus', emoji: '🔴', label: 'Absent 5+ consecutive school days', color: 'text-red-600', bg: 'bg-red-50' },
  { key: 'repeated_2weeks', emoji: '🟠', label: 'Absent repeatedly over the last 2 weeks', color: 'text-orange-600', bg: 'bg-orange-50' },
  { key: 'below_80_percent', emoji: '🟡', label: 'Attendance below 80%', color: 'text-amber-600', bg: 'bg-amber-50' },
] as const

export default function AttendanceIntelligence() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  function load() {
    fetch('/api/executive/attendance-alerts').then(r => r.json()).then(setData).finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function markFollowedUp(learnerId: string, alertType: string) {
    setBusy(learnerId)
    await fetch('/api/executive/attendance-alerts/followup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ learnerId, alertType }),
    })
    setBusy(null)
    load()
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" size={20} /></div>
  if (!data || data.error) return null

  const totalAlerts = TIERS.reduce((sum, t) => sum + (data[t.key]?.length ?? 0), 0)
  const followedUpSet = new Set((data.followups ?? []).map((f: any) => `${f.learner_id}_${f.alert_type}`))

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={16} className="text-amber-500" />
        <h2 className="font-semibold text-sm text-ink">Attendance Alerts</h2>
        <span className="text-xs text-ink-faint ml-auto">{totalAlerts} student{totalAlerts !== 1 ? 's' : ''} flagged</span>
      </div>

      <div className="flex flex-col gap-2">
        {TIERS.map(tier => {
          const students = data[tier.key] ?? []
          if (students.length === 0) return null
          return (
            <div key={tier.key} className="border border-surface-100 rounded">
              <button
                onClick={() => setExpanded(expanded === tier.key ? null : tier.key)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm ${tier.bg} rounded`}
              >
                <span>{tier.emoji} <strong>{students.length}</strong> student{students.length !== 1 ? 's' : ''} — {tier.label}</span>
                <span className="text-xs text-ink-faint">{expanded === tier.key ? 'Hide' : 'View'}</span>
              </button>
              {expanded === tier.key && (
                <div className="divide-y divide-surface-100">
                  {students.map((s: any) => {
                    const key = `${s.learner_id}_${tier.key}`
                    const followedUp = followedUpSet.has(key)
                    return (
                      <div key={s.learner_id} className="px-3 py-2.5 flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium text-ink">{s.last_name} {s.first_name}</p>
                          <p className="text-xs text-ink-faint">
                            {s.class_name ?? 'Unassigned'}
                            {tier.key === 'consecutive_5plus' && ` · ${s.consecutive_days} consecutive days`}
                            {tier.key === 'repeated_2weeks' && ` · ${s.absences_last_14_days} absences in 14 days`}
                            {tier.key === 'below_80_percent' && ` · ${s.attendance_percentage}% attendance`}
                          </p>
                          <p className="text-xs text-ink-faint italic mt-0.5">Requires follow-up</p>
                        </div>
                        {followedUp ? (
                          <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 size={13} /> Followed up</span>
                        ) : (
                          <button
                            disabled={busy === s.learner_id}
                            onClick={() => markFollowedUp(s.learner_id, tier.key)}
                            className="btn-sm btn bg-surface-100 text-ink"
                          >
                            Mark Followed Up
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
        {totalAlerts === 0 && <p className="text-xs text-ink-faint text-center py-4">No attendance concerns right now.</p>}
      </div>
    </div>
  )
}