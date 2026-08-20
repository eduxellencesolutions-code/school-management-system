'use client'
import { useState } from 'react'
import { CalendarClock } from 'lucide-react'

type Term = {
  id: string; name: string; session_id: string; status: string; is_active: boolean
  closed_at: string | null; closed_reason: string | null
}
type Session = { id: string; name: string; status: string; is_active: boolean }

export default function AcademicPeriodOversight({
  orgId,
  sessions,
  terms,
  canOverride,
}: {
  orgId: string;
  sessions: Session[];
  terms: Term[];
  canOverride: boolean;
}) {
  const [reasonByTerm, setReasonByTerm] = useState<Record<string, string>>({})
  const [busyTermId, setBusyTermId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function reopen(termId: string) {
    const reason = reasonByTerm[termId]?.trim()
    if (!reason) {
      setError('A reason is required to reopen a term.')
      return
    }
    setBusyTermId(termId)
    setError(null)
    const res = await fetch(`/api/platform-staff/schools/${orgId}/reopen-term`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ termId, reason }),
    })
    const json = await res.json()
    if (json.error) setError(json.error)
    else window.location.reload()
    setBusyTermId(null)
  }

  const statusStyle: Record<string, string> = {
    upcoming: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    closing: 'bg-amber-100 text-amber-700',
    closed: 'bg-gray-100 text-gray-700',
    archived: 'bg-gray-100 text-gray-500',
  }

  if (sessions.length === 0) {
    return (
      <div className="card p-5">
        <h2 className="font-semibold text-sm text-ink mb-3 flex items-center gap-2">
          <CalendarClock size={16} className="text-ink-muted" /> Academic Periods
        </h2>
        <p className="text-xs text-ink-faint">No academic sessions found for this school.</p>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-sm text-ink mb-3 flex items-center gap-2">
        <CalendarClock size={16} className="text-ink-muted" /> Academic Periods
      </h2>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <div className="flex flex-col gap-3">
        {sessions.map(session => (
          <div key={session.id} className="border border-surface-100 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-ink">{session.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[session.status] ?? statusStyle.active}`}>
                {session.status}
              </span>
            </div>
            <div className="flex flex-col gap-1.5 pl-3 border-l border-surface-100">
              {terms.filter(t => t.session_id === session.id).map(term => (
                <div key={term.id} className="flex items-center justify-between text-xs gap-2">
                  <span className="text-ink-muted">{term.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded-full font-medium ${statusStyle[term.status] ?? statusStyle.active}`}>
                      {term.status}
                    </span>
                    {term.status === 'closed' && canOverride && (
                      <>
                        <input
                          type="text" placeholder="Reason to reopen…"
                          value={reasonByTerm[term.id] ?? ''}
                          onChange={e => setReasonByTerm(prev => ({ ...prev, [term.id]: e.target.value }))}
                          className="border border-surface-200 rounded px-1.5 py-0.5 text-xs w-40"
                        />
                        <button
                          onClick={() => reopen(term.id)}
                          disabled={busyTermId === term.id}
                          className="text-blue-600 hover:underline disabled:opacity-50"
                        >
                          {busyTermId === term.id ? 'Reopening…' : 'Reopen'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {terms.filter(t => t.session_id === session.id).length === 0 && (
                <p className="text-xs text-ink-faint">No terms in this session.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}