'use client'

import { useEffect, useState } from 'react'

interface Status {
  eligible: boolean
  referral_code?: string
  qualifying_price?: number
  slots_remaining?: number
  alreadyEnrolled?: boolean
  campaignClosed?: boolean
}

export default function FoundingBanner() {
  const [status, setStatus] = useState<Status | null>(null)
  const [paying, setPaying] = useState<'paystack' | 'flutterwave' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/founding-500/status')
      .then(res => res.json())
      .then(setStatus)
      .catch(() => setStatus({ eligible: false }))
  }, [])

  if (!status?.eligible) return null // covers: not eligible, already enrolled, campaign closed — banner just doesn't show

  async function pay(provider: 'paystack' | 'flutterwave') {
    setPaying(provider)
    setError(null)
    try {
      const res = await fetch('/api/founding-500/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referral_code: status!.referral_code, provider }),
      })
      const data = await res.json()
      if (data.paymentLink) {
        window.location.href = data.paymentLink
      } else {
        setError(data.error ?? 'Could not start checkout')
        setPaying(null)
      }
    } catch {
      setError('Could not start checkout')
      setPaying(null)
    }
  }

  return (
    <div style={{ background: '#fff8e1', border: '2px solid #f5c518', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
      <h3 style={{ fontWeight: 700, marginBottom: '0.4rem' }}>🎉 You're eligible for Founding 500</h3>
      <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: '0.9rem' }}>
        ₦{status.qualifying_price?.toLocaleString()} for full Premium access this term.
        {typeof status.slots_remaining === 'number' && ` Only ${status.slots_remaining} of 500 slots left.`}
      </p>
      {error && <p style={{ color: '#c0392b', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={() => pay('paystack')} disabled={paying !== null}
          style={{ flex: 1, background: '#111', color: '#fff', border: 'none', padding: '0.6rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          {paying === 'paystack' ? 'Starting…' : `Pay ₦${status.qualifying_price?.toLocaleString()} with Paystack`}
        </button>
        <button onClick={() => pay('flutterwave')} disabled={paying !== null}
          style={{ flex: 1, background: '#f5c518', color: '#111', border: 'none', padding: '0.6rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
          {paying === 'flutterwave' ? 'Starting…' : 'Pay with Flutterwave'}
        </button>
      </div>
    </div>
  )
}