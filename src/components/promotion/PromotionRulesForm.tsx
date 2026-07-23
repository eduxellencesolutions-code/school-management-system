'use client'

import { useState, useEffect } from 'react'
import { Loader2, CheckCircle2, Info } from 'lucide-react'

interface Rules {
  min_average: number
  max_failed_subjects: number
  min_attendance: number
  auto_promote_all: boolean
}

export default function PromotionRulesForm() {
  const [rules, setRules] = useState<Rules | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/promotion/rules')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setRules(data.rules)
        }
      })
      .catch(() => setError('Could not load promotion rules.'))
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    if (!rules) return
    setSaving(true)
    setError(null)
    setSaved(false)

    const res = await fetch('/api/promotion/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        minAverage: rules.min_average,
        maxFailedSubjects: rules.max_failed_subjects,
        minAttendance: rules.min_attendance,
        autoPromoteAll: rules.auto_promote_all,
      }),
    })

    const data = await res.json()
    if (data.success) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } else {
      setError(data.error ?? 'Failed to save promotion rules.')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-ink-muted flex items-center justify-center gap-2">
        <Loader2 size={16} className="animate-spin" /> Loading...
      </div>
    )
  }

  if (error && !rules) {
    return <div className="card p-6 text-sm text-red-600 bg-red-50 border-red-100">{error}</div>
  }

  if (!rules) return null

  return (
    <div className="card p-6 max-w-lg flex flex-col gap-5">
      <div className="flex items-start gap-2 p-3 rounded bg-brand-50 border border-brand-100">
        <Info size={15} className="text-brand-600 mt-0.5 shrink-0" />
        <p className="text-xs text-brand-700 leading-relaxed">
          These rules are used to generate promotion <strong>recommendations</strong> in the Promotion Center.
          Admins can still override any individual student's outcome before confirming.
        </p>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={rules.auto_promote_all}
          onChange={(e) => setRules({ ...rules, auto_promote_all: e.target.checked })}
          className="w-4 h-4"
        />
        <div>
          <p className="text-sm font-medium text-ink">Promote all students automatically</p>
          <p className="text-xs text-ink-faint">Skip the criteria below and recommend promotion for every student.</p>
        </div>
      </label>

      <div className={rules.auto_promote_all ? 'opacity-40 pointer-events-none' : ''}>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Minimum average (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={rules.min_average}
              onChange={(e) => setRules({ ...rules, min_average: Number(e.target.value) })}
              className="w-full border border-surface-200 rounded px-3 py-2 text-sm"
            />
            <p className="text-xs text-ink-faint mt-1">Students below this average are recommended to repeat.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Maximum failed subjects</label>
            <input
              type="number"
              min={0}
              value={rules.max_failed_subjects}
              onChange={(e) => setRules({ ...rules, max_failed_subjects: Number(e.target.value) })}
              className="w-full border border-surface-200 rounded px-3 py-2 text-sm"
            />
            <p className="text-xs text-ink-faint mt-1">Students failing more subjects than this are recommended to repeat.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Minimum attendance (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={rules.min_attendance}
              onChange={(e) => setRules({ ...rules, min_attendance: Number(e.target.value) })}
              className="w-full border border-surface-200 rounded px-3 py-2 text-sm"
            />
            <p className="text-xs text-ink-faint mt-1">Students below this attendance rate are recommended to repeat.</p>
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-primary btn">
          {saving ? 'Saving...' : 'Save Rules'}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 size={14} /> Saved
          </span>
        )}
      </div>
    </div>
  )
}