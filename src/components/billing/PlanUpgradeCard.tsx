'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { getPrice, getAnnualSavingsPercent, BillingCycle, Currency, PaidPlan } from '@/lib/payments/pricing'

interface Props {
  plan: PaidPlan
  label: string
}

export default function PlanUpgradeCard({ plan, label }: Props) {
  const [cycle, setCycle] = useState<BillingCycle>('annual')
  const [currency, setCurrency] = useState<Currency>('NGN')
  const [loadingProvider, setLoadingProvider] = useState<'flutterwave' | 'paystack' | null>(null)

  const price = getPrice(plan, currency, cycle)
  const symbol = currency === 'NGN' ? '₦' : '$'

  async function checkout(provider: 'flutterwave' | 'paystack') {
    setLoadingProvider(provider)
    try {
      const res = await fetch('/api/billing/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, currency, cycle, provider }),
      })
      const data = await res.json()
      if (data.paymentLink) {
        window.location.href = data.paymentLink
      } else {
        toast.error(data.error ?? 'Failed to start checkout')
        setLoadingProvider(null)
      }
    } catch {
      toast.error('Failed to start checkout')
      setLoadingProvider(null)
    }
  }

  return (
    <div className="p-3 border border-surface-200 rounded-lg flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink">{label}</p>
        <div className="flex gap-1 text-xs">
          <button
            onClick={() => setCurrency('NGN')}
            className={`px-2 py-0.5 rounded ${currency === 'NGN' ? 'bg-brand-500 text-white' : 'bg-surface-100 text-ink-muted'}`}
          >
            ₦ NGN
          </button>
          <button
            onClick={() => setCurrency('USD')}
            className={`px-2 py-0.5 rounded ${currency === 'USD' ? 'bg-brand-500 text-white' : 'bg-surface-100 text-ink-muted'}`}
          >
            $ USD
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-ink">{symbol}{price.toLocaleString()}</span>
          <span className="text-xs text-ink-muted">/ {cycle === 'annual' ? 'year' : 'term'}</span>
        </div>
        <div className="flex gap-1 text-xs">
          <button
            onClick={() => setCycle('termly')}
            className={`px-2 py-0.5 rounded ${cycle === 'termly' ? 'bg-brand-500 text-white' : 'bg-surface-100 text-ink-muted'}`}
          >
            Termly
          </button>
          <button
            onClick={() => setCycle('annual')}
            className={`px-2 py-0.5 rounded ${cycle === 'annual' ? 'bg-brand-500 text-white' : 'bg-surface-100 text-ink-muted'}`}
          >
            Annual · Save {getAnnualSavingsPercent(plan, currency)}%
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => checkout('flutterwave')}
          disabled={loadingProvider !== null}
          className="btn-primary btn-sm btn flex-1 disabled:opacity-50"
        >
          {loadingProvider === 'flutterwave' ? <Loader2 size={13} className="animate-spin" /> : 'Pay with Flutterwave'}
        </button>
        <button
          onClick={() => checkout('paystack')}
          disabled={loadingProvider !== null}
          className="btn-secondary btn-sm btn flex-1 disabled:opacity-50"
        >
          {loadingProvider === 'paystack' ? <Loader2 size={13} className="animate-spin" /> : 'Pay with Paystack'}
        </button>
      </div>
    </div>
  )
}