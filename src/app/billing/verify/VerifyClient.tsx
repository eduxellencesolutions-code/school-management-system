'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function VerifyClient() {
  const params = useSearchParams()
  const router = useRouter()
  const [state, setState] = useState<'checking' | 'successful' | 'pending' | 'failed' | 'error'>('checking')
  const [message, setMessage] = useState<string | null>(null)
  const [plan, setPlan] = useState<string | null>(null)

  useEffect(() => {
    const provider = params.get('provider')
    const ref = params.get('ref')
    const transactionId = params.get('transaction_id')

    if (!provider || !ref) {
      setState('error')
      setMessage('Missing payment reference — please contact support.')
      return
    }

    const url = `/api/billing/verify-status?provider=${provider}&ref=${ref}${transactionId ? `&transaction_id=${transactionId}` : ''}`

    let attempts = 0
    const maxAttempts = 5

    async function poll() {
      attempts++
      try {
        const res = await fetch(url)
        const data = await res.json()

        if (data.status === 'successful') {
          setState('successful')
          setPlan(data.plan ?? null)
          return
        }
        if (data.status === 'pending' && attempts < maxAttempts) {
          setTimeout(poll, 2000)
          return
        }
        if (data.status === 'error') {
          setState('error')
          setMessage(data.message ?? 'Something went wrong verifying your payment.')
          return
        }
        setState('failed')
      } catch {
        setState('error')
        setMessage('Could not reach the server to verify your payment.')
      }
    }

    poll()
  }, [params])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ maxWidth: '440px', textAlign: 'center' }}>
        {state === 'checking' && (
          <>
            <h1 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Confirming your payment…</h1>
            <p style={{ color: '#666' }}>This usually takes a few seconds.</p>
          </>
        )}
        {state === 'successful' && (
          <>
            <h1 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>✅ Payment confirmed</h1>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
              {plan ? `Your ${plan.replace('_', ' ')} plan is now active.` : 'Your payment was successful.'}
            </p>
            <Link href="/dashboard" style={{ color: '#2563eb' }}>Go to your dashboard →</Link>
          </>
        )}
        {state === 'pending' && (
          <>
            <h1 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Payment still processing</h1>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
              This can take a minute. You'll be notified once it's confirmed — no need to pay again.
            </p>
            <Link href="/dashboard" style={{ color: '#2563eb' }}>Return to dashboard →</Link>
          </>
        )}
        {(state === 'failed' || state === 'error') && (
          <>
            <h1 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>⚠️ {state === 'failed' ? 'Payment not successful' : 'Something went wrong'}</h1>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
              {message ?? 'Your payment could not be confirmed. No charge should have been made — please try again.'}
            </p>
            <button onClick={() => router.back()} style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>
              ← Try again
            </button>
          </>
        )}
      </div>
    </div>
  )
}