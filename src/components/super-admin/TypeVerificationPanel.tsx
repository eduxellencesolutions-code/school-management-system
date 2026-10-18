'use client'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

const LABEL: Record<string, string> = { school: 'School (K-12)', centre: 'Training / tutorial centre', university: 'University / Polytechnic / College' }
const FLAG: Record<string, string> = {
  has_payment_history: 'Has payment history', founding_500: 'Founding 500', tertiary_data_but_not_university: 'Has university records but is not declared a university',
  training_data_but_not_centre: 'Has training data but is not declared a centre', k12_classes_but_not_school: 'Has K-12 classes but is not declared a school',
  tertiary_plan_but_not_university: 'Has a tertiary plan but is not a university', plan_not_eligible_for_type: 'Current plan does not fit its type', test_organization: 'Test organization',
  billing_country_missing: 'Billing country not set',
}

export default function TypeVerificationPanel() {
  const supabase = createClient()
  const [filter, setFilter] = useState<'unverified' | 'verified' | 'all'>('unverified')
  const [rows, setRows] = useState<any[]>([])
  const [pick, setPick] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_type_verification_queue', { p_status: filter })
    if (error) toast.error(error.message); else setRows(data ?? [])
  }, [filter])
  useEffect(() => { load() }, [load])

  async function decide(row: any, decision: 'confirmed' | 'corrected') {
    const type = decision === 'confirmed' ? row.declared_type : pick[row.id]
    if (!type || (decision === 'corrected' && type === row.declared_type)) { toast.error('Choose a different type to correct it'); return }
    const reason = window.prompt(`${decision === 'confirmed' ? 'Confirm' : 'Correct'} "${row.name}" as ${LABEL[type]}.\nWhat did you check? (required)`)
    if (!reason?.trim()) return
    const { error } = await supabase.rpc('super_admin_verify_organization_type', { p_org_id: row.id, p_type: type, p_decision: decision, p_reason: reason })
    if (error) toast.error(error.message); else { toast.success('Recorded'); load() }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {(['unverified', 'verified', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`btn-sm btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}>{f}</button>))}
      </div>
      <div className="card divide-y divide-surface-100">
        {rows.length === 0 && <p className="p-4 text-sm text-ink-muted">Nothing to review.</p>}
        {rows.map(o => (
          <div key={o.id} className="p-3 flex flex-col gap-1 text-sm">
            <p className="font-medium text-ink">{o.name} <span className="text-xs text-ink-muted">· declared: {LABEL[o.declared_type]} · {o.status}</span></p>
            <p className="text-xs text-ink-muted">{o.admin_contact ?? 'no admin contact'} · plan {o.plan}/{o.plan_status} · {o.learners} learners · {o.classes} classes · {o.cohorts} cohorts · {o.batches} batches · {o.programmes} programmes · {o.tertiary_records} university records · {o.payments} payments</p>
            {o.flags?.length > 0 && <p className="text-xs text-amber-700">{o.flags.map((f: string) => FLAG[f] ?? f).join(' · ')}</p>}
            <BillingProfile org={o} onSaved={load} />
            {o.status === 'verified' && <p className="text-xs text-ink-faint">Verified {String(o.type_verified_at).slice(0, 10)} ({o.decision}): {o.reason}</p>}
            {o.status !== 'verified' && (
              <div className="flex gap-2 flex-wrap items-center">
                <button onClick={() => decide(o, 'confirmed')} className="btn-primary btn-sm btn">Confirm as {LABEL[o.declared_type]}</button>
                <select className="input max-w-[220px]" value={pick[o.id] ?? ''} onChange={e => setPick(p => ({ ...p, [o.id]: e.target.value }))}>
                  <option value="">Correct to…</option>
                  {['school', 'centre', 'university'].filter(t => t !== o.declared_type).map(t => <option key={t} value={t}>{LABEL[t]}</option>)}
                </select>
                <button onClick={() => decide(o, 'corrected')} className="btn-secondary btn-sm btn">Correct</button>
              </div>)}
          </div>))}
      </div>
    </div>
  )
}

function BillingProfile({ org, onSaved }: { org: any; onSaved: () => void }) {
  const supabase = createClient()
  const [country, setCountry] = useState(org.billing_country ?? '')
  const [treat, setTreat] = useState(org.tax_treatment ?? 'unreviewed')
  const [taxId, setTaxId] = useState(org.tax_id ?? '')
  async function save() {
    const reason = window.prompt(`Billing country ${country.toUpperCase()} and tax treatment "${treat}" for "${org.name}". What did you check? (required)`)
    if (!reason?.trim()) return
    const { error } = await supabase.rpc('super_admin_set_billing_profile', { p_org_id: org.id, p_country: country, p_reason: reason, p_tax_treatment: treat, p_tax_id: taxId || null })
    if (error) toast.error(error.message); else { toast.success('Billing profile saved'); onSaved() }
  }
  return (
    <div className="flex gap-2 flex-wrap items-center text-xs">
      <span className="text-ink-muted">Billing: {org.billing_country ?? 'not set'} {org.billing_currency ? `(${org.billing_currency})` : ''}</span>
      <input className="input w-16" placeholder="NG" maxLength={2} value={country} onChange={e => setCountry(e.target.value.toUpperCase())} />
      <select className="input w-44" value={treat} onChange={e => setTreat(e.target.value)}>
        {['unreviewed', 'standard_vat', 'zero_rated_export', 'exempt', 'not_applicable'].map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
      </select>
      <input className="input w-36" placeholder="Tax ID (optional)" value={taxId} onChange={e => setTaxId(e.target.value)} />
      <button onClick={save} className="btn-secondary btn-sm btn">Save billing profile</button>
    </div>
  )
}