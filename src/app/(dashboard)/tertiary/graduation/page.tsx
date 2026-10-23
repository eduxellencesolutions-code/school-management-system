// FILE: src/app/(dashboard)/tertiary/graduation/page.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Row {
  learner_id: string
  first_name: string
  last_name: string
  admission_number: string
  programme_name: string
  current_level: string | null
  cgpa: number | null
  credits_earned: number | null
  credits_required: number | null
  pending_courses: number | null
  outcomes_not_configured: number | null
  approved_at: string | null
  final_cgpa: number | null
  classification: string | null
  blockers: string[]
}
interface Session { id: string; name: string }

export default function GraduationPage() {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<Row[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [mode, setMode] = useState<'approve' | 'revoke' | null>(null)
  const [sessionId, setSessionId] = useState('')
  const [classification, setClassification] = useState('')
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [ov, ses] = await Promise.all([
      supabase.rpc('get_tertiary_graduation_overview', { p_search: search.trim() || null, p_limit: 100 }),
      supabase.from('academic_sessions').select('id, name, start_date').order('start_date', { ascending: false, nullsFirst: false }),
    ])
    if (ov.error) {
      setError(ov.error.message)
      setLoading(false)
      return
    }
    setRows(((ov.data as { students?: Row[] } | null)?.students ?? []) as Row[])
    setSessions(((ses.data ?? []) as Session[]))
    setLoading(false)
  }, [supabase, search])

  useEffect(() => {
    void load()
  }, [load])

  function open(row: Row, m: 'approve' | 'revoke') {
    setOpenId(row.learner_id)
    setMode(m)
    setSessionId('')
    setClassification('')
    setReason('')
    setConfirmed(false)
  }
  function close() {
    setOpenId(null)
    setMode(null)
  }

  async function submit(row: Row) {
    setBusy(true)
    const result = mode === 'approve'
      ? await supabase.rpc('approve_tertiary_graduation', {
          p_learner_id: row.learner_id, p_graduation_session_id: sessionId,
          p_classification: classification.trim() || null, p_override_reason: reason.trim() || null,
        })
      : await supabase.rpc('revoke_tertiary_graduation', { p_learner_id: row.learner_id, p_reason: reason.trim() })
    setBusy(false)
    if (result.error) {
      toast.error(result.error.message)
      return
    }
    toast.success(mode === 'approve' ? 'Graduation approval recorded' : 'Graduation approval revoked')
    close()
    await load()
  }

  if (error) {
    return (
      <div className="card p-6 max-w-2xl">
        <h1 className="page-title mb-2">Graduation approval</h1>
        <p className="text-sm text-red-600">{error}</p>
        <p className="text-xs text-ink-muted mt-2">This page is for institution administrators and people with Senate approval authority.</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl">
      <h1 className="page-title mb-1">Graduation approval</h1>
      <p className="page-subtitle mb-4">
        Approving records programme completion, and the student&apos;s Final view then shows it. The system never calculates a classification: type exactly what Senate awarded.
      </p>

      <div className="flex gap-2 mb-4">
        <input className="input max-w-xs" placeholder="Search name or matric number" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search students" />
        <button className="btn-secondary btn btn-sm" onClick={() => void load()}>Search</button>
      </div>

      {loading ? (
        <div className="text-sm text-ink-muted flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</div>
      ) : rows.length === 0 ? (
        <div className="card p-6"><p className="text-sm text-ink-muted">No students found.</p></div>
      ) : (
        <div className="space-y-3">
          {rows.map(r => {
            const isOpen = openId === r.learner_id
            return (
              <div key={r.learner_id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{r.last_name} {r.first_name} <span className="text-xs text-ink-muted font-normal">{r.admission_number}</span></p>
                    <p className="text-sm text-ink-muted">{r.programme_name}{r.current_level ? ` · Level ${r.current_level}` : ''}</p>
                    <p className="text-sm text-ink mt-1">
                      CGPA {r.cgpa !== null && r.cgpa !== undefined ? Number(r.cgpa).toFixed(2) : '—'}
                      {' · '}credits {r.credits_earned ?? '—'}{r.credits_required ? ` of ${r.credits_required}` : ''}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    {r.approved_at ? (
                      <>
                        <span className="badge-green">Approved {new Date(r.approved_at).toLocaleDateString('en-NG')}</span>
                        <p className="text-xs text-ink-muted mt-1">Final CGPA {r.final_cgpa !== null ? Number(r.final_cgpa).toFixed(2) : '—'}{r.classification ? ` · ${r.classification}` : ''}</p>
                      </>
                    ) : (
                      <span className="badge-gray">Not approved</span>
                    )}
                    <div className="flex gap-2 justify-end mt-2">
                      <Link href={`/tertiary/students/${r.learner_id}/results`} className="btn-ghost btn btn-sm">View as student</Link>
                      <Link href={`/tertiary/students/${r.learner_id}/attempts`} className="btn-ghost btn btn-sm">Attempts</Link>
                      {r.approved_at
                        ? <button className="btn-secondary btn btn-sm" onClick={() => open(r, 'revoke')}>Revoke</button>
                        : <button className="btn-primary btn btn-sm" onClick={() => open(r, 'approve')}>Review &amp; approve</button>}
                    </div>
                  </div>
                </div>

                {isOpen && mode === 'approve' && (
                  <div className="mt-4 border-t border-surface-200 pt-4 space-y-3">
                    {r.blockers.length > 0 ? (
                      <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                        <p className="font-medium">Things to resolve or explain before approving:</p>
                        <ul className="list-disc pl-5 mt-1">{r.blockers.map((b, i) => <li key={i}>{b}</li>)}</ul>
                        <p className="mt-1">You can approve anyway with a written reason. The reason and these items are recorded permanently.</p>
                      </div>
                    ) : (
                      <p className="text-sm text-green-800">No outstanding items were found in the published results.</p>
                    )}
                    <label className="block text-sm">
                      <span className="text-ink-muted">Graduation session (required)</span>
                      <select className="input mt-1" value={sessionId} onChange={e => setSessionId(e.target.value)}>
                        <option value="">Choose…</option>
                        {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </label>
                    <label className="block text-sm">
                      <span className="text-ink-muted">Classification as awarded (optional, typed exactly)</span>
                      <input className="input mt-1" maxLength={120} value={classification} onChange={e => setClassification(e.target.value)} />
                    </label>
                    {r.blockers.length > 0 && (
                      <label className="block text-sm">
                        <span className="text-ink-muted">Reason for approving despite the items above (required)</span>
                        <textarea className="input mt-1" rows={3} value={reason} onChange={e => setReason(e.target.value)} />
                      </label>
                    )}
                    <label className="flex items-start gap-2 text-sm">
                      <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
                      <span>I confirm this approval is authorised under my institution&apos;s regulations.</span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        className="btn-primary btn btn-sm"
                        disabled={busy || !confirmed || !sessionId || (r.blockers.length > 0 && !reason.trim())}
                        onClick={() => void submit(r)}
                      >
                        {busy ? 'Saving…' : 'Approve graduation'}
                      </button>
                      <button className="btn-ghost btn btn-sm" onClick={close}>Cancel</button>
                    </div>
                  </div>
                )}

                {isOpen && mode === 'revoke' && (
                  <div className="mt-4 border-t border-surface-200 pt-4 space-y-3">
                    <p className="text-sm text-ink-muted">Revoking clears the recorded approval, and the student&apos;s Final view returns to showing progress. The earlier approval stays in the audit trail.</p>
                    <label className="block text-sm">
                      <span className="text-ink-muted">Reason (required)</span>
                      <textarea className="input mt-1" rows={3} value={reason} onChange={e => setReason(e.target.value)} />
                    </label>
                    <div className="flex gap-2">
                      <button className="btn-danger btn btn-sm" disabled={busy || !reason.trim()} onClick={() => void submit(r)}>{busy ? 'Saving…' : 'Revoke approval'}</button>
                      <button className="btn-ghost btn btn-sm" onClick={close}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}