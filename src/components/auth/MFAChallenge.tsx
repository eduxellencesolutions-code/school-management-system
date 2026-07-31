'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function MFAChallenge({
  factorId,
  onVerified,
}: {
  factorId: string
  onVerified: () => void
}) {
  const supabase = createClient()
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function verify() {
    if (code.length !== 6) return
    setSubmitting(true)
    try {
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId })
      if (challengeError) throw challengeError

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      })
      if (verifyError) throw verifyError

      onVerified()
    } catch (err: any) {
      toast.error(err.message ?? 'Invalid code. Try again.')
      setCode('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card p-8 max-w-md mx-auto flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-ink mb-1">Enter your 2FA code</h2>
        <p className="text-sm text-ink-muted">
          Open your authenticator app and enter the 6-digit code.
        </p>
      </div>
      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        placeholder="6-digit code"
        autoFocus
        className="input text-center tracking-widest text-lg"
        value={code}
        onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
        onKeyDown={e => e.key === 'Enter' && verify()}
      />
      <button
        className="btn-primary btn"
        onClick={verify}
        disabled={submitting || code.length !== 6}
      >
        {submitting ? 'Verifying…' : 'Verify'}
      </button>
    </div>
  )
}