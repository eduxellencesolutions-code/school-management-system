'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Loader2, ShieldCheck } from 'lucide-react'

type EnrollState = 'loading' | 'idle' | 'enrolling' | 'verifying' | 'enrolled'

export default function MFAEnrollment() {
  const supabase = createClient()
  const [state, setState] = useState<EnrollState>('loading')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Check on load whether this user already has a verified TOTP factor.
  useEffect(() => {
    checkExistingFactors()
  }, [])

  async function checkExistingFactors() {
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) {
      toast.error('Could not check 2FA status: ' + error.message)
      setState('idle')
      return
    }
    const verifiedTotp = data.totp.find(f => f.status === 'verified')
    setState(verifiedTotp ? 'enrolled' : 'idle')
  }

  async function startEnrollment() {
    setState('enrolling')
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    if (error) {
      toast.error(error.message)
      setState('idle')
      return
    }
    setFactorId(data.id)
    setQrCode(data.totp.qr_code)
    setSecret(data.totp.secret)
    setState('verifying')
  }

  async function confirmEnrollment() {
    if (!factorId || code.length !== 6) return
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

      toast.success('Two-factor authentication enabled')
      setState('enrolled')
      setCode('')
    } catch (err: any) {
      toast.error(err.message ?? 'Verification failed. Check the code and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function cancelEnrollment() {
    if (factorId) {
      await supabase.auth.mfa.unenroll({ factorId })
    }
    setFactorId(null)
    setQrCode(null)
    setSecret(null)
    setCode('')
    setState('idle')
  }

  if (state === 'loading') {
    return (
      <div className="card p-6 flex justify-center">
        <Loader2 className="animate-spin" size={20} />
      </div>
    )
  }

  if (state === 'enrolled') {
    return (
      <div className="card p-6 flex items-center gap-3">
        <ShieldCheck className="text-green-600" size={20} />
        <div>
          <p className="font-medium text-ink">Two-factor authentication is enabled</p>
          <p className="text-sm text-ink-muted">
            Your account requires an authenticator code at login.
          </p>
        </div>
      </div>
    )
  }

  if (state === 'idle') {
    return (
      <div className="card p-6">
        <h3 className="font-semibold text-ink mb-1">Two-factor authentication</h3>
        <p className="text-sm text-ink-muted mb-4">
          Super admin accounts should have 2FA enabled. You'll need an authenticator
          app (Google Authenticator, Authy, 1Password, etc).
        </p>
        <button className="btn-primary btn" onClick={startEnrollment}>
          Set up 2FA
        </button>
      </div>
    )
  }

  if (state === 'enrolling') {
    return (
      <div className="card p-6 flex justify-center">
        <Loader2 className="animate-spin" size={20} />
      </div>
    )
  }

  // state === 'verifying'
  return (
    <div className="card p-6 flex flex-col gap-4">
      <h3 className="font-semibold text-ink">Scan this QR code</h3>
      <p className="text-sm text-ink-muted">
        Scan with your authenticator app, then enter the 6-digit code it shows.
      </p>

      {qrCode && (
        // Supabase returns this as an inline SVG data URI — safe to render directly.
        <div
          className="w-48 h-48 mx-auto"
          dangerouslySetInnerHTML={{ __html: qrCode }}
        />
      )}

      {secret && (
        <p className="text-xs text-ink-faint text-center break-all">
          Can't scan? Enter this key manually: <span className="font-mono">{secret}</span>
        </p>
      )}

      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        placeholder="6-digit code"
        className="input text-center tracking-widest text-lg"
        value={code}
        onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
      />

      <div className="flex gap-2">
        <button
          className="btn-secondary btn flex-1"
          onClick={cancelEnrollment}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          className="btn-primary btn flex-1"
          onClick={confirmEnrollment}
          disabled={submitting || code.length !== 6}
        >
          {submitting ? 'Verifying…' : 'Verify & enable'}
        </button>
      </div>
    </div>
  )
}