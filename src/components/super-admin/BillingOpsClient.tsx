'use client'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

const naira = (n: any) => n == null ? '—' : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(Number(n))

export default function BillingOpsClient({ canReview, canResolve }: { canReview: boolean; canResolve: boolean }) {
  const supabase = createClient()
  const [tab, setTab] = useState<'orgs' | 'review'>('orgs')
  const [orgs, setOrgs] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState<any>(null)
  const [recon, setRecon] = useState<any[]>([])

  const loadOrgs = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_billing_ops_list', { p_search: search || null })
    if (error) toast.error(error.message); else setOrgs(data ?? [])
  }, [search])
  const loadRecon = useCallback(async () => {
    const { data, error } = await supabase.rpc('list_payment_reconciliation', { p_status: 'needs_review' })
    if (error) toast.error(error.message); else setRecon(data ?? [])
  }, [])
  useEffect(() => { loadOrgs() }, [loadOrgs])
  useEffect(() => { if (tab === 'review') loadRecon() }, [tab, loadRecon])

  async function open(id: string) {
    const { data, error } = await supabase.rpc('get_billing_ops_org', { p_org_id: id })
    if (error) toast.error(error.message); else setDetail(data)
  }
  async function act(fn: 'billing_review_payment' | 'billing_resolve_payment', id: string, choice: string) {
    const note = window.prompt(`Note for "${choice}" (required):`)
    if (!note?.trim()) return
    const args = fn === 'billing_review_payment'
      ? { p_payment_id: id, p_recommendation: choice, p_note: note }
      : { p_payment_id: id, p_decision: choice, p_note: note }
    const { error } = await supabase.rpc(fn, args)
    if (error) toast.error(error.message); else { toast.success('Recorded'); loadRecon(); loadOrgs() }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {(['orgs', 'review'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`btn-sm btn ${tab === t ? 'btn-primary' : 'btn-secondary'}`}>
            {t === 'orgs' ? 'Organizations' : `Needs review (${recon.length || '…'})`}</button>))}
      </div>

      {tab === 'orgs' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="card">
            <div className="card-header"><input className="input" placeholder="Search organizations" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <div className="divide-y divide-surface-100 max-h-[70vh] overflow-y-auto">
              {orgs.map(o => (
                <button key={o.id} onClick={() => open(o.id)} className="w-full text-left p-3 hover:bg-surface-50">
                  <p className="text-sm font-medium text-ink">{o.name} {o.is_test && <span className="badge badge-gray text-[10px]">test</span>}</p>
                  <p className="text-xs text-ink-muted">{o.type} · {o.plan}/{o.status} · {o.verified_students}/{o.total_records} verified students
                    {o.needs_review > 0 && <span className="text-red-600"> · {o.needs_review} needs review</span>}</p>
                  <p className="text-xs text-ink-faint">entitlement: {o.entitlement?.allowed ? 'allowed' : `blocked (${o.entitlement?.reason})`}
                    {o.founding500 && ` · F500 ${o.founding500}`}{o.founding50 && ` · F50 ${o.founding50}`}</p>
                </button>))}
            </div>
          </div>
          <div className="card p-4 text-xs overflow-auto max-h-[70vh]">
            {!detail ? <p className="text-ink-muted">Select an organization.</p> : (
              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold text-ink">{detail.org.name} · {detail.org.type}</p>
                <p>Verified students: <b>{detail.verified_students}</b> of {detail.total_records}. Excluded: {Object.entries(detail.excluded ?? {}).map(([k, v]) => `${k} (${v})`).join(', ') || 'none'}.</p>
                <p>Plan: {detail.org.plan}/{detail.org.status} · tertiary: {detail.org.tertiary_plan ?? '—'} · expires {detail.org.subscription_expires_at ?? '—'}</p>
                <div><p className="font-medium">Entitlement</p>{Object.entries(detail.entitlement).map(([k, v]: any) => <p key={k}>{k}: {v.allowed ? 'allowed' : `blocked (${v.reason})`}</p>)}</div>
                <div><p className="font-medium">Quotes</p>{[...detail.k12_quotes, ...detail.tertiary_quotes].map((q: any) => <p key={q.id}>{q.status} · {naira(q.amount)} · {q.plan ?? q.tier} · {q.period} · students {q.students}{q.billable_quantity ? ` (billed ${q.billable_quantity})` : ''}</p>)}</div>
                <div><p className="font-medium">Payments</p>{detail.payments.map((p: any) => <p key={p.id}>{p.status ?? 'founding'} · {naira(p.amount)} {p.currency} · {p.provider} · {p.reason ?? ''}{p.is_test ? ' · test' : ''}</p>)}</div>
                <div><p className="font-medium">Shadow log</p>{detail.shadow_log.map((s: any, i: number) => <p key={i}>{s.date} · {s.feature} · {s.reason} ×{s.hits}</p>)}</div>
                <div><p className="font-medium">Audit</p>{detail.audit.map((a: any, i: number) => <p key={i}>{String(a.at).slice(0, 16)} · {a.action}{a.reason ? ` — ${a.reason}` : ''}</p>)}</div>
              </div>)}
          </div>
        </div>
      )}

      {tab === 'review' && (
        <div className="card divide-y divide-surface-100">
          {recon.length === 0 && <p className="p-4 text-sm text-ink-muted">Nothing awaiting review.</p>}
          {recon.map(p => (
            <div key={p.id} className="p-3 flex flex-col gap-1 text-sm">
              <p className="font-medium text-ink">{p.organization} · {naira(p.amount)} {p.currency} via {p.provider} {p.is_test && <span className="badge badge-gray text-[10px]">test</span>}</p>
              <p className="text-xs text-ink-muted">Reason: {p.review_reason} · quote {naira(p.quote_amount)} {p.quote_currency} ({p.quote_status}) · {p.period_label ?? ''}</p>
              <p className="text-xs text-ink-faint">Reviewed: {p.reviewed_at ? `${p.review_recommendation}` : 'not yet'}</p>
              <div className="flex gap-2 flex-wrap">
                {canReview && !p.reviewed_at && ['apply', 'reject', 'investigate'].map(c => <button key={c} onClick={() => act('billing_review_payment', p.id, c)} className="btn-secondary btn-sm btn">Recommend {c}</button>)}
                {canResolve && p.reviewed_at && ['apply', 'reject'].map(c => <button key={c} onClick={() => act('billing_resolve_payment', p.id, c)} className="btn-primary btn-sm btn">Confirm {c}</button>)}
              </div>
            </div>))}
        </div>
      )}
    </div>
  )
}