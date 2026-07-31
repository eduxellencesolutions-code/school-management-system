'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Loader2, ShieldCheck, Shield, QrCode, Copy, Check } from 'lucide-react'

type EnrollState = 'loading' | 'idle' | 'enrolling' | 'verifying' | 'enrolled'

export default function MFAEnrollment() {
  const supabase = createClient()
  const [state, setState] = useState<EnrollState>('loading')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

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

  async function disableMFA() {
    if (!confirm('Are you sure you want to disable 2FA? This will reduce your account security.')) return
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totpFactor = factors?.totp?.find(f => f.status === 'verified')
      if (!totpFactor) return
      const { error } = await supabase.auth.mfa.unenroll({ factorId: totpFactor.id })
      if (error) throw error
      setState('idle')
      toast.success('2FA has been disabled.')
    } catch (err: any) {
      toast.error(err.message || 'Failed to disable 2FA')
    }
  }

  const handleCopySecret = async () => {
    if (secret) {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (state === 'loading') {
    return (
      <div className="card p-6 flex justify-center items-center gap-2">
        <Loader2 className="animate-spin" size={20} />
        <span className="text-sm text-ink-muted">Checking 2FA status...</span>
      </div>
    )
  }

  if (state === 'enrolled') {
    return (
      <div className="card p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-green-600" size={20} />
          <div>
            <p className="font-medium text-ink">Two-factor authentication is enabled</p>
            <p className="text-sm text-ink-muted">
              Your account requires an authenticator code at login.
            </p>
          </div>
        </div>
        <button
          onClick={disableMFA}
          className="btn-sm btn bg-red-50 text-red-600 hover:bg-red-100"
        >
          Disable 2FA
        </button>
      </div>
    )
  }

  if (state === 'idle') {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={18} className="text-amber-500" />
          <h3 className="font-semibold text-ink">Two-factor authentication</h3>
          <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            Not enabled
          </span>
        </div>
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
      <div className="card p-6 flex justify-center items-center gap-2">
        <Loader2 className="animate-spin" size={20} />
        <span className="text-sm text-ink-muted">Setting up 2FA...</span>
      </div>
    )
  }

  // state === 'verifying'
  return (
    <div className="card p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <QrCode size={18} className="text-brand-500" />
        <h3 className="font-semibold text-ink">Scan this QR code</h3>
      </div>
      <p className="text-sm text-ink-muted">
        Scan with your authenticator app, then enter the 6-digit code it shows.
      </p>

      {qrCode && (
        <div className="flex justify-center p-4 bg-white rounded-lg border border-surface-200">
          <div
            className="w-48 h-48"
            dangerouslySetInnerHTML={{ __html: qrCode }}
          />
        </div>
      )}

      {secret && (
        <div className="bg-surface-50 p-3 rounded-lg border border-surface-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-faint">Manual entry key:</span>
            <button
              onClick={handleCopySecret}
              className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-sm font-mono text-ink mt-1 break-all">{secret}</p>
        </div>
      )}

      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        placeholder="Enter 6-digit code"
        className="input text-center tracking-widest text-lg"
        value={code}
        onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
        onKeyDown={e => e.key === 'Enter' && confirmEnrollment()}
        autoFocus
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
          {submitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            'Verify & enable'
          )}
        </button>
      </div>

      {submitting && (
        <p className="text-xs text-ink-muted text-center">
          Verifying your code...
        </p>
      )}
    </div>
  )
}