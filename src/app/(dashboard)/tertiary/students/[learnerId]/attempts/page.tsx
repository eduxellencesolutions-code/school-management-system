// FILE: src/app/(dashboard)/tertiary/students/[learnerId]/attempts/page.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AttemptHistory from '@/components/results/AttemptHistory'

type Kind = 'resit' | 'reassessment' | 'repeat'
interface Reg { id: string; label: string }
interface Offer { id: string; label: string; offering_kind: string }
interface RawReg { id: string; subject: { code: string | null; name: string } | { code: string | null; name: string }[] | null; term: { name: string } | { name: string }[] | null }
interface RawOffer { id: string; code: string | null; name: string; offering_kind: string; group: { name: string; type: string; term: { name: string } | { name: string }[] | null } | { name: string; type: string; term: { name: string } | { name: string }[] | null }[] | null }

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null)
}

export default function StudentAttemptsPage() {
  const params = useParams<{ learnerId: string }>()
  const learnerId = params.learnerId
  const supabase = useMemo(() => createClient(), [])
  const [regs, setRegs] = useState<Reg[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [prior, setPrior] = useState('')
  const [kind, setKind] = useState<Kind>('resit')
  const [target, setTarget] = useState('')
  const [busy, setBusy] = useState(false)
  const [refresh, setRefresh] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    const [r, o, l] = await Promise.all([
      supabase.from('course_registrations').select('id, subject:subjects(code, name), term:terms(name)').eq('learner_id', learnerId).eq('status', 'registered'),
      supabase.from('subjects').select('id, code, name, offering_kind, group:groups(name, type, term:terms(name))').not('course_id', 'is', null).order('code'),
      supabase.from('learners').select('first_name, last_name, admission_number').eq('id', learnerId).single(),
    ])
    setRegs(((r.data ?? []) as unknown as RawReg[]).map(x => ({ id: x.id, label: `${one(x.subject)?.code ?? '—'} · ${one(x.subject)?.name ?? ''} (${one(x.term)?.name ?? ''})` })))
    setOffers(
      ((o.data ?? []) as unknown as RawOffer[])
        .filter(x => one(x.group)?.type === 'cohort')
        .map(x => {
          const g = one(x.group)
          return { id: x.id, offering_kind: x.offering_kind, label: `${x.code ?? '—'} · ${x.name} — ${g?.name ?? ''}${one(g?.term)?.name ? ' · ' + one(g?.term)?.name : ''} [${x.offering_kind}]` }
        }),
    )
    const lr = l.data as { first_name: string; last_name: string; admission_number: string } | null
    setName(lr ? `${lr.last_name} ${lr.first_name} (${lr.admission_number})` : '')
    setLoading(false)
  }, [supabase, learnerId])

  useEffect(() => { void load() }, [load])

  const allowed = offers.filter(o => (kind === 'repeat' ? o.offering_kind === 'regular' || o.offering_kind === 'repeat' : o.offering_kind === kind))

  async function submit() {
    setBusy(true)
    const { error } = await supabase.rpc('register_attempt', { p_learner_id: learnerId, p_subject_id: target, p_prior_registration_id: prior, p_kind: kind })
    setBusy(false)
    if (error) { toast.error(error.message); return }
    toast.success('Attempt registered')
    setTarget('')
    setRefresh(n => n + 1)
    await load()
  }

  if (loading) return <div className="p-6 text-sm text-ink-muted flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</div>

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href={`/tertiary/students/${learnerId}/results`} className="text-sm text-brand-600 hover:underline">← Results</Link>
        <h1 className="page-title mt-2 mb-1">Attempts</h1>
        <p className="page-subtitle">{name}</p>
      </div>

      <div className="card">
        <div className="card-header"><h2 className="font-semibold text-sm text-ink">Register a further attempt</h2></div>
        <div className="card-body space-y-3">
          <p className="text-xs text-ink-muted">The earlier attempt needs a published result. A resit or reassessment is registered in an offering of that type; a repeat is registered in a later term. The system never registers a student on its own.</p>
          <label className="block text-sm"><span className="text-ink-muted">Earlier attempt</span>
            <select className="input mt-1" value={prior} onChange={e => setPrior(e.target.value)}>
              <option value="">Choose…</option>{regs.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </label>
          <label className="block text-sm"><span className="text-ink-muted">Type of attempt</span>
            <select className="input mt-1" value={kind} onChange={e => { setKind(e.target.value as Kind); setTarget('') }}>
              <option value="resit">Resit (same term)</option><option value="reassessment">Reassessment</option><option value="repeat">Repeat (later term)</option>
            </select>
          </label>
          <label className="block text-sm"><span className="text-ink-muted">Course offering</span>
            <select className="input mt-1" value={target} onChange={e => setTarget(e.target.value)}>
              <option value="">Choose…</option>{allowed.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>
          {allowed.length === 0 && <p className="text-xs text-amber-700">No linked {kind} offerings exist yet. Link one in the course catalogue first.</p>}
          <button className="btn-primary btn btn-sm" disabled={busy || !prior || !target} onClick={() => void submit()}>{busy ? 'Saving…' : 'Register attempt'}</button>
        </div>
      </div>

      <AttemptHistory key={refresh} learnerId={learnerId} showAll />
    </div>
  )
}