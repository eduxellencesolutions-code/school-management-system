// FILE: src/app/(dashboard)/settings/tertiary-grading/page.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'

const OUTCOMES = [
  { value: 'pass', label: 'Pass' },
  { value: 'fail', label: 'Fail' },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'deferred', label: 'Deferred' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'exempt', label: 'Exempt' },
]
const SCALES = [
  { value: '4_point', label: '4-point scale (maximum 4.0)' },
  { value: '5_point', label: '5-point scale (maximum 5.0)' },
  { value: '7_point', label: '7-point scale (maximum 7.0)' },
]

export default function TertiaryGradingSetupPage() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [configs, setConfigs] = useState<any[]>([])
  const [defs, setDefs] = useState<any[]>([])
  const [terms, setTerms] = useState<any[]>([])
  const [mappings, setMappings] = useState<any[]>([])
  const [drafts, setDrafts] = useState<Record<string, { outcome: string; reason: string }>>({})
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [o, r] = await Promise.all([supabase.rpc('get_my_org_id'), supabase.rpc('get_my_role')])
    if (o.error || !o.data) {
      setError(o.error?.message ?? 'No institution is linked to this login.')
      setLoading(false)
      return
    }
    const org = o.data as string
    setOrgId(org)
    setRole((r.data as string) ?? null)

    const [c, d, t, m] = await Promise.all([
      supabase.from('grading_scale_configs').select('id, scale_type, name, max_point, is_active').order('scale_type'),
      supabase.from('grading_systems').select('id, scale_type, grade_letter, min_score, max_score, points, remark').neq('scale_type', 'school'),
      supabase.from('terms')
        .select('id, name, status, start_date, tertiary_grading_scale_config_id, session:academic_sessions(name)')
        .eq('organization_id', org)
        .order('start_date', { ascending: true, nullsFirst: false }),
      supabase.from('grade_outcome_mappings')
        .select('id, grading_scale_config_id, grade_letter, grade_point, band_min, band_max, grade_remark, version, outcome, reason')
        .order('version', { ascending: false }),
    ])
    const firstError = c.error || d.error || t.error || m.error
    if (firstError) setError(firstError.message)
    setConfigs(c.data ?? [])
    setDefs(d.data ?? [])
    setTerms(t.data ?? [])
    setMappings(m.data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const active = configs.find(c => c.is_active) ?? null
  const activeDefs = active
    ? defs.filter(d => d.scale_type === active.scale_type).sort((a, b) => Number(b.min_score) - Number(a.min_score))
    : []

  function latestMapping(d: any) {
    if (!active) return null
    return mappings.find(m => m.grading_scale_config_id === active.id && m.grade_letter === d.grade_letter) ?? null
  }
  function stateOf(d: any): 'unmapped' | 'mapped' | 'stale' {
    const m = latestMapping(d)
    if (!m) return 'unmapped'
    const same =
      Number(m.grade_point) === Number(d.points) &&
      Number(m.band_min) === Number(d.min_score) &&
      Number(m.band_max) === Number(d.max_score) &&
      (m.grade_remark ?? null) === (d.remark ?? null)
    return same ? 'mapped' : 'stale'
  }

  async function call(key: string, fn: () => PromiseLike<{ error: any }>, okMessage: string) {
    setBusy(key)
    const { error: e } = await fn()
    setBusy(null)
    if (e) { toast.error(e.message); return }
    toast.success(okMessage)
    await load()
  }

  const createScale = (s: string) =>
    call('create-' + s, () => supabase.rpc('create_tertiary_grading', { p_org_id: orgId, p_scale: s }), 'Scale created')
  const activate = (type: string) =>
    call('act-' + type, () => supabase.rpc('set_active_tertiary_grading_scale', { p_org_id: orgId, p_scale_type: type }), 'Scale activated')
  const bindTerm = (id: string) =>
    call('bind-' + id, () => supabase.rpc('bind_term_grading_scale', { p_term_id: id }), 'Term bound to the active scale')

  function saveMapping(d: any) {
    const dr = drafts[d.grade_letter]
    if (!active) return
    if (!dr?.outcome) { toast.error('Choose an outcome first'); return }
    if (!dr.reason?.trim()) { toast.error('Enter the reason or the regulation reference'); return }
    return call(
      'map-' + d.grade_letter,
      () => supabase.rpc('set_grade_outcome_mapping', {
        p_config_id: active.id, p_grade_letter: d.grade_letter, p_outcome: dr.outcome, p_reason: dr.reason.trim(),
      }),
      `Grade ${d.grade_letter} saved`,
    )
  }
  function setDraft(letter: string, patch: Partial<{ outcome: string; reason: string }>) {
    setDrafts(prev => ({ ...prev, [letter]: { outcome: prev[letter]?.outcome ?? '', reason: prev[letter]?.reason ?? '', ...patch } }))
  }

  if (loading) return <div className="p-6 text-sm text-ink-muted flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</div>
  if (error && !orgId) return <div className="card p-6"><p className="text-sm text-red-600">{error}</p></div>
  if (role !== 'admin') {
    return <div className="card p-6"><p className="text-sm text-ink-muted">Only an institution administrator can set up grading.</p></div>
  }

  const unmapped = activeDefs.filter(d => stateOf(d) !== 'mapped').length
  const openTerms = terms.filter(t => !['closed', 'archived'].includes(t.status))
  const unbound = openTerms.filter(t => !t.tertiary_grading_scale_config_id).length
  const ready = !!active && unmapped === 0 && unbound === 0

  return (
    <div className="max-w-4xl">
      <h1 className="page-title mb-1">Tertiary grading setup</h1>
      <p className="page-subtitle mb-4">Lecturers cannot submit results until every grade has an outcome and the term has a grading scale.</p>

      <div className={`card p-4 mb-6 flex items-start gap-3 ${ready ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}`}>
        {ready ? <CheckCircle2 size={18} className="text-green-700 mt-0.5" /> : <AlertTriangle size={18} className="text-amber-700 mt-0.5" />}
        <div className="text-sm">
          {ready ? (
            <p className="font-medium text-green-800">Ready: results can be submitted for all open terms.</p>
          ) : (
            <>
              <p className="font-medium text-amber-900">Not ready for grading yet</p>
              <ul className="mt-1 list-disc pl-5 text-amber-900">
                {!active && <li>No active grading scale.</li>}
                {active && unmapped > 0 && <li>{unmapped} grade(s) have no current outcome.</li>}
                {unbound > 0 && <li>{unbound} open term(s) are not bound to a scale.</li>}
              </ul>
            </>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="card mb-6">
        <div className="card-header"><h2 className="font-semibold text-sm text-ink">1. Grading scale</h2></div>
        <div className="card-body">
          {configs.length > 0 && (
            <table className="table mb-4">
              <thead><tr><th>Scale</th><th>Status</th><th /></tr></thead>
              <tbody>
                {configs.map(c => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.is_active ? <span className="badge-green">Active</span> : <span className="badge-gray">Inactive</span>}</td>
                    <td className="text-right">
                      {!c.is_active && (
                        <button className="btn-secondary btn-sm btn" disabled={busy === 'act-' + c.scale_type} onClick={() => activate(c.scale_type)}>
                          Make active
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-xs text-ink-muted mb-2">Add a scale (the grade bands can be reviewed below before any results exist):</p>
          <div className="flex flex-wrap gap-2">
            {SCALES.filter(s => !configs.some(c => c.scale_type === 'tertiary_' + s.value)).map(s => (
              <button key={s.value} className="btn-secondary btn-sm btn" disabled={busy === 'create-' + s.value} onClick={() => createScale(s.value)}>
                Create {s.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-muted mt-3">The institution&apos;s scale cannot be switched once finalised results exist in an open session.</p>
        </div>
      </div>

      <div className="card mb-6">
        <div className="card-header">
          <h2 className="font-semibold text-sm text-ink">2. What each grade means for your institution</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Nothing is assumed. Record the outcome your approved regulations give each grade, with the reference. Changing an outcome later never alters published results.
          </p>
        </div>
        {!active ? (
          <div className="card-body"><p className="text-sm text-ink-muted">Create or activate a scale first.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Grade</th><th>Band</th><th>Points</th><th>Remark</th><th>Current</th><th>Outcome</th><th>Reason or regulation</th><th /></tr></thead>
              <tbody>
                {activeDefs.map(d => {
                  const st = stateOf(d)
                  const m = latestMapping(d)
                  const dr = drafts[d.grade_letter]
                  return (
                    <tr key={d.id}>
                      <td className="font-semibold">{d.grade_letter}</td>
                      <td className="font-mono text-xs">{Number(d.min_score)}–{Number(d.max_score)}</td>
                      <td>{Number(d.points)}</td>
                      <td>{d.remark}</td>
                      <td>
                        {st === 'mapped' && <span className="badge-green">{OUTCOMES.find(o => o.value === m.outcome)?.label} (v{m.version})</span>}
                        {st === 'stale' && <span className="badge-amber">Out of date (definition changed)</span>}
                        {st === 'unmapped' && <span className="badge-red">Not set</span>}
                      </td>
                      <td>
                        <select className="input w-36" value={dr?.outcome ?? ''} onChange={e => setDraft(d.grade_letter, { outcome: e.target.value })}>
                          <option value="">Choose…</option>
                          {OUTCOMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>
                      <td><input className="input w-56" placeholder="e.g. Senate regulation 4.2" value={dr?.reason ?? ''} onChange={e => setDraft(d.grade_letter, { reason: e.target.value })} /></td>
                      <td className="text-right">
                        <button className="btn-primary btn-sm btn" disabled={busy === 'map-' + d.grade_letter} onClick={() => saveMapping(d)}>Save</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card mb-6">
        <div className="card-header"><h2 className="font-semibold text-sm text-ink">3. Terms</h2></div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Term</th><th>Session</th><th>Status</th><th>Grading scale</th><th /></tr></thead>
            <tbody>
              {terms.map(t => {
                const cfg = configs.find(c => c.id === t.tertiary_grading_scale_config_id)
                const sessionName = Array.isArray(t.session) ? t.session[0]?.name : t.session?.name
                const closed = ['closed', 'archived'].includes(t.status)
                return (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td>{sessionName ?? '—'}</td>
                    <td>{t.status}</td>
                    <td>{cfg ? cfg.name : <span className="text-amber-700">Not bound</span>}</td>
                    <td className="text-right">
                      {!cfg && !closed && active && (
                        <button className="btn-secondary btn-sm btn" disabled={busy === 'bind-' + t.id} onClick={() => bindTerm(t.id)}>
                          Bind to active scale
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {terms.length === 0 && <tr><td colSpan={5} className="text-ink-muted">No terms yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="px-5 py-3 text-xs text-ink-muted border-t border-surface-200">
          A term cannot be re-bound once it has graded or submitted results; return them first.
        </p>
      </div>
    </div>
  )
}