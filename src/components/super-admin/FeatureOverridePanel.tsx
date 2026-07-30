'use client'

import { useState, useEffect } from 'react'
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

const FEATURE_KEYS = [
  'attendance',
  'affective_psychomotor',
  'homework',
  'fees',
  'parent_portal',
  'promotion'
]

const FEATURE_LABELS: Record<string, string> = {
  attendance: 'Attendance',
  affective_psychomotor: 'Affective & Psychomotor',
  homework: 'Homework',
  fees: 'Fees',
  parent_portal: 'Parent Portal',
  promotion: 'Promotion'
}

export default function FeatureOverridePanel({ orgId }: { orgId: string }) {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadOverrides() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/platform-staff/feature-overrides?orgId=${orgId}`)
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        const map: Record<string, boolean> = {}
        ;(data.overrides ?? []).forEach((o: any) => {
          map[o.feature_key] = o.enabled
        })
        setOverrides(map)
      }
    } catch (err) {
      setError('Failed to load feature overrides')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOverrides()
  }, [orgId])

  async function toggleFeature(key: string, currentValue: boolean | undefined) {
    const newValue = !currentValue
    setSaving(key)
    setError(null)

    // Optimistically update UI
    setOverrides(prev => ({ ...prev, [key]: newValue }))

    try {
      const res = await fetch('/api/platform-staff/feature-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          featureKey: key,
          enabled: newValue,
          reason: `Manual override by Super Admin`,
          expiresAt: null,
        }),
      })

      const data = await res.json()
      if (!data.success) {
        // Revert on error
        setOverrides(prev => ({ ...prev, [key]: currentValue ?? false }))
        setError(data.error || 'Failed to update feature override')
      }
    } catch (err) {
      // Revert on error
      setOverrides(prev => ({ ...prev, [key]: currentValue ?? false }))
      setError('Failed to update feature override')
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="card p-5">
        <h2 className="font-semibold text-sm text-ink mb-3">Feature Overrides</h2>
        <div className="flex items-center justify-center py-4">
          <Loader2 size={20} className="animate-spin text-ink-muted" />
        </div>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-sm text-ink mb-1">Feature Overrides</h2>
      <p className="text-xs text-ink-faint mb-3">
        Grant or revoke a feature independent of the school's plan — for beta testing, promotions, or troubleshooting.
      </p>

      {error && (
        <div className="mb-3 p-2 rounded bg-red-50 border border-red-200 text-xs text-red-600 flex items-center gap-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {FEATURE_KEYS.map((key) => {
          const isEnabled = !!overrides[key]
          const isSaving = saving === key

          return (
            <div
              key={key}
              className={`flex items-center justify-between p-2 rounded border transition-colors ${
                isEnabled
                  ? 'border-green-200 bg-green-50'
                  : 'border-surface-200 bg-surface-50'
              }`}
            >
              <span className="text-sm text-ink">{FEATURE_LABELS[key] || key}</span>
              <button
                onClick={() => toggleFeature(key, overrides[key])}
                disabled={isSaving}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  isEnabled
                    ? 'bg-green-200 text-green-700 hover:bg-green-300'
                    : 'bg-surface-200 text-ink-muted hover:bg-surface-300'
                } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSaving ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : isEnabled ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle size={12} /> Enabled
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <XCircle size={12} /> Disabled
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-surface-200">
        <p className="text-[10px] text-ink-faint">
          These overrides apply to this school only and take precedence over plan defaults.
        </p>
      </div>
    </div>
  )
}