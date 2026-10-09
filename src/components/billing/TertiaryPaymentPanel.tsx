'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function formatCurrency(amount: number | null | undefined, currency: string = 'NGN') {
  if (amount == null) return '—'
  const locale = currency === 'NGN' ? 'en-NG' : 'en-US'
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString('en', { maximumFractionDigits: 2 })}`
  }
}

const fmtDate = (s: string) =>
  new Date(s.length === 10 ? `${s}T00:00:00` : s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export interface Entitlement {
  status: 'pilot' | 'paid' | 'grace' | 'expired' | 'never_paid'
  entitled: boolean
  paid_until: string | null
  grace_ends_at: string | null
  between_periods?: boolean
  pilot?: { pilot_ends_at: string } | null
  next_period?: { period_start: string } | null
}
export interface PendingQuote { id: string; amount_due: number; currency: string; period_label: string | null; expires_at: string }
interface Estimate { amount_due: number; currency: string; student_count: number; billing_cycle: string }

function statusLine(e: Entitlement | null): string {
  if (!e) return ''
  switch (e.status) {
    case 'pilot': return e.pilot ? `Founding pilot until ${fmtDate(e.pilot.pilot_ends_at)}` : 'Founding pilot'
    case 'paid':
      if (e.between_periods && e.paid_until) return `Paid through ${fmtDate(e.paid_until)}${e.next_period ? ` (next period starts ${fmtDate(e.next_period.period_start)})` : ''}`
      return e.paid_until ? `Active until ${fmtDate(e.paid_until)}` : 'Active'
    case 'grace': return e.grace_ends_at ? `Payment overdue. Grace period ends ${fmtDate(e.grace_ends_at)}` : 'Payment overdue'
    case 'expired': return e.paid_until ? `Expired on ${fmtDate(e.paid_until)}` : 'Expired'
    default: return 'No payment received yet'
  }
}

export default function TertiaryPaymentPanel({ estimate, entitlement, pendingQuote }: {
  estimate: Estimate; entitlement: Entitlement | null; pendingQuote: PendingQuote | null
}) {
  const supabase = createClient()
  const [provider, setProvider] = useState<'paystack' | 'flutterwave'>('paystack')
  const [loading, setLoading] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const enabled = process.env.NEXT_PUBLIC_TERTIARY_BILLING_ENABLED === 'true'

  // A pending quote is a locked offer: show ITS amount, not today's estimate.
  const amount = pendingQuote ? pendingQuote.amount_due : estimate.amount_due
  const currency = pendingQuote ? pendingQuote.currency : estimate.currency

  async function pay() {
    setLoading(true)
    try {
      const res = await fetch('/api/tertiary/billing/initiate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider }),
      })
      const data = await res.json()
      if (data.paymentLink) { window.location.href = data.paymentLink; return }
      toast.error(data.error ?? 'Failed to start checkout')
    } catch {
      toast.error('Could not reach the server. Please check your connection and try again.')
    }
    setLoading(false)
  }

  async function cancelQuote() {
    if (!pendingQuote) return
    setCancelling(true)
    const { error } = await supabase.rpc('cancel_tertiary_payment_quote', { p_quote_id: pendingQuote.id })
    if (error) { toast.error(error.message); setCancelling(false); return }
    window.location.reload()
  }

  return (
    <div className="border border-surface-200 rounded-lg p-4 flex flex-col gap-3">
      {entitlement && <p className="text-sm font-medium text-ink">{statusLine(entitlement)}</p>}

      <div className="text-sm text-ink-muted">
        {pendingQuote ? (
          <>
            A payment of <span className="font-medium text-ink">{formatCurrency(amount, currency)}</span>
            {pendingQuote.period_label ? ` for ${pendingQuote.period_label}` : ''} is in progress and the amount is locked until {fmtDate(pendingQuote.expires_at)}.
          </>
        ) : (
          <>
            {estimate.student_count} active student{estimate.student_count !== 1 ? 's' : ''}, billed {estimate.billing_cycle}.
            Amount due: <span className="font-medium text-ink">{formatCurrency(amount, currency)}</span>.
            The billing period is taken from your academic calendar when you continue.
          </>
        )}
      </div>

      {!enabled ? (
        <p className="text-xs text-ink-faint">Online payment is not yet available for your institution.</p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-ink">Choose payment method</p>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="tertiary_provider" checked={provider === 'paystack'} onChange={() => setProvider('paystack')} /> Paystack
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="tertiary_provider" checked={provider === 'flutterwave'} onChange={() => setProvider('flutterwave')} /> Flutterwave
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={pay} disabled={loading || cancelling} className="btn-primary btn-sm btn disabled:opacity-50">
              {loading ? <Loader2 size={13} className="animate-spin" /> : 'Continue to pay'}
            </button>
            {pendingQuote && (
              <button onClick={cancelQuote} disabled={loading || cancelling} className="btn-secondary btn-sm btn disabled:opacity-50">
                {cancelling ? <Loader2 size={13} className="animate-spin" /> : 'Cancel this payment'}
              </button>
            )}
          </div>
          <p className="text-xs text-ink-faint">Your plan is only active once the payment is confirmed. Returning from the payment page does not activate it.</p>
        </>
      )}
    </div>
  )
}