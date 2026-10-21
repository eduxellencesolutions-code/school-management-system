'use client'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const money = (n: number, cur: string) => new Intl.NumberFormat(cur === 'USD' ? 'en-US' : 'en-NG', { style: 'currency', currency: cur }).format(n)
const countryName = (code: string) => { try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? '' } catch { return '' } }

export default function SoloBillingPage() {
  const supabase = createClient()
  const [opts, setOpts] = useState<any>(null)
  const [country, setCountry] = useState('')
  const [cycle, setCycle] = useState<'termly' | 'annual'>('annual')
  const [provider, setProvider] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_solo_plan_options')
    if (error) { toast.error(error.message); return }
    setOpts(data); setProvider(p => p || data?.billing?.gateways?.[0] || '')
  }, [])
  useEffect(() => { load() }, [load])

  async function declare() {
    if (!window.confirm(`Your billing country will be recorded as ${country.toUpperCase()} ${countryName(country.toUpperCase())}. It decides your payment currency and cannot be changed later without contacting support. Continue?`)) return
    const { error } = await supabase.rpc('set_my_billing_country', { p_country: country })
    if (error) toast.error(error.message); else { toast.success('Billing country recorded'); load() }
  }
  async function pay() {
    const calc = opts[cycle]
    setBusy(true)
    const res = await fetch('/api/billing/solo/initiate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cycle, provider, expectedAmount: Number(calc.charge) }) })
    const data = await res.json(); setBusy(false)
    if (res.status === 409) { toast.error(data.error); load(); return }
    if (data.paymentLink) window.location.href = data.paymentLink; else toast.error(data.error ?? 'Could not start checkout')
  }

  if (!opts) return <div className="p-8 flex items-center gap-2 text-sm text-ink-muted"><Loader2 size={16} className="animate-spin" /> Loading…</div>
  const b = opts.billing
  return (
    <div className="max-w-xl flex flex-col gap-4">
      <h1 className="page-title">Solo Teacher Pro</h1>
      {b?.blocked_reason === 'country_missing' && (
        <div className="card p-4 flex flex-col gap-2 text-sm">
          <p>{b.message}</p>
          <div className="flex gap-2 items-center">
            <input className="input w-24" maxLength={2} placeholder="NG" value={country} onChange={e => setCountry(e.target.value.toUpperCase())} />
            <span className="text-xs text-ink-muted">{countryName(country) || 'Two-letter ISO country code, for example NG, GB, KE'}</span>
            <button onClick={declare} disabled={country.length !== 2} className="btn-primary btn-sm btn">Confirm country</button>
          </div>
        </div>)}
      {b && !b.ready && b.blocked_reason !== 'country_missing' && <div className="card p-4 text-sm">{b.message}</div>}
      {b?.ready && !opts.available && <div className="card p-4 text-sm">{opts.message}</div>}
      {b?.ready && opts.available && (
        <div className="card p-5 flex flex-col gap-3 text-sm">
          <p className="text-xs text-ink-muted">Billing country {b.country} · you pay in {b.currency === 'USD' ? 'US dollars' : 'Nigerian naira'}.</p>
          {(['termly', 'annual'] as const).map(c => (
            <label key={c} className={`border rounded p-3 flex flex-col gap-1 cursor-pointer ${cycle === c ? 'border-brand-500' : 'border-surface-200'}`}>
              <span className="flex gap-2 items-center"><input type="radio" checked={cycle === c} onChange={() => setCycle(c)} />
                <b>{c === 'annual' ? 'Per year' : 'Per term'}</b> · {money(Number(opts[c].charge), opts.currency)}</span>
              {opts[c].adjusted && <span className="text-xs text-amber-700">Calculated {money(Number(opts[c].calculated), opts.currency)} · minimum invoice {money(Number(opts[c].minimum), opts.currency)} · you will be charged {money(Number(opts[c].charge), opts.currency)}. The yearly plan has no minimum adjustment.</span>}
            </label>))}
          <div className="flex gap-4">{(b.gateways as string[]).map(g => (
            <label key={g} className="flex gap-2 capitalize"><input type="radio" name="gw" checked={provider === g} onChange={() => setProvider(g)} /> {g}</label>))}</div>
          {b.currency === 'USD' && <p className="text-xs text-ink-muted">For payments in US dollars we compare the country of your card with your billing country. If they differ or can’t be confirmed, your payment is held for a quick manual review and you won’t be charged twice.</p>}
          <button onClick={pay} disabled={busy || !provider} className="btn-primary btn w-fit disabled:opacity-50">{busy ? <Loader2 size={14} className="animate-spin" /> : `Pay ${money(Number(opts[cycle].charge), opts.currency)}`}</button>
        </div>)}
    </div>
  )
}