// src/components/billing/FoundingProgrammeCard.tsx
'use client'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

const money = (n: number | string | null | undefined, cur: string | null | undefined) =>
  `${cur === 'USD' ? '$' : '₦'}${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-NG', { dateStyle: 'medium' }) : '—')

const STATUS_TEXT: Record<string, string> = {
  qualified: 'Qualified — your pilot has not started yet',
  pilot_active: 'Pilot in progress',
  pilot_complete: 'Pilot complete',
  converted: 'Founding conversion complete',
}

export default function FoundingProgrammeCard() {
  const [app, setApp] = useState<any | null | undefined>(undefined)
  const [busy, setBusy] = useState<'accept' | 'pay' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const res = await fetch('/api/tertiary/founding')
    const json = await res.json()
    setApp(json.application ?? null)
  }
  useEffect(() => { load() }, [])

  async function accept() {
    if (!app) return
    setBusy('accept'); setError(null)
    const res = await fetch('/api/tertiary/founding/accept', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId: app.application_id }),
    })
    const json = await res.json()
    setBusy(null)
    if (!res.ok) { setError(json.error ?? 'Could not accept the terms'); return }
    load()
  }

  async function pay() {
    if (!app) return
    setBusy('pay'); setError(null)
    const res = await fetch('/api/tertiary/billing/initiate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'paystack', kind: 'founding_conversion', applicationId: app.application_id }),
    })
    const json = await res.json()
    if (!res.ok || !json.paymentLink) {
      setBusy(null)
      setError(json.error ?? 'Could not start checkout')
      return
    }
    window.location.href = json.paymentLink
  }

  if (app === undefined) return null
  if (app === null) return null

  const agreement = app.agreement
  const mustAccept = agreement && !agreement.accepted

  return (
    <div className="card p-5 flex flex-col gap-3">
      <div>
        <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider">{app.campaign_name}</p>
        <p className="text-sm font-medium text-ink mt-1">{STATUS_TEXT[app.status] ?? app.status}</p>
      </div>

      {(app.pilot_started_at || app.pilot_ends_at) && (
        <p className="text-xs text-ink-muted">Pilot: {fmt(app.pilot_started_at)} → {fmt(app.pilot_ends_at)}</p>
      )}

      {agreement && (
        <div className="text-sm border border-surface-200 rounded p-3 flex flex-col gap-1">
          <p className="font-medium text-ink">Your founding terms</p>
          <p className="text-ink-muted">
            {agreement.tier_name ?? agreement.tier_key}: {money(agreement.price_per_student_per_term, agreement.currency)} per student per term
          </p>
          <p className="text-xs text-ink-faint">
            These terms apply to your first subscription payment only. Later renewals follow the standard plans and prices.
          </p>
          {agreement.accepted ? (
            <p className="text-xs text-green-600">Accepted on {fmt(agreement.accepted_at)}</p>
          ) : (
            <button onClick={accept} disabled={busy !== null} className="btn-primary btn-sm btn self-start mt-1 flex items-center gap-1.5">
              {busy === 'accept' && <Loader2 size={13} className="animate-spin" />} Accept these terms
            </button>
          )}
        </div>
      )}

      {app.status === 'pilot_complete' && !app.conversion?.already_paid && (
        <div className="text-sm border border-surface-200 rounded p-3 flex flex-col gap-1">
          <p className="font-medium text-ink">Complete your founding conversion</p>
          <p className="text-ink-muted">One-time founding fee: {money(app.conversion?.fee_amount, app.conversion?.fee_currency)}</p>
          {app.conversion?.can_pay ? (
            <button onClick={pay} disabled={busy !== null || mustAccept} className="btn-primary btn-sm btn self-start mt-1 flex items-center gap-1.5 disabled:opacity-50">
              {busy === 'pay' && <Loader2 size={13} className="animate-spin" />} Pay with Paystack
            </button>
          ) : (
            <p className="text-xs text-ink-faint">Online payment is not open yet. Eduxellence will contact you to complete your conversion.</p>
          )}
          {mustAccept && <p className="text-xs text-amber-700">Accept your founding terms first.</p>}
        </div>
      )}

      {app.status === 'converted' && (
        <p className="text-xs text-ink-muted">
          Converted on {fmt(app.converted_at)}. Your subscription now follows the normal Eduxellence plans.
        </p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}