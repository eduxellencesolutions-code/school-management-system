// src/components/super-admin/FoundingInstitutionsQueue.tsx
'use client'
import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

const STATUS_LABEL: Record<string, string> = {
  interested: 'Interested', applied: 'Applied', under_review: 'Under review', qualified: 'Qualified',
  pilot_active: 'Pilot active', pilot_complete: 'Pilot complete', converted: 'Converted',
  rejected: 'Rejected', withdrawn: 'Withdrawn', lapsed: 'Lapsed',
}

const money = (n: number | string | null | undefined, cur: string | null | undefined) =>
  `${cur === 'USD' ? '$' : '₦'}${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
const day = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-NG') : '—')

export default function FoundingInstitutionsQueue() {
  const [apps, setApps] = useState<any[]>([])
  const [campaign, setCampaign] = useState<any | null>(null)
  const [pricing, setPricing] = useState<{ tiers: any[]; prices: any[] }>({ tiers: [], prices: [] })
  const [placesRemaining, setPlacesRemaining] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [linkTarget, setLinkTarget] = useState<any | null>(null)
  const [agreementTarget, setAgreementTarget] = useState<any | null>(null)

  async function load() {
    const res = await fetch('/api/platform-staff/founding-institutions')
    const data = await res.json()
    setApps(data.applications ?? [])
    setCampaign(data.campaign ?? null)
    setPricing(data.pricing ?? { tiers: [], prices: [] })
    setPlacesRemaining(data.placesRemaining ?? null)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function post(id: string, payload: Record<string, unknown>): Promise<boolean> {
    setBusyId(id)
    const res = await fetch(`/api/platform-staff/founding-institutions/${id}/action`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    const json = await res.json()
    setBusyId(null)
    if (json.error) { alert(json.error); return false }
    await load()
    return true
  }

  // prompt helper: undefined = cancelled (or empty when required)
  function ask(message: string, required: boolean): string | undefined {
    const v = prompt(message)
    if (v === null) return undefined
    if (required && !v.trim()) return undefined
    return v.trim()
  }

  async function qualify(a: any) {
    const notes = ask('Review notes (optional):', false)
    if (notes === undefined) return
    await post(a.id, { action: 'qualify', reason: notes })
  }
  async function reject(a: any) {
    const reason = ask('Reason for rejection (required):', true)
    if (!reason) return
    await post(a.id, { action: 'reject', reason })
  }
  async function startPilot(a: any) {
    const days = campaign?.pilotDays ? ` It will run for ${campaign.pilotDays} days.` : ''
    if (!confirm(`Start the pilot for ${a.institution_name}?${days}`)) return
    await post(a.id, { action: 'start_pilot' })
  }
  async function completePilot(a: any) {
    const notes = ask('Pilot notes (optional):', false)
    if (notes === undefined) return
    await post(a.id, { action: 'complete_pilot', reason: notes })
  }
  async function waive(a: any) {
    const reason = ask('Reason for waiving the conversion fee (required). No payment is taken and no commission is paid.', true)
    if (!reason) return
    if (!confirm(`Convert ${a.institution_name} WITHOUT payment? The referring representative will earn no commission.`)) return
    await post(a.id, { action: 'waive', reason })
  }
  async function close(a: any) {
    const outcome = ['pilot_active', 'pilot_complete'].includes(a.status) ? 'lapsed' : 'withdrawn'
    const reason = ask(`Reason for marking this application ${outcome} (required). This releases the founding place.`, true)
    if (!reason) return
    await post(a.id, { action: 'close', outcome, reason })
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <div className="flex flex-col gap-4">
      {placesRemaining !== null && (
        <p className="text-sm text-ink-muted">{placesRemaining} founding place{placesRemaining === 1 ? '' : 's'} remaining</p>
      )}
      {campaign && campaign.status !== 'active' && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded p-2">
          The campaign is <strong>{campaign.status}</strong>: the public application page is closed.
        </p>
      )}

      <div className="card divide-y divide-surface-100">
        {apps.length === 0 ? <p className="p-6 text-sm text-ink-muted text-center">No applications.</p> : apps.map(a => {
          const busy = busyId === a.id
          const canEditAgreement = !a.agreed_locked_at && ['qualified', 'pilot_active', 'pilot_complete', 'converted'].includes(a.status)
          const needsAgreement = ['pilot_active', 'pilot_complete'].includes(a.status) && !a.agreed_tier_key
          return (
            <div key={a.id} className="p-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="flex flex-col gap-1 text-sm">
                <p className="font-medium">
                  {a.institution_name}
                  <span className="text-ink-faint font-normal">
                    {' '}· {a.institution_type ?? 'type not given'}
                    {a.estimated_student_count ? ` · ~${Number(a.estimated_student_count).toLocaleString()} students` : ''}
                  </span>
                </p>
                <p className="text-xs text-ink-muted">
                  {a.contact_name} · {a.contact_email}{a.contact_phone ? ` · ${a.contact_phone}` : ''}
                </p>
                <p className="text-xs text-ink-faint">
                  <span className="font-medium text-ink-muted">Founding programme status:</span> {STATUS_LABEL[a.status] ?? a.status}
                  {' '}· applied {day(a.created_at)}{a.status_reason && ` · ${a.status_reason}`}
                </p>
                <p className="text-xs text-ink-faint">
                  <span className="font-medium text-ink-muted">Referred by:</span>{' '}
                  {a.representative
                    ? `${a.representative.full_name} (${a.representative.referral_code})${a.referral_id ? '' : a.organization_id ? ' — referral not linked' : ' — linked when the organization is linked'}`
                    : a.referral_code
                      ? `code "${a.referral_code}" did not match an active representative — no commission will be paid`
                      : 'no referral'}
                </p>
                {a.organization && (
                  <p className="text-xs text-ink-faint">
                    <span className="font-medium text-ink-muted">Organization:</span> {a.organization.name}
                    {' '}· <span className="font-medium text-ink-muted">Subscription (separate from the programme):</span>{' '}
                    {a.organization.tertiary_plan ?? 'no plan'} / {a.organization.subscription_status}
                    {a.organization.subscription_expires_at ? ` · expires ${day(a.organization.subscription_expires_at)}` : ''}
                  </p>
                )}
                {a.agreed_tier_key && (
                  <p className="text-xs text-ink-faint">
                    <span className="font-medium text-ink-muted">Agreed terms:</span> {a.agreed_tier_key} · {money(a.agreed_price_per_student_per_term, a.agreed_currency)} per student per term
                    {' '}· {a.agreed_locked_at ? `accepted ${day(a.agreed_locked_at)}` : 'awaiting the institution’s acceptance'}
                  </p>
                )}
                {(a.pilot_started_at || a.pilot_ends_at) && (
                  <p className="text-xs text-ink-faint">
                    <span className="font-medium text-ink-muted">Pilot:</span> {day(a.pilot_started_at)} → {day(a.pilot_ends_at)}
                  </p>
                )}
                {a.converted_at && (
                  <p className="text-xs text-ink-faint">
                    <span className="font-medium text-ink-muted">Converted:</span> {day(a.converted_at)} · {a.conversion_type === 'waiver' ? `waived — ${a.waiver_reason}` : 'paid'}
                  </p>
                )}
                {needsAgreement && (
                  <p className="text-xs text-amber-700">No agreement set — set the terms before this institution converts.</p>
                )}
                {a.status === 'pilot_complete' && (
                  <p className="text-xs text-ink-faint">
                    Waiting for the institution to pay the {money(campaign?.feeAmount, campaign?.feeCurrency)} conversion fee, or waive it.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 md:justify-end">
                {a.status === 'applied' && (
                  <button disabled={busy} onClick={() => post(a.id, { action: 'start_review' })} className="btn-sm btn bg-blue-50 text-blue-600">Start review</button>
                )}
                {a.status === 'under_review' && (
                  <>
                    <button disabled={busy} onClick={() => qualify(a)} className="btn-sm btn bg-green-50 text-green-600">Qualify</button>
                    <button disabled={busy} onClick={() => reject(a)} className="btn-sm btn bg-red-50 text-red-600">Reject</button>
                  </>
                )}
                {['qualified', 'pilot_active'].includes(a.status) && !a.organization_id && (
                  <button disabled={busy} onClick={() => setLinkTarget(a)} className="btn-sm btn bg-blue-50 text-blue-600">Link organization</button>
                )}
                {canEditAgreement && (
                  <button disabled={busy} onClick={() => setAgreementTarget(a)} className="btn-sm btn bg-surface-100 text-ink-muted">
                    {a.agreed_tier_key ? 'Edit agreement' : 'Set agreement'}
                  </button>
                )}
                {a.status === 'qualified' && a.organization_id && (
                  <button disabled={busy} onClick={() => startPilot(a)} className="btn-primary btn-sm btn">Start pilot</button>
                )}
                {a.status === 'pilot_active' && (
                  <button disabled={busy} onClick={() => completePilot(a)} className="btn-primary btn-sm btn">Complete pilot</button>
                )}
                {a.status === 'pilot_complete' && (
                  <button disabled={busy} onClick={() => waive(a)} className="btn-sm btn bg-amber-50 text-amber-700">Waive conversion</button>
                )}
                {['applied', 'qualified', 'pilot_active', 'pilot_complete'].includes(a.status) && (
                  <button disabled={busy} onClick={() => close(a)} className="btn-sm btn bg-red-50 text-red-600">
                    {['pilot_active', 'pilot_complete'].includes(a.status) ? 'Mark lapsed' : 'Withdraw'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {linkTarget && (
        <LinkOrgModal
          app={linkTarget}
          onClose={() => setLinkTarget(null)}
          onLink={async (orgId: string) => {
            if (await post(linkTarget.id, { action: 'link_organization', organizationId: orgId })) setLinkTarget(null)
          }}
        />
      )}
      {agreementTarget && (
        <AgreementModal
          app={agreementTarget}
          pricing={pricing}
          onClose={() => setAgreementTarget(null)}
          onSave={async (terms: { tierKey: string; price: number; currency: string }) => {
            if (await post(agreementTarget.id, { action: 'set_agreement', ...terms })) setAgreementTarget(null)
          }}
        />
      )}
    </div>
  )
}

function LinkOrgModal({ app, onClose, onLink }: { app: any; onClose: () => void; onLink: (orgId: string) => Promise<void> }) {
  const [q, setQ] = useState(app.contact_email ?? '')
  const [results, setResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  async function search(term: string) {
    setSearching(true)
    const res = await fetch(`/api/platform-staff/founding-institutions/${app.id}/candidates?q=${encodeURIComponent(term)}`)
    const json = await res.json()
    setResults(json.candidates ?? [])
    setSearching(false)
  }
  useEffect(() => { search(q) }, [])

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-5 max-w-lg w-full flex flex-col gap-3 max-h-[85vh] overflow-y-auto">
        <p className="font-semibold text-ink">Link an organization to {app.institution_name}</p>
        <p className="text-xs text-ink-faint">
          The applicant’s email is {app.contact_email}. Only link an organization you have verified belongs to this institution.
          The link cannot be changed from this screen.
        </p>
        <div className="flex gap-2">
          <input className="input flex-1" value={q} onChange={e => setQ(e.target.value)} placeholder="Organization name or admin email" />
          <button onClick={() => search(q)} className="btn-primary btn-sm btn">Search</button>
        </div>
        {searching ? <div className="p-4 flex justify-center"><Loader2 className="animate-spin" /></div> : (
          <div className="divide-y divide-surface-100 border border-surface-100 rounded">
            {results.length === 0 && <p className="p-3 text-xs text-ink-muted">No matching university organizations.</p>}
            {results.map(c => (
              <div key={c.id} className="p-3 flex items-center justify-between gap-3">
                <div className="text-sm">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-ink-faint">
                    admin: {c.admin_email ?? 'none'} · plan: {c.tertiary_plan ?? 'none'}
                  </p>
                  {c.email_matches && <p className="text-xs text-green-600">✓ A user on this organization has the applicant’s email</p>}
                </div>
                <button
                  className="btn-sm btn bg-blue-50 text-blue-600"
                  onClick={() => { if (confirm(`Link "${c.name}" to ${app.institution_name}? This cannot be undone from this screen.`)) onLink(c.id) }}
                >
                  Link
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end">
          <button onClick={onClose} className="btn-sm btn bg-surface-100 text-ink-muted">Close</button>
        </div>
      </div>
    </div>
  )
}

function AgreementModal({ app, pricing, onClose, onSave }: {
  app: any; pricing: { tiers: any[]; prices: any[] }; onClose: () => void
  onSave: (terms: { tierKey: string; price: number; currency: string }) => Promise<void>
}) {
  const currencies = Array.from(new Set((pricing.prices ?? []).map((p: any) => p.currency))) as string[]
  const tiers = pricing.tiers ?? []
  const [currency, setCurrency] = useState<string>(app.agreed_currency ?? currencies[0] ?? 'NGN')
  const [tierKey, setTierKey] = useState<string>(app.agreed_tier_key ?? tiers[0]?.tier_key ?? '')
  const [price, setPrice] = useState<string>(app.agreed_price_per_student_per_term != null ? String(app.agreed_price_per_student_per_term) : '')
  const standard = (pricing.prices ?? []).find((p: any) => p.tier_key === tierKey && p.currency === currency)?.price_per_student_per_term

  function save() {
    const n = Number(price)
    if (!tierKey || !Number.isFinite(n) || n < 0) { alert('Choose a tier and enter a price of 0 or more'); return }
    onSave({ tierKey, price: n, currency })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-5 max-w-md w-full flex flex-col gap-3">
        <p className="font-semibold text-ink">Founding agreement for {app.institution_name}</p>
        <p className="text-xs text-ink-faint">
          These terms apply to the institution’s first subscription payment only. Later renewals follow the standard plans and prices.
          The institution must accept them before they lock.
        </p>
        <label className="text-xs font-medium text-ink-muted">Plan tier</label>
        <select className="input" value={tierKey} onChange={e => setTierKey(e.target.value)}>
          {tiers.map((t: any) => <option key={t.tier_key} value={t.tier_key}>{t.name}</option>)}
        </select>
        <label className="text-xs font-medium text-ink-muted">Currency</label>
        <select className="input" value={currency} onChange={e => setCurrency(e.target.value)}>
          {(currencies.length ? currencies : ['NGN']).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="text-xs font-medium text-ink-muted">Agreed price per student per term</label>
        <input className="input" type="number" min={0} step="0.01" value={price} onChange={e => setPrice(e.target.value)}
               placeholder={standard != null ? `Standard price: ${money(standard, currency)}` : 'Enter the agreed price'} />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-sm btn bg-surface-100 text-ink-muted">Cancel</button>
          <button onClick={save} className="btn-primary btn-sm btn">Save agreement</button>
        </div>
      </div>
    </div>
  )
}