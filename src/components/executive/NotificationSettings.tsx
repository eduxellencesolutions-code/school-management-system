// src/components/executive/NotificationSettings.tsx
'use client'
import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

const CATEGORIES = [
  { group: 'Attendance', items: [
    { type: 'attendance_5day_absence', label: 'Student absent for 5 consecutive school days' },
    { type: 'attendance_below_80', label: 'Attendance below 80%' },
    { type: 'attendance_class_below_85', label: 'Class attendance below 85%' },
  ]},
  { group: 'Fees', items: [
    { type: 'fees_collection_below_target', label: 'Fee collection falls below target' },
    { type: 'fees_outstanding_beyond_period', label: 'Student has outstanding balance beyond configured period' },
    { type: 'fees_class_high_defaulters', label: 'Class has high concentration of fee defaulters' },
  ]},
  { group: 'Student Population', items: [
    { type: 'student_withdrawal', label: 'Student withdrawal' },
    { type: 'student_transfer', label: 'Student transfer' },
    { type: 'student_enrolment_drop', label: 'Significant drop in enrolment' },
  ]},
  { group: 'School Operations', items: [
    { type: 'results_not_completed', label: 'Results not completed by deadline' },
    { type: 'results_awaiting_approval', label: 'Results awaiting approval' },
    { type: 'promotion_pending', label: 'Promotion process pending' },
    { type: 'announcement', label: 'Important announcement' },
  ]},
]

const CHANNELS = [
  { value: 'daily_summary', label: 'Daily summary' },
  { value: 'weekly_summary', label: 'Weekly summary' },
  { value: 'immediate', label: 'Immediate alerts' },
]

export default function NotificationSettings() {
  const [prefs, setPrefs] = useState<Record<string, { channel: string; enabled: boolean }>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/executive/notification-preferences').then(r => r.json()).then(d => {
      const map: Record<string, { channel: string; enabled: boolean }> = {}
      ;(d.preferences ?? []).forEach((p: any) => { map[p.type] = { channel: p.channel, enabled: p.enabled } })
      setPrefs(map)
    }).finally(() => setLoading(false))
  }, [])

  async function update(type: string, channel: string, enabled: boolean) {
    setSaving(type)
    setPrefs(prev => ({ ...prev, [type]: { channel, enabled } }))
    await fetch('/api/executive/notification-preferences', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, channel, enabled }),
    })
    setSaving(null)
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" size={20} /></div>

  return (
    <div className="flex flex-col gap-6">
      {CATEGORIES.map(cat => (
        <div key={cat.group} className="card p-5">
          <h3 className="font-semibold text-sm text-ink mb-3">{cat.group}</h3>
          <div className="flex flex-col gap-3">
            {cat.items.map(item => {
              const current = prefs[item.type] ?? { channel: 'daily_summary', enabled: false }
              return (
                <div key={item.type} className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm text-ink flex-1">
                    <input
                      type="checkbox"
                      checked={current.enabled}
                      onChange={e => update(item.type, current.channel, e.target.checked)}
                    />
                    {item.label}
                  </label>
                  <select
                    disabled={!current.enabled || saving === item.type}
                    value={current.channel}
                    onChange={e => update(item.type, e.target.value, current.enabled)}
                    className="input text-xs w-auto"
                  >
                    {CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}