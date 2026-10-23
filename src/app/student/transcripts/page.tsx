// FILE: src/app/student/transcripts/page.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { downloadOfficialTranscript } from '@/lib/results/transcriptFiles'
import type { OfficialIssue } from '@/lib/results/officialTranscriptPdf'

interface Req {
  id: string
  status: string
  purpose: string
  recipient: string | null
  created_at: string
  rejection_reason: string | null
  issue: { id: string; reference: string; issued_at: string; status: string; student_may_download: boolean } | null
}

const STATUS: Record<string, string> = {
  requested: 'Waiting for the registry',
  verified: 'Verified, waiting for approval',
  issued: 'Issued',
  rejected: 'Not approved',
  cancelled: 'Cancelled',
}

export default function StudentTranscriptsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [reqs, setReqs] = useState<Req[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [purpose, setPurpose] = useState('')
  const [recipient, setRecipient] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: e } = await supabase.rpc('get_my_transcript_requests')
    if (e) setError(e.message)
    else { setError(null); setReqs((data ?? []) as Req[]) }
    setLoading(false)
  }, [supabase])

  useEffect(() => { void load() }, [load])

  async function submit() {
    setBusy('new')
    const { error: e } = await supabase.rpc('request_tertiary_transcript', { p_purpose: purpose, p_recipient: recipient.trim() || null })
    setBusy(null)
    if (e) { toast.error(e.message); return }
    toast.success('Your request has been sent to the registry')
    setPurpose('')
    setRecipient('')
    await load()
  }

  async function cancel(id: string) {
    setBusy(id)
    const { error: e } = await supabase.rpc('cancel_tertiary_transcript_request', { p_request_id: id })
    setBusy(null)
    if (e) toast.error(e.message)
    else { toast.success('Request cancelled'); await load() }
  }

  async function download(issueId: string) {
    setBusy(issueId)
    try {
      const { data, error: e } = await supabase.rpc('get_tertiary_transcript_issue', { p_issue_id: issueId })
      if (e) throw e
      await downloadOfficialTranscript(data as OfficialIssue)
    } catch (e) {
      toast.error((e as { message?: string }).message ?? 'The transcript could not be opened')
    } finally {
      setBusy(null)
    }
  }

  if (loading) return <div className="p-6 text-sm text-ink-muted flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</div>
  const open = reqs.some(r => r.status === 'requested' || r.status === 'verified')

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="page-title mb-1">Official transcripts</h1>
        <p className="page-subtitle">An official transcript is issued by your institution&apos;s registry after it checks your record. It is not the same as the unofficial statement on your results page.</p>
      </div>
      {error && <div className="card p-4"><p className="text-sm text-red-600">{error}</p></div>}

      <div className="card">
        <div className="card-header"><h2 className="font-semibold text-sm text-ink">Request a transcript</h2></div>
        <div className="card-body space-y-3">
          <label className="block text-sm"><span className="text-ink-muted">Purpose</span>
            <input className="input mt-1" maxLength={300} value={purpose} onChange={e => setPurpose(e.target.value)} disabled={open} />
          </label>
          <label className="block text-sm"><span className="text-ink-muted">Recipient (optional)</span>
            <input className="input mt-1" maxLength={300} value={recipient} onChange={e => setRecipient(e.target.value)} disabled={open} />
          </label>
          {open && <p className="text-xs text-ink-muted">You already have an open request. Wait for it to be processed or cancel it.</p>}
          <button className="btn-primary btn btn-sm" disabled={open || !purpose.trim() || busy === 'new'} onClick={() => void submit()}>Send request</button>
        </div>
      </div>

      <div className="space-y-3">
        {reqs.map(r => (
          <div key={r.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-ink">{r.purpose}</p>
                <p className="text-xs text-ink-muted">{r.recipient ? `For ${r.recipient} · ` : ''}Requested {new Date(r.created_at).toLocaleDateString('en-NG')}</p>
              </div>
              <span className="badge-gray">{STATUS[r.status] ?? r.status}</span>
            </div>
            {r.rejection_reason && <p className="text-sm text-ink-muted mt-2">Reason given: {r.rejection_reason}</p>}
            {r.issue && (
              <div className="mt-2 text-sm">
                <p className="text-ink">Reference <b className="font-mono">{r.issue.reference}</b> · issued {new Date(r.issue.issued_at).toLocaleDateString('en-NG')}{r.issue.status !== 'valid' ? ' · withdrawn' : ''}</p>
                <p className="text-xs text-ink-muted">The registry gives you the verification code that goes with this reference.</p>
                {r.issue.student_may_download && r.issue.status === 'valid'
                  ? <button className="btn-secondary btn btn-sm mt-2" disabled={busy === r.issue.id} onClick={() => void download(r.issue!.id)}>Download official copy</button>
                  : <p className="text-xs text-ink-muted mt-1">The registry will send this transcript directly or give you a copy.</p>}
              </div>
            )}
            {(r.status === 'requested' || r.status === 'verified') && (
              <button className="btn-ghost btn btn-sm mt-2" disabled={busy === r.id} onClick={() => void cancel(r.id)}>Cancel request</button>
            )}
          </div>
        ))}
        {reqs.length === 0 && <p className="text-sm text-ink-muted">No requests yet.</p>}
      </div>
    </div>
  )
}