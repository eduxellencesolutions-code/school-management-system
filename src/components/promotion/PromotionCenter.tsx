'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'

interface ClassOption {
  id: string
  name: string
}

interface Recommendation {
  learnerId: string
  name: string
  admissionNumber: string | null
  average: number
  failedSubjects: number
  attendanceRate: number | null
  recommended: 'promote' | 'repeat' | 'insufficient_data'
  reason: string
}

interface Props {
  classes: ClassOption[]
  sessionId: string
  termId: string
}

export default function PromotionCenter({ classes, sessionId, termId }: Props) {
  const [fromGroupId, setFromGroupId] = useState(classes[0]?.id ?? '')
  const [toGroupId, setToGroupId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null)
  const [overrides, setOverrides] = useState<Record<string, 'promote' | 'repeat'>>({})
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState<{ promoted: number; repeated: number } | null>(null)

  async function loadPreview() {
    setLoading(true)
    setError(null)
    setRecommendations(null)
    setConfirmed(null)

    const res = await fetch(
      `/api/promotion/preview?fromGroupId=${fromGroupId}&sessionId=${sessionId}&termId=${termId}`
    )
    const data = await res.json()

    if (data.error) {
      setError(data.error)
    } else {
      setReportId(data.reportId)
      setRecommendations(data.recommendations)
      const initialOverrides: Record<string, 'promote' | 'repeat'> = {}
      data.recommendations.forEach((r: Recommendation) => {
        if (r.recommended !== 'insufficient_data') {
          initialOverrides[r.learnerId] = r.recommended
        }
      })
      setOverrides(initialOverrides)
    }
    setLoading(false)
  }

  function toggleOverride(learnerId: string, status: 'promote' | 'repeat') {
    setOverrides((prev) => ({ ...prev, [learnerId]: status }))
  }

  async function confirmPromotion() {
    if (!toGroupId || !reportId || !recommendations) return

    setConfirming(true)
    setError(null)

    const decisions = recommendations
      .filter((r) => overrides[r.learnerId])
      .map((r) => ({
        learnerId: r.learnerId,
        status: overrides[r.learnerId] === 'promote' ? 'promoted' : 'repeated',
      }))

    const res = await fetch('/api/promotion/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromGroupId,
        toGroupId,
        sessionId,
        reportId,
        decisions,
      }),
    })

    const data = await res.json()
    if (data.success) {
      setConfirmed(data.result)
      setRecommendations(null)
    } else {
      setError(data.error ?? 'Failed to confirm promotion.')
    }
    setConfirming(false)
  }

  const destinationOptions = classes.filter((c) => c.id !== fromGroupId)

  return (
    <div className="flex flex-col gap-4">
      <div className="card p-5 flex items-end gap-4 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-ink-muted">From class</label>
          <select
            value={fromGroupId}
            onChange={(e) => {
              setFromGroupId(e.target.value)
              setRecommendations(null)
              setConfirmed(null)
            }}
            className="border border-surface-200 rounded px-2 py-1.5 text-sm"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-ink-muted">To class</label>
          <select
            value={toGroupId}
            onChange={(e) => setToGroupId(e.target.value)}
            className="border border-surface-200 rounded px-2 py-1.5 text-sm"
          >
            <option value="">Select destination...</option>
            {destinationOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={loadPreview}
          disabled={loading}
          className="btn-primary btn flex items-center gap-1.5"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : null}
          {loading ? 'Loading...' : 'Preview Promotion'}
        </button>
      </div>

      {error && (
        <div className="card p-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border-red-100">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {confirmed && (
        <div className="card p-5 flex items-center gap-2 text-green-700 bg-green-50 border-green-100">
          <CheckCircle2 size={18} />
          <span className="text-sm font-medium">
            Promotion complete — {confirmed.promoted} promoted, {confirmed.repeated} held back.
          </span>
        </div>
      )}

      {recommendations && recommendations.length > 0 && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-sm text-ink">Promotion Preview</h2>
            <div className="flex items-center gap-3 text-xs text-ink-muted">
              <span>{recommendations.filter((r) => overrides[r.learnerId] === 'promote').length} promote</span>
              <span>{recommendations.filter((r) => overrides[r.learnerId] === 'repeat').length} repeat</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Student</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Average</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Failed</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Attendance</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Reason</th>
                  <th className="text-center px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Decision</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.map((r) => (
                  <tr key={r.learnerId} className="border-b border-surface-100">
                    <td className="px-4 py-2 font-medium text-ink">
                      {r.name}
                      {r.admissionNumber && <span className="text-xs text-ink-faint ml-2 font-mono">{r.admissionNumber}</span>}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">{r.average}%</td>
                    <td className="px-4 py-2 text-right font-mono">{r.failedSubjects}</td>
                    <td className="px-4 py-2 text-right font-mono">{r.attendanceRate ?? '—'}%</td>
                    <td className="px-4 py-2 text-ink-muted text-xs">{r.reason}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => toggleOverride(r.learnerId, 'promote')}
                          className={`btn-sm btn ${
                            overrides[r.learnerId] === 'promote' ? 'bg-green-100 text-green-700' : 'btn-secondary'
                          }`}
                        >
                          Promote
                        </button>
                        <button
                          onClick={() => toggleOverride(r.learnerId, 'repeat')}
                          className={`btn-sm btn ${
                            overrides[r.learnerId] === 'repeat' ? 'bg-amber-100 text-amber-700' : 'btn-secondary'
                          }`}
                        >
                          Repeat
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-4 border-t border-surface-100 flex justify-end">
            <button
              onClick={confirmPromotion}
              disabled={confirming || !toGroupId}
              className="btn-primary btn"
            >
              {confirming ? 'Confirming...' : 'Confirm Promotion'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
