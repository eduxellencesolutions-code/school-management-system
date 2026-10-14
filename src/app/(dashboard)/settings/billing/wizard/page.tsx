'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CAPABILITY_LABELS, FEATURE_LABELS, EXCLUDED_LABELS, ISSUE_LABELS } from '@/lib/billing/labels'

type Cycle = 'termly' | 'annual'
interface Card {
  key: string; name: string; capacity: string; eligible: boolean; reasons: string[]
  termly: number | null; annual: number | null; note?: string; benefits: string[]; recommended: boolean
}
const naira = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(n)

function toCards(s: any): Card[] {
  const opts: any[] = s?.options ?? []
  if (s?.org_type === 'university') {
    return opts.map(o => {
      const t = o.termly, a = o.annual
      return {
        key: o.tier_key, name: o.name,
        capacity: o.max_students ? `${o.min_students.toLocaleString()}–${o.max_students.toLocaleString()} students` : `${o.min_students.toLocaleString()}+ students`,
        eligible: !!t?.eligible && !o.is_custom,
        reasons: t?.eligible ? [] : [o.is_custom ? 'Arranged individually. Contact Eduxellence.' : 'Your student count is above this plan’s limit.'],
        termly: t?.eligible ? Number(t.amount_due) : null, annual: a?.eligible ? Number(a.amount_due) : null,
        note: t?.eligible ? (t.quantity_is_minimum
          ? `Billed for this plan’s minimum of ${Number(t.billable_quantity).toLocaleString()} students (you have ${Number(t.verified_count).toLocaleString()}).`
          : `${Number(t.billable_quantity).toLocaleString()} students × ${naira(t.unit_price)} per term`) : undefined,
        benefits: (s.benefits?.[o.tier_key] ?? []).map((k: string) => CAPABILITY_LABELS[k] ?? k),
        recommended: s.recommended_tier_key === o.tier_key,
      }
    })
  }
  return opts.filter(o => o.plan_key !== 'free').map(o => ({
    key: o.plan_key, name: o.label, capacity: `Up to ${Number(o.capacity).toLocaleString()} students`,
    eligible: !!o.eligible && !!o.purchasable && s.checkout_enabled !== false,
    reasons: (o.exceeded ?? []).map((e: any) => `Your ${e.limit} (${e.current}) exceed this plan’s maximum of ${e.max}.`)
      .concat(o.eligible && !o.purchasable ? ['Not yet available online.'] : []),
    termly: Number(o.termly_price), annual: Number(o.annual_price),
    benefits: (s.benefits?.[o.plan_key] ?? []).map((k: string) => FEATURE_LABELS[k] ?? k),
    recommended: s.recommended?.plan_key === o.plan_key,
  }))
}

export default function BillingWizardPage() {
  const supabase = createClient()
  const [orgId, setOrgId] = useState<string | null>(null)
  const [state, setState] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [cycle, setCycle] = useState<Cycle>('termly')
  const [selected, setSelected] = useState<string | null>(null)
  const [provider, setProvider] = useState<string>('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (id: string) => {
    const { data, error } = await supabase.rpc('get_billing_wizard_state', { p_org_id: id })
    if (error) { setError(error.message); return }
    setState(data)
    setProvider(p => p || (data.gateways?.[0] ?? ''))
  }, [])

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
      if (!profile?.organization_id) { setError('This page is for institutions.'); return }
      setOrgId(profile.organization_id)
      await load(profile.organization_id)
    })()
  }, [load])

  if (error) return <div className="card p-6 text-sm text-red-700">{error}</div>
  if (!state) return <div className="p-8 flex items-center gap-2 text-sm text-ink-muted"><Loader2 size={16} className="animate-spin" /> Loading…</div>

  const sum = state.student_summary ?? {}
  const cards = toCards(state)
  const sel = cards.find(c => c.key === selected) ?? null
  const amount = sel ? (cycle === 'annual' ? sel.annual : sel.termly) : null
  const blocking: any[] = sum.blocking ?? []
  const warnings: any[] = sum.warnings ?? []
  const ready = state.readiness ?? {}
  const calendarOk = ready.has_current_term && ready.term_dates_set && ready.term_open && (cycle === 'termly' || ready.session_dates_set)
  const paid = state.entitlement?.status === 'paid' || (state.entitlement?.plan && state.entitlement.plan !== 'free' && state.entitlement?.status === 'active')
  const canPay = !!sel && sel.eligible && amount != null && !!provider && calendarOk && state.can_quote && !busy

  async function pay() {
    if (!sel || amount == null || !orgId) return
    setBusy(true)
    try {
      const tertiary = state.org_type === 'university'
      if (tertiary) {
        const { error } = await supabase.rpc('set_tertiary_plan', { p_org_id: orgId, p_tier_key: sel.key, p_billing_cycle: cycle })
        if (error) throw new Error(error.message)
      }
      const res = await fetch(tertiary ? '/api/tertiary/billing/initiate' : '/api/billing/k12/initiate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tertiary ? { provider, expectedAmount: amount } : { plan: sel.key, cycle, provider, expectedAmount: amount }),
      })
      const data = await res.json()
      if (res.status === 409) { toast.error(data.error); await load(orgId); return }
      if (data.paymentLink) { window.location.href = data.paymentLink; return }
      toast.error(data.error ?? 'Could not start checkout')
    } catch (e: any) { toast.error(e.message ?? 'Could not start checkout') }
    finally { setBusy(false) }
  }

  async function cancelPending() {
    if (!orgId) return
    const { error } = state.org_type === 'university'
      ? await supabase.rpc('cancel_tertiary_payment_quote', { p_quote_id: state.pending_quote.id })
      : await supabase.rpc('cancel_k12_payment_quote', { p_org_id: orgId })
    if (error) toast.error(error.message); else { toast.success('Pending payment cancelled'); await load(orgId) }
  }

  return (
    <div className="max-w-4xl flex flex-col gap-6">
      <div>
        <h1 className="page-title">Plan &amp; payment</h1>
        <p className="page-subtitle">Your price is based on your verified student records. Nothing is charged until you confirm.</p>
      </div>

      {state.is_test_org && <div className="card p-3 text-xs bg-amber-50 border-amber-200 text-amber-800">This organization is designated as test data.</div>}
      {paid && <div className="card p-3 text-sm flex items-center gap-2"><CheckCircle2 size={16} className="text-green-600" />
        You already have an active subscription{state.entitlement?.expires_at ? ` until ${new Date(state.entitlement.expires_at).toLocaleDateString('en-NG')}` : ''}. Choosing a plan below pays for your next unpaid period.</div>}
      {state.status_message && <div className="card p-4 text-sm text-ink">{state.status_message}</div>}

      <section className="card p-5 flex flex-col gap-3">
        <h2 className="font-semibold text-sm text-ink">1. Your verified students</h2>
        <p className="text-sm text-ink">
          <span className="text-2xl font-bold">{Number(sum.billable_count ?? 0).toLocaleString()}</span> students counted for pricing
          <span className="text-ink-muted"> (of {Number(sum.total_records ?? 0).toLocaleString()} records)</span>
        </p>
        {Object.keys(sum.excluded ?? {}).length > 0 && (
          <p className="text-xs text-ink-muted">Not counted: {Object.entries(sum.excluded).map(([k, v]) => `${EXCLUDED_LABELS[k] ?? k.replace(/_/g, ' ')} (${v})`).join(', ')}.</p>
        )}
        {blocking.map((b, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-red-700"><AlertTriangle size={14} className="mt-0.5" />
            Fix before continuing: {b.count ?? b.groups?.length} {ISSUE_LABELS[b.code] ?? b.code}. <Link href="/students" className="underline">Review students</Link></div>
        ))}
        {warnings.map((w, i) => (
          <div key={i} className="text-xs text-amber-700">Note: {w.count} {ISSUE_LABELS[w.code] ?? w.code}.</div>
        ))}
        {state.no_billable_students && <p className="text-sm text-ink-muted">Enroll your students first. Your price is calculated from verified records.</p>}
        {!calendarOk && state.org_type !== 'centre' && (
          <p className="text-xs text-amber-700">Set your current term with start and end dates{cycle === 'annual' ? ' and the session dates' : ''} under <Link href="/settings/academic" className="underline">Settings → Academic Periods</Link> before paying.</p>
        )}
      </section>

      <section className="card p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold text-sm text-ink">2. Choose a plan</h2>
          <div className="flex gap-1 text-xs">
            {(['termly', 'annual'] as Cycle[]).map(c => (
              <button key={c} onClick={() => setCycle(c)} className={`px-2 py-0.5 rounded ${cycle === c ? 'bg-brand-500 text-white' : 'bg-surface-100 text-ink-muted'}`}>
                {c === 'termly' ? 'Per term' : 'Per year'}</button>))}
          </div>
        </div>
        {(state.custom_required || state.band_pending) && (
          <p className="text-sm text-ink">With {Number(sum.billable_count).toLocaleString()} students, your institution needs a reviewed arrangement. <Link href="/school-support" className="underline">Contact Eduxellence</Link>.</p>
        )}
        <div className="grid md:grid-cols-2 gap-3">
          {cards.map(c => {
            const price = cycle === 'annual' ? c.annual : c.termly
            return (
              <button key={c.key} disabled={!c.eligible} onClick={() => setSelected(c.key)}
                className={`text-left border rounded-lg p-4 flex flex-col gap-2 ${selected === c.key ? 'border-brand-500 ring-1 ring-brand-500' : 'border-surface-200'} ${c.eligible ? '' : 'opacity-60 cursor-not-allowed'}`}>
                <div className="flex items-center justify-between"><span className="font-medium text-ink">{c.name}</span>
                  {c.recommended && <span className="badge badge-blue text-[10px]">Recommended</span>}</div>
                <div className="text-xs text-ink-muted">{c.capacity}</div>
                <div className="text-xl font-bold text-ink">{naira(price)}<span className="text-xs font-normal text-ink-muted"> / {cycle === 'annual' ? 'year' : 'term'}</span></div>
                {c.note && <div className="text-xs text-ink-muted">{c.note}</div>}
                {c.reasons.map((r, i) => <div key={i} className="text-xs text-red-600">{r}</div>)}
                {c.benefits.length > 0 && <ul className="text-xs text-ink-muted list-disc list-inside">{c.benefits.map(b => <li key={b}>{b}</li>)}</ul>}
              </button>)
          })}
        </div>
      </section>

      {state.pending_quote && (
        <div className="card p-3 text-sm flex items-center justify-between gap-3 flex-wrap">
          <span>A payment of <strong>{naira(Number(state.pending_quote.amount_due))}</strong> is in progress and locked until {new Date(state.pending_quote.expires_at).toLocaleTimeString('en-NG')}.</span>
          <button onClick={cancelPending} className="btn-secondary btn-sm btn">Cancel it</button>
        </div>)}

      <section className="card p-5 flex flex-col gap-3">
        <h2 className="font-semibold text-sm text-ink">3. Review and pay</h2>
        {sel && amount != null ? (
          <>
            <div className="text-sm text-ink">{sel.name} · {cycle === 'annual' ? 'billed yearly' : 'billed per term'} · <strong>{naira(amount)}</strong> total in Nigerian naira.</div>
            <p className="text-xs text-ink-muted">When you continue, this amount is locked for 2 hours. If your student count, plan or billing cycle changes, the quote is replaced and you will review it again. Your plan is active only after the payment is verified. Returning from the payment page does not activate it. Your billing period comes from your academic calendar.</p>
            {(state.gateways ?? []).length === 0
              ? <p className="text-sm text-red-700">Online payment is not available right now.</p>
              : <div className="flex gap-4">{(state.gateways as string[]).map(g => (
                  <label key={g} className="flex items-center gap-2 text-sm capitalize">
                    <input type="radio" name="gw" checked={provider === g} onChange={() => setProvider(g)} /> {g}</label>))}</div>}
            <button onClick={pay} disabled={!canPay} className="btn-primary btn w-fit disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : `Confirm and pay ${naira(amount)}`}</button>
          </>
        ) : <p className="text-sm text-ink-muted">Choose a plan above to see your total.</p>}
      </section>
    </div>
  )
}