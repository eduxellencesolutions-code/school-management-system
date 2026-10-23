// FILE: src/app/verify/page.tsx
'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Result {
  valid: boolean
  message: string
  status?: string
  institution?: string
  student_name?: string
  programme?: string
  issued_at?: string
  reference?: string
  document_hash?: string
}

function VerifyInner() {
  const params = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const [reference, setReference] = useState('')
  const [code, setCode] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)
  const auto = useRef(false)

  const check = useCallback(async (r: string, c: string) => {
    setBusy(true)
    setResult(null)
    const { data, error } = await supabase.rpc('verify_tertiary_transcript', { p_reference: r, p_code: c })
    setBusy(false)
    setResult(error ? { valid: false, message: 'The check could not be completed. Please try again.' } : (data as Result))
  }, [supabase])

  useEffect(() => {
    if (auto.current) return
    auto.current = true
    const r = params.get('ref') ?? ''
    const c = params.get('code') ?? ''
    if (r) setReference(r)
    if (c) setCode(c)
    if (r || c) window.history.replaceState(null, '', '/verify')
    if (r && c) void check(r, c)
  }, [params, check])

  const good = result?.valid && result.status === 'valid'
  const withdrawn = result?.valid && result.status !== 'valid'

  return (
    <div className="min-h-screen bg-surface-50 px-4 py-10">
      <div className="max-w-lg mx-auto">
        <h1 className="page-title mb-1">Verify an official transcript</h1>
        <p className="page-subtitle mb-5">Enter the reference printed on the transcript and its verification code, or scan the code on the document.</p>

        <form className="card p-5 space-y-3" onSubmit={e => { e.preventDefault(); void check(reference, code) }}>
          <label className="block text-sm"><span className="text-ink-muted">Reference</span>
            <input className="input mt-1 font-mono" value={reference} onChange={e => setReference(e.target.value)} placeholder="TR-2026-XXXXXXXX" autoComplete="off" />
          </label>
          <label className="block text-sm"><span className="text-ink-muted">Verification code</span>
            <input className="input mt-1 font-mono" value={code} onChange={e => setCode(e.target.value)} autoComplete="off" />
          </label>
          <button type="submit" className="btn-primary btn" disabled={busy || !reference.trim() || !code.trim()}>{busy ? 'Checking…' : 'Verify'}</button>
        </form>

        {result && (
          <div role="status" className={`card p-5 mt-5 ${good ? 'border-green-300 bg-green-50' : withdrawn ? 'border-amber-300 bg-amber-50' : 'border-red-300 bg-red-50'}`}>
            <p className="font-semibold text-ink">{good ? 'Authentic' : withdrawn ? 'Withdrawn by the institution' : 'Not recognised'}</p>
            <p className="text-sm text-ink mt-1">{result.message}</p>
            {result.valid && (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-3">
                <dt className="text-ink-muted">Institution</dt><dd>{result.institution}</dd>
                <dt className="text-ink-muted">Student</dt><dd>{result.student_name}</dd>
                <dt className="text-ink-muted">Programme</dt><dd>{result.programme}</dd>
                <dt className="text-ink-muted">Issued</dt><dd>{result.issued_at ? new Date(result.issued_at).toLocaleDateString('en-NG') : ''}</dd>
                <dt className="text-ink-muted">Fingerprint</dt><dd className="font-mono text-xs break-all">{result.document_hash}</dd>
              </dl>
            )}
            {result.valid && <p className="text-xs text-ink-muted mt-3">The fingerprint should match the one printed on the transcript.</p>}
          </div>
        )}
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  )
}