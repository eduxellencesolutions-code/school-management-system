'use client'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

const money = (n: any, cur: string) => new Intl.NumberFormat(cur === 'USD' ? 'en-US' : 'en-NG', { style: 'currency', currency: cur }).format(Number(n))
const day = (d: string) => new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })

export default function CapacityNotice({ orgId }: { orgId: string }) {
  const supabase = createClient()
  const [s, setS] = useState<any>(null)
  const [gateways, setGateways] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    const a = await supabase.rpc('get_capacity_status', { p_org_id: orgId }); if (!a.error) setS(a.data)
    const b = await supabase.rpc('resolve_org_billing', { p_org_id: orgId }); if (!b.error) setGateways(b.data?.gateways ?? [])
  }, [orgId])
  useEffect(() => { load() }, [load])
  if (!s?.active_period) return null
  const unit = s.org_type === 'centre' ? 'learners' : 'students'
  const p = s.purchased, q = s.open_quote
  async function pay(provider: string) {
    setBusy(true)
    const res = await fetch('/api/billing/topup/initiate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quoteId: q.id, provider }) })
    const data = await res.json(); setBusy(false)
    if (data.paymentLink) window.location.href = data.paymentLink; else toast.error(data.error ?? 'Could not start checkout')
  }
  async function dispute() {
    const reason = window.prompt('What do you believe is incorrect (your count or the quote)?'); if (!reason?.trim()) return
    const { error } = await supabase.rpc('dispute_topup_quote', { p_quote_id: q.id, p_reason: reason })
    if (error) toast.error(error.message); else { toast.success('Your dispute has been recorded. The due date is paused while we review it.'); load() }
  }
  return (
    <section className="card p-5 flex flex-col gap-2 text-sm">
      <h2 className="font-semibold text-ink">Your plan capacity</h2>
      <p>Your plan covers up to <b>{p.capacity}</b> active {unit}. You may exceed that by up to 10%, giving a tolerance limit of <b>{s.tolerance_limit}</b> (capacity × 1.10, rounded down). You currently have <b>{s.verified_count}</b>.</p>
      {q ? (
        <div className="border border-amber-200 bg-amber-50 rounded p-3 flex flex-col gap-1">
          <p><b>Top-up quote:</b> {money(q.amount_due, q.currency)} to move to the {q.target_plan.replace(/_/g, ' ')} plan, covering your verified count of {q.verified_count}.</p>
          <p className="text-xs">Calculation: (new plan price {money(q.target_price, q.currency)} − current plan price {money(q.current_price, q.currency)}) × {q.remaining_days} days remaining ÷ {q.period_days} days in your paid period. Issued {day(q.issued_at)}. Due {day(q.due_at)}{q.status === 'disputed' ? ' (paused: under review)' : ''}.</p>
          <p className="text-xs">This quote does not change if your count changes. Your access, enrolment, records, billing, support and exports are not affected while you review it.</p>
          {q.status === 'issued' && <div className="flex gap-2 flex-wrap">
            {gateways.map(g => <button key={g} disabled={busy} onClick={() => pay(g)} className="btn-primary btn-sm btn capitalize">Pay with {g}</button>)}
            <button onClick={dispute} className="btn-secondary btn-sm btn">Dispute</button></div>}
        </div>
      ) : s.over_tolerance && s.target ? (
        <p>Your count is above the allowance. For information, a top-up to the {s.target.plan.replace(/_/g, ' ')} plan would be about <b>{money(s.amount, p.currency)}</b> for the {s.remaining_days} of {s.period_days} days left, calculated as (new plan price − current plan price) × days remaining ÷ days in your period. If a top-up is issued it is due 14 days after its issue date and you will see the amount before paying.</p>
      ) : s.over_tolerance && s.custom_required ? <p>Your count is above every standard plan. Please contact Eduxellence for a reviewed arrangement.</p>
      : <p>You are within your allowance. Nothing is required.</p>}
      <p className="text-xs text-ink-muted">If you believe your count is wrong, correct your records or contact support. Disputed quotes are reviewed.</p>
    </section>
  )
}