'use client'
import { useState } from 'react'

export default function EnrollClient({ status, isAdmin }: { status: any; isAdmin: boolean }) {
  const [loading, setLoading] = useState<'paystack' | 'flutterwave' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function pay(provider: 'paystack' | 'flutterwave') {
    setLoading(provider)
    setError(null)
    const res = await fetch('/api/founding-500/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    })
    const data = await res.json()
    if (!res.ok || !data.paymentLink) {
      setError(data.error ?? 'Could not start checkout')
      setLoading(null)
      return
    }
    window.location.href = data.paymentLink
  }

  if (status.alreadyEnrolled) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold">🏆 Founding 500 — {status.enrollmentStatus === 'active' ? 'Active' : status.enrollmentStatus}</h1>
        <p className="text-ink-muted mt-2">Your school's Founding 500 enrollment is already in place.</p>
      </div>
    )
  }

  if (status.campaignClosed) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold">Founding 500 is fully claimed</h1>
        <p className="text-ink-muted mt-2">All 500 founding slots have been taken.</p>
      </div>
    )
  }

  if (!status.eligible) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold">Founding 500 isn't available for this school</h1>
        <p className="text-ink-muted mt-2">This offer requires signing up through a representative referral link.</p>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto py-16">
      <div className="text-center mb-8">
        <span className="inline-block text-xs font-bold tracking-wide bg-amber-100 text-amber-800 px-3 py-1 rounded-full">FOUNDING 500</span>
        <h1 className="text-3xl font-bold mt-4">🏆 Founding 500 Early-Access Offer</h1>
        <p className="text-4xl font-extrabold mt-2">₦{status.qualifying_price.toLocaleString()} <span className="text-base font-normal text-ink-muted">/ first term</span></p>
        <p className="text-sm text-ink-muted mt-1">{status.slots_remaining} of 500 founding slots remaining</p>
      </div>

      <ul className="space-y-2 text-sm text-ink-muted mb-8">
        <li>• Full Premium School access for the rest of your current academic term</li>
        <li>• Locked-in founding pricing — this offer won't come around again</li>
        <li>• Referred by your school's Founding 500 representative</li>
      </ul>

      {!isAdmin && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded p-3 mb-4">Only a school admin can activate Founding 500 for this account.</p>
      )}

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="space-y-3">
        <button
          disabled={!isAdmin || loading !== null}
          onClick={() => pay('paystack')}
          className="w-full bg-brand-600 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
        >
          {loading === 'paystack' ? 'Starting checkout…' : 'Pay ₦2,000 with Paystack to Activate'}
        </button>
        <button
          disabled={!isAdmin || loading !== null}
          onClick={() => pay('flutterwave')}
          className="w-full border border-brand-600 text-brand-600 rounded-lg py-3 font-semibold disabled:opacity-50"
        >
          {loading === 'flutterwave' ? 'Starting checkout…' : 'Pay ₦2,000 with Flutterwave to Activate'}
        </button>
      </div>
    </div>
  )
}