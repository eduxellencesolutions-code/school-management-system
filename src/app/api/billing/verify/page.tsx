'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

type Status = 'checking' | 'successful' | 'pending' | 'failed' | 'error'

export default function VerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<Status>('checking')
  const [message, setMessage] = useState<string | null>(null)
  const [plan, setPlan] = useState<string | null>(null)

  useEffect(() => {
    const provider = searchParams.get('provider')
    const ref = searchParams.get('ref') ?? searchParams.get('tx_ref') ?? searchParams.get('reference')
    const transactionId = searchParams.get('transaction_id')

    if (!provider || !ref) {
      setStatus('error')
      setMessage('Missing payment reference. If you completed payment, check back in a few minutes — your dashboard will update automatically once confirmed.')
      return
    }

    let attempts = 0
    const maxAttempts = 5

    async function poll() {
      attempts++
      try {
        const params = new URLSearchParams({ provider: provider!, ref: ref! })
        if (transactionId) params.set('transaction_id', transactionId)

        const res = await fetch(`/api/billing/verify-status?${params.toString()}`)
        const data = await res.json()

        if (data.status === 'successful') {
          setStatus('successful')
          setPlan(data.plan ?? null)
          setTimeout(() => router.push('/settings'), 2500)
          return
        }

        if (data.status === 'error') {
          setStatus('error')
          setMessage(data.message ?? 'Something went wrong confirming your payment.')
          return
        }

        // 'pending' or 'failed' from the gateway — payment may still be
        // processing, so retry a few times before giving up.
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000)
        } else {
          setStatus(data.status === 'failed' ? 'failed' : 'pending')
        }
      } catch {
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000)
        } else {
          setStatus('error')
          setMessage('Could not reach the server to confirm your payment.')
        }
      }
    }

    poll()
  }, [searchParams, router])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      {status === 'checking' && (
        <>
          <Loader2 size={40} className="animate-spin text-brand-500 mb-4" />
          <h2 className="text-xl font-semibold text-ink">Confirming your payment…</h2>
          <p className="text-ink-muted mt-2">This will just take a moment.</p>
        </>
      )}

      {status === 'successful' && (
        <>
          <CheckCircle2 size={40} className="text-green-500 mb-4" />
          <h2 className="text-xl font-semibold text-ink">Payment confirmed!</h2>
          <p className="text-ink-muted mt-2">
            {plan ? `Your ${plan.replace('_', ' ')} plan is now active.` : 'Your subscription is now active.'} Redirecting…
          </p>
        </>
      )}

      {status === 'pending' && (
        <>
          <Loader2 size={40} className="text-amber-500 mb-4" />
          <h2 className="text-xl font-semibold text-ink">Payment still processing</h2>
          <p className="text-ink-muted mt-2">
            This can take a few minutes for some payment methods. We'll update your account automatically once it clears — no action needed.
          </p>
        </>
      )}

      {status === 'failed' && (
        <>
          <XCircle size={40} className="text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-ink">Payment not successful</h2>
          <p className="text-ink-muted mt-2">Your payment wasn't completed. You can try again from Settings → Billing.</p>
        </>
      )}

      {status === 'error' && (
        <>
          <XCircle size={40} className="text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-ink">Couldn't confirm payment</h2>
          <p className="text-ink-muted mt-2">{message}</p>
        </>
      )}
    </div>
  )
}
