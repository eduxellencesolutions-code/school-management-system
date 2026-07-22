'use client'

import { useState, useEffect } from 'react'
import { Loader2, CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react'

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

interface HistoryEntry {
  id: string
  learner_id: string
  status: string
  average: number | null
  promoted_to_class_id: string | null
  corrected_by: string | null
  corrected_at: string | null
  correction_note: string | null
  created_at: string
  learner: { id: string; first_name: string; last_name: string; admission_number: string | null } | null
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

  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [correctingId, setCorrectingId] = useState<string | null>(null)
  const [correctionTarget, setCorrectionTarget] = useState<Record<string, string>>({}) // learnerId -> destination class for correction

  async function loadHistory() {
    setLoadingHistory(true)
    const res = await fetch(`/api/promotion/history?groupId=${fromGroupId}`)
    const data = await res.json()
    if (data.history) setHistory(data.history)
    setLoadingHistory(false)
  }

  useEffect(() => {
    if (fromGroupId) loadHistory()
  }, [fromGroupId])

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
      body: JSON.stringify({ fromGroupId, toGroupId, sessionId, reportId, decisions }),
    })

    const data = await res.json()
    if (data.success) {
      setConfirmed(data.result)
      setRecommendations(null)
      loadHistory()
    } else {
      setError(data.error ?? 'Failed to confirm promotion.')
    }
    setConfirming(false)
  }

  async function correctDecision(learnerId: string, newStatus: 'promoted' | 'repeated') {
    setCorrectingId(learnerId)
    setError(null)

    const targetClass = newStatus === 'promoted' ? correctionTarget[learnerId] : null

    if (newStatus === 'promoted' && !targetClass) {
      setError('Please select a destination class before correcting to promoted.')
      setCorrectingId(null)
      return
    }

    const res = await fetch('/api/promotion/correct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        learnerId,
        newStatus,
        toGroupId: targetClass,
        note: `Corrected via Promotion Center by admin`,
      }),
    })

    const data = await res.json()
    if (data.success) {
      loadHistory()
    } else {
      setError(data.error ?? 'Failed to correct decision.')
    }
    setCorrectingId(null)
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

        <button onClick={loadPreview} disabled={loading} className="btn-primary btn flex items-center gap-1.5">
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
                          className={`btn-sm btn ${overrides[r.learnerId] === 'promote' ? 'bg-green-100 text-green-700' : 'btn-secondary'}`}
                        >
                          Promote
                        </button>
                        <button
                          onClick={() => toggleOverride(r.learnerId, 'repeat')}
                          className={`btn-sm btn ${overrides[r.learnerId] === 'repeat' ? 'bg-amber-100 text-amber-700' : 'btn-secondary'}`}
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
            <button onClick={confirmPromotion} disabled={confirming || !toGroupId} className="btn-primary btn">
              {confirming ? 'Confirming...' : 'Confirm Promotion'}
            </button>
          </div>
        </div>
      )}

      {/* Recent Decisions panel — always visible once a class is selected, independent of preview */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="font-semibold text-sm text-ink">Recent Decisions</h2>
          <button onClick={loadHistory} className="text-xs text-brand-500 hover:underline">Refresh</button>
        </div>

        {loadingHistory ? (
          <div className="p-8 text-center text-sm text-ink-muted flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Loading history...
          </div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-muted">No promotion decisions recorded for this class yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Student</th>
                  <th className="text-center px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Average</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Corrected</th>
                  <th className="text-center px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Correct Decision</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-surface-100">
                    <td className="px-4 py-2 font-medium text-ink">
                      {h.learner ? `${h.learner.last_name} ${h.learner.first_name}` : h.learner_id}
                      {h.learner?.admission_number && (
                        <span className="text-xs text-ink-faint ml-2 font-mono">{h.learner.admission_number}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`badge text-[10px] ${h.status === 'promoted' ? 'badge-green' : 'badge-amber'}`}>
                        {h.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono">{h.average ?? '—'}%</td>
                    <td className="px-4 py-2 text-xs text-ink-faint">
                      {h.corrected_at ? `Corrected ${new Date(h.corrected_at).toLocaleDateString('en-NG')}` : '—'}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-center gap-1.5">
                        {h.status === 'repeated' && (
                          <>
                            <select
                              value={correctionTarget[h.learner_id] ?? ''}
                              onChange={(e) =>
                                setCorrectionTarget((prev) => ({ ...prev, [h.learner_id]: e.target.value }))
                              }
                              className="border border-surface-200 rounded px-1.5 py-1 text-xs"
                            >
                              <option value="">To class...</option>
                              {classes.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => correctDecision(h.learner_id, 'promoted')}
                              disabled={correctingId === h.learner_id}
                              className="btn-sm btn btn-secondary flex items-center gap-1"
                              title="Correct to Promoted"
                            >
                              <RotateCcw size={12} /> Promote instead
                            </button>
                          </>
                        )}
                        {h.status === 'promoted' && (
                          <button
                            onClick={() => correctDecision(h.learner_id, 'repeated')}
                            disabled={correctingId === h.learner_id}
                            className="btn-sm btn btn-secondary flex items-center gap-1"
                            title="Correct to Repeated"
                          >
                            <RotateCcw size={12} /> Repeat instead
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
