'use client'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

export default function BillingSettingsPanel() {
  const supabase = createClient()
  const [t, setT] = useState<any>(null)
  const [countries, setCountries] = useState<any[]>([])
  const [gw, setGw] = useState({ gateway: 'paystack', country: '', supported: true, note: '' })
  const load = useCallback(async () => {
    const a = await supabase.rpc('get_tax_settings'); if (a.error) toast.error(a.error.message); else setT(a.data.settings)
    const b = await supabase.rpc('get_gateway_countries'); if (!b.error) setCountries(b.data ?? [])
  }, [])
  useEffect(() => { load() }, [load])
  async function saveTax() {
    const reason = window.prompt('Reason for this tax settings change (required):'); if (!reason?.trim()) return
    const { error } = await supabase.rpc('super_admin_set_tax_settings', { p_vat_registered: t.vat_registered, p_vat_rate: Number(t.vat_rate), p_effective_from: t.vat_effective_from || null,
      p_prices_inclusive: t.prices_tax_inclusive, p_registration_number: t.vat_registration_number || null, p_auto_apply: t.auto_apply_vat, p_reason: reason })
    if (error) toast.error(error.message); else { toast.success('Saved'); load() }
  }
  async function saveGw() {
    const { error } = await supabase.rpc('super_admin_set_gateway_country', { p_gateway: gw.gateway, p_country: gw.country, p_supported: gw.supported, p_note: gw.note })
    if (error) toast.error(error.message); else { toast.success('Saved'); setGw({ ...gw, country: '', note: '' }); load() }
  }
  if (!t) return null
  const set = (k: string, v: any) => setT({ ...t, [k]: v })
  return (
    <div className="flex flex-col gap-4">
      <div className="card p-4 flex flex-col gap-2 text-sm">
        <h3 className="font-semibold">Tax settings (all off by default)</h3>
        <label className="flex gap-2"><input type="checkbox" checked={t.vat_registered} onChange={e => set('vat_registered', e.target.checked)} /> VAT registered</label>
        <div className="flex gap-2 flex-wrap items-center">
          <input className="input w-24" value={t.vat_rate} onChange={e => set('vat_rate', e.target.value)} /> %
          <input type="date" className="input w-44" value={t.vat_effective_from ?? ''} onChange={e => set('vat_effective_from', e.target.value)} />
          <select className="input w-52" value={t.prices_tax_inclusive == null ? '' : String(t.prices_tax_inclusive)} onChange={e => set('prices_tax_inclusive', e.target.value === '' ? null : e.target.value === 'true')}>
            <option value="">Inclusive or exclusive: undecided</option><option value="true">Prices include tax</option><option value="false">Prices exclude tax</option></select>
          <input className="input w-52" placeholder="VAT registration number" value={t.vat_registration_number ?? ''} onChange={e => set('vat_registration_number', e.target.value)} />
        </div>
        <label className="flex gap-2"><input type="checkbox" checked={t.auto_apply_vat} onChange={e => set('auto_apply_vat', e.target.checked)} /> Apply VAT automatically (needs registration, date, number and tax-inclusive prices)</label>
        <button onClick={saveTax} className="btn-primary btn-sm btn w-fit">Save tax settings</button>
      </div>
      <div className="card p-4 flex flex-col gap-2 text-sm">
        <h3 className="font-semibold">Gateway countries</h3>
        <div className="flex gap-2 flex-wrap items-center">
          <select className="input w-36" value={gw.gateway} onChange={e => setGw({ ...gw, gateway: e.target.value })}><option>paystack</option><option>flutterwave</option></select>
          <input className="input w-16" maxLength={2} placeholder="GB" value={gw.country} onChange={e => setGw({ ...gw, country: e.target.value.toUpperCase() })} />
          <label className="flex gap-1"><input type="checkbox" checked={gw.supported} onChange={e => setGw({ ...gw, supported: e.target.checked })} /> supported</label>
          <input className="input w-64" placeholder="How was this verified? (required)" value={gw.note} onChange={e => setGw({ ...gw, note: e.target.value })} />
          <button onClick={saveGw} className="btn-secondary btn-sm btn">Save</button>
        </div>
        {countries.map(c => <p key={c.gateway + c.country_code} className="text-xs text-ink-muted">{c.gateway} · {c.country_code} · {c.is_supported ? 'supported' : 'not supported'} · {c.note}</p>)}
      </div>
    </div>
  )
}