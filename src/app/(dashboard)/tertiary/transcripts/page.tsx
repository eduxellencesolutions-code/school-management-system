// FILE: src/app/(dashboard)/tertiary/transcripts/page.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { downloadOfficialTranscript } from '@/lib/results/transcriptFiles'
import type { OfficialIssue } from '@/lib/results/officialTranscriptPdf'

interface ReqRow {
  id: string; status: string; purpose: string; recipient: string | null; created_at: string
  learner_id: string; student_name: string; admission_number: string
  verified_at: string | null; verification_notes: string | null; issue_id: string | null
}
interface IssueRow { id: string; reference: string; issued_at: string; status: string; student_may_download: boolean; student_name: string; admission_number: string }
type Act = { id: string; kind: 'verify' | 'reject' | 'issue' | 'revoke' } | null

const STATUS: Record<string, string> = {
  requested: 'Awaiting verification', verified: 'Verified, awaiting approval', issued: 'Issued', rejected: 'Rejected', cancelled: 'Cancelled',
}
const msg = (e: unknown): string => (e as { message?: string }).message ?? 'Something went wrong'

export default function TranscriptRegistryPage() {
  const supabase = useMemo(() => createClient(), [])
  const [tab, setTab] = useState<'requests' | 'issued'>('requests')
  const [reqs, setReqs] = useState<ReqRow[]>([])
  const [issues, setIssues] = useState<IssueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [act, setAct] = useState<Act>(null)
  const [text, setText] = useState('')
  const [allow, setAllow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [justIssued, setJustIssued] = useState<{ issueId: string; reference: string; code: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [a, b] = await Promise.all([
      supabase.rpc('list_tertiary_transcript_requests', { p_status: null }),
      supabase.rpc('list_tertiary_transcript_issues'),
    ])
    if (a.error) { setError(a.error.message); setLoading(false); return }
    setError(null)
    setReqs((a.data ?? []) as ReqRow[])
    setIssues((b.data ?? []) as IssueRow[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { void load() }, [load])

  function start(id: string, kind: 'verify' | 'reject' | 'issue' | 'revoke') {
    setAct({ id, kind })
    setText('')
    setAllow(false)
  }

  async function run() {
    if (!act) return
    setBusy(true)
    try {
      if (act.kind === 'verify') {
        const { data, error: e } = await supabase.rpc('verify_tertiary_transcript_request', { p_request_id: act.id, p_notes: text })
        if (e) throw e
        const d = data as { outcomes_not_configured: number; pending_courses: number }
        toast.success(`Verified. ${d.pending_courses} pending course(s); ${d.outcomes_not_configured} result(s) without a configured outcome.`)
      } else if (act.kind === 'reject') {
        const { error: e } = await supabase.rpc('reject_tertiary_transcript_request', { p_request_id: act.id, p_reason: text })
        if (e) throw e
        toast.success('Request rejected')
      } else if (act.kind === 'issue') {
        const { data, error: e } = await supabase.rpc('issue_tertiary_transcript', { p_request_id: act.id, p_override_reason: text.trim() || null, p_student_may_download: allow })
        if (e) throw e
        const d = data as { issue_id: string; reference: string; verification_code: string }
        setJustIssued({ issueId: d.issue_id, reference: d.reference, code: d.verification_code })
        toast.success('Transcript issued')
      } else {
        const { error: e } = await supabase.rpc('revoke_tertiary_transcript', { p_issue_id: act.id, p_reason: text })
        if (e) throw e
        toast.success('Transcript revoked')
      }
      setAct(null)
      await load()
    } catch (e) {
      toast.error(msg(e))
    } finally {
      setBusy(false)
    }
  }

  async function download(issueId: string, code?: string) {
    try {
      const { data, error: e } = await supabase.rpc('get_tertiary_transcript_issue', { p_issue_id: issueId })
      if (e) throw e
      await downloadOfficialTranscript(data as OfficialIssue, code)
    } catch (e) {
      toast.error(msg(e))
    }
  }

  if (loading) return <div className="p-6 text-sm text-ink-muted flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</div>
  if (error) return <div className="card p-6 max-w-2xl"><h1 className="page-title mb-2">Official transcripts</h1><p className="text-sm text-red-600">{error}</p></div>

  const panel = (id: string, kind: 'verify' | 'reject' | 'issue' | 'revoke') =>
    act && act.id === id && act.kind === kind ? (
      <div className="mt-3 border-t border-surface-200 pt-3 space-y-2">
        <label className="block text-sm">
          <span className="text-ink-muted">
            {kind === 'verify' ? 'What did you check in the academic record? (required)'
              : kind === 'issue' ? 'Override reason (only needed if some results have no configured outcome)'
              : 'Reason (required)'}
          </span>
          <textarea className="input mt-1" rows={2} value={text} onChange={e => setText(e.target.value)} />
        </label>
        {kind === 'issue' && (
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={allow} onChange={e => setAllow(e.target.checked)} /> Allow the student to download this copy</label>
        )}
        <div className="flex gap-2">
          <button className={kind === 'reject' || kind === 'revoke' ? 'btn-danger btn btn-sm' : 'btn-primary btn btn-sm'} disabled={busy} onClick={() => void run()}>
            {busy ? 'Saving…' : kind === 'verify' ? 'Record verification' : kind === 'issue' ? 'Issue transcript' : kind === 'reject' ? 'Reject request' : 'Revoke transcript'}
          </button>
          <button className="btn-ghost btn btn-sm" onClick={() => setAct(null)}>Cancel</button>
        </div>
      </div>
    ) : null

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h1 className="page-title mb-1">Official transcripts</h1>
        <p className="page-subtitle">The registry verifies each request against the published record. A different person with Senate authority (or an administrator) then issues it. An issued transcript is a frozen copy and can only be revoked.</p>
      </div>

      {justIssued && (
        <div className="card p-4 border-green-300 bg-green-50 space-y-2" role="status">
          <p className="font-medium text-green-900">Issued. Record the verification code now: it is shown only once.</p>
          <p className="text-sm text-green-900">Reference <b className="font-mono">{justIssued.reference}</b> · Code <b className="font-mono">{justIssued.code}</b></p>
          <div className="flex gap-2">
            <button className="btn-primary btn btn-sm" onClick={() => void download(justIssued.issueId, justIssued.code)}>Download transcript with verification QR</button>
            <button className="btn-ghost btn btn-sm" onClick={() => setJustIssued(null)}>I have recorded the code</button>
          </div>
        </div>
      )}

      <div className="flex gap-2" role="tablist">
        <button role="tab" aria-selected={tab === 'requests'} className={tab === 'requests' ? 'btn-primary btn btn-sm' : 'btn-secondary btn btn-sm'} onClick={() => setTab('requests')}>Requests</button>
        <button role="tab" aria-selected={tab === 'issued'} className={tab === 'issued' ? 'btn-primary btn btn-sm' : 'btn-secondary btn btn-sm'} onClick={() => setTab('issued')}>Issued</button>
      </div>

      {tab === 'requests' && (
        <div className="space-y-3">
          {reqs.map(r => (
            <div key={r.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">{r.student_name} <span className="text-xs text-ink-muted font-normal">{r.admission_number}</span></p>
                  <p className="text-sm text-ink-muted">{r.purpose}{r.recipient ? ` · for ${r.recipient}` : ''}</p>
                  {r.verification_notes && <p className="text-xs text-ink-muted mt-1">Verification: {r.verification_notes}</p>}
                </div>
                <span className="badge-gray">{STATUS[r.status] ?? r.status}</span>
              </div>
              {(r.status === 'requested' || r.status === 'verified') && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {r.status === 'requested' && <button className="btn-secondary btn btn-sm" onClick={() => start(r.id, 'verify')}>Verify record</button>}
                  {r.status === 'verified' && <button className="btn-primary btn btn-sm" onClick={() => start(r.id, 'issue')}>Issue</button>}
                  <button className="btn-ghost btn btn-sm" onClick={() => start(r.id, 'reject')}>Reject</button>
                </div>
              )}
              {panel(r.id, 'verify')}
              {panel(r.id, 'issue')}
              {panel(r.id, 'reject')}
            </div>
          ))}
          {reqs.length === 0 && <p className="text-sm text-ink-muted">No requests.</p>}
        </div>
      )}

      {tab === 'issued' && (
        <div className="space-y-3">
          {issues.map(i => (
            <div key={i.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">{i.student_name} <span className="text-xs text-ink-muted font-normal">{i.admission_number}</span></p>
                  <p className="text-sm text-ink-muted"><span className="font-mono">{i.reference}</span> · issued {new Date(i.issued_at).toLocaleDateString('en-NG')}</p>
                </div>
                <span className={i.status === 'valid' ? 'badge-green' : 'badge-gray'}>{i.status === 'valid' ? 'Valid' : 'Revoked'}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="btn-secondary btn btn-sm" onClick={() => void download(i.id)}>Download copy</button>
                {i.status === 'valid' && <button className="btn-ghost btn btn-sm" onClick={() => start(i.id, 'revoke')}>Revoke</button>}
              </div>
              {panel(i.id, 'revoke')}
            </div>
          ))}
          {issues.length === 0 && <p className="text-sm text-ink-muted">Nothing issued yet.</p>}
        </div>
      )}
    </div>
  )
}