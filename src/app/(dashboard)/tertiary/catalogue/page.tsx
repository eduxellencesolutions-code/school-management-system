// FILE: src/app/(dashboard)/tertiary/catalogue/page.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Course { id: string; code: string; title: string; is_active: boolean }
interface Offering { id: string; code: string | null; name: string; course_id: string | null; offering_kind: string; group_name: string }
interface Equiv { id: string; from_course_id: string; to_course_id: string; relation: string; reason: string; revoked_at: string | null }
interface RawGroup { name: string; type: string }
interface RawOffering { id: string; code: string | null; name: string; course_id: string | null; offering_kind: string; group: RawGroup | RawGroup[] | null }

const RELATIONS = ['same', 'replaced_by', 'merged_into', 'split_into', 'substitute_for']
const KINDS = ['regular', 'resit', 'reassessment', 'repeat']

export default function CourseCataloguePage() {
  const supabase = useMemo(() => createClient(), [])
  const [courses, setCourses] = useState<Course[]>([])
  const [offerings, setOfferings] = useState<Offering[]>([])
  const [equivs, setEquivs] = useState<Equiv[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [links, setLinks] = useState<Record<string, { course: string; kind: string }>>({})
  const [eq, setEq] = useState({ from: '', to: '', relation: 'same', reason: '' })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [c, o, e] = await Promise.all([
      supabase.from('tertiary_courses').select('id, code, title, is_active').order('code'),
      supabase.from('subjects').select('id, code, name, course_id, offering_kind, group:groups(name, type)').order('code').limit(500),
      supabase.from('tertiary_course_equivalencies').select('id, from_course_id, to_course_id, relation, reason, revoked_at').order('approved_at', { ascending: false }),
    ])
    const first = c.error || o.error || e.error
    if (first) setError(first.message)
    setCourses((c.data ?? []) as Course[])
    setOfferings(
      ((o.data ?? []) as unknown as RawOffering[])
        .map(x => {
          const g = Array.isArray(x.group) ? x.group[0] : x.group
          return { id: x.id, code: x.code, name: x.name, course_id: x.course_id, offering_kind: x.offering_kind, group_name: g?.name ?? '', type: g?.type ?? '' }
        })
        .filter(x => x.type === 'cohort'),
    )
    setEquivs((e.data ?? []) as Equiv[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { void load() }, [load])

  async function call(key: string, fn: () => PromiseLike<{ error: any }>, ok: string) {
    setBusy(key)
    const { error: e } = await fn()
    setBusy(null)
    if (e) { toast.error(e.message); return false }
    toast.success(ok)
    await load()
    return true
  }

  const label = (id: string) => {
    const c = courses.find(x => x.id === id)
    return c ? `${c.code} · ${c.title}` : id
  }
  const reasonFor = (what: string) => window.prompt(`Reason for ${what} (required):`)?.trim() ?? ''

  if (loading) return <div className="p-6 text-sm text-ink-muted flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</div>

  const unlinked = offerings.filter(o => !o.course_id)
  const linked = offerings.filter(o => o.course_id)

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="page-title mb-1">Course catalogue</h1>
        <p className="page-subtitle">Each course has one identity that stays the same when its code or title changes. Link every course offering to its course so that resits and repeats can be tracked.</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card">
        <div className="card-header"><h2 className="font-semibold text-sm text-ink">Courses</h2></div>
        <div className="card-body space-y-3">
          <div className="flex flex-wrap gap-2">
            <input className="input w-32" placeholder="Code" aria-label="Course code" value={code} onChange={e => setCode(e.target.value)} />
            <input className="input flex-1 min-w-[12rem]" placeholder="Title" aria-label="Course title" value={title} onChange={e => setTitle(e.target.value)} />
            <button className="btn-primary btn btn-sm" disabled={busy === 'create' || !code.trim() || !title.trim()}
              onClick={async () => { if (await call('create', () => supabase.rpc('create_tertiary_course', { p_code: code, p_title: title }), 'Course created')) { setCode(''); setTitle('') } }}>
              Add course
            </button>
          </div>
          <table className="table">
            <thead><tr><th>Code</th><th>Title</th><th>Status</th><th /></tr></thead>
            <tbody>
              {courses.map(c => (
                <tr key={c.id}>
                  <td className="font-mono text-xs">{c.code}</td><td>{c.title}</td>
                  <td>{c.is_active ? <span className="badge-green">Active</span> : <span className="badge-gray">Retired</span>}</td>
                  <td className="text-right">
                    {c.is_active && (
                      <button className="btn-ghost btn btn-sm" onClick={() => { const r = reasonFor('retiring this course'); if (r) void call('ret' + c.id, () => supabase.rpc('retire_tertiary_course', { p_course_id: c.id, p_reason: r }), 'Course retired') }}>
                        Retire
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {courses.length === 0 && <tr><td colSpan={4} className="text-ink-muted">No courses yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-sm text-ink">Course offerings</h2>
          <p className="text-xs text-ink-muted mt-0.5">{unlinked.length} not linked yet, {linked.length} linked. A link cannot be changed later; record an equivalency instead. The offering type can be set only before students are registered.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Offering</th><th>Cohort</th><th>Course</th><th>Type</th><th /></tr></thead>
            <tbody>
              {unlinked.map(o => {
                const l = links[o.id] ?? { course: '', kind: 'regular' }
                return (
                  <tr key={o.id}>
                    <td>{o.code} · {o.name}</td><td>{o.group_name}</td>
                    <td>
                      <select className="input w-56" aria-label="Course" value={l.course} onChange={e => setLinks(p => ({ ...p, [o.id]: { ...l, course: e.target.value } }))}>
                        <option value="">Choose…</option>
                        {courses.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.code} · {c.title}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="input w-36" aria-label="Offering type" value={l.kind} onChange={e => setLinks(p => ({ ...p, [o.id]: { ...l, kind: e.target.value } }))}>
                        {KINDS.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </td>
                    <td className="text-right">
                      <button className="btn-secondary btn btn-sm" disabled={!l.course || busy === 'link' + o.id}
                        onClick={() => void call('link' + o.id, () => supabase.rpc('set_subject_course', { p_subject_id: o.id, p_course_id: l.course, p_offering_kind: l.kind }), 'Offering linked')}>
                        Link
                      </button>
                    </td>
                  </tr>
                )
              })}
              {linked.map(o => (
                <tr key={o.id}>
                  <td>{o.code} · {o.name}</td><td>{o.group_name}</td><td>{o.course_id ? label(o.course_id) : ''}</td><td>{o.offering_kind}</td><td />
                </tr>
              ))}
              {offerings.length === 0 && <tr><td colSpan={5} className="text-ink-muted">No cohort offerings yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-sm text-ink">Equivalencies</h2>
          <p className="text-xs text-ink-muted mt-0.5">Use these when a course is replaced, merged, split or substituted. Approved by an administrator or Senate authority, never edited, only revoked with a reason.</p>
        </div>
        <div className="card-body space-y-3">
          <div className="flex flex-wrap gap-2">
            <select className="input w-56" aria-label="From course" value={eq.from} onChange={e => setEq({ ...eq, from: e.target.value })}>
              <option value="">From course…</option>{courses.map(c => <option key={c.id} value={c.id}>{c.code} · {c.title}</option>)}
            </select>
            <select className="input w-40" aria-label="Relation" value={eq.relation} onChange={e => setEq({ ...eq, relation: e.target.value })}>
              {RELATIONS.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>
            <select className="input w-56" aria-label="To course" value={eq.to} onChange={e => setEq({ ...eq, to: e.target.value })}>
              <option value="">To course…</option>{courses.map(c => <option key={c.id} value={c.id}>{c.code} · {c.title}</option>)}
            </select>
            <input className="input flex-1 min-w-[12rem]" placeholder="Reason or regulation reference" aria-label="Reason" value={eq.reason} onChange={e => setEq({ ...eq, reason: e.target.value })} />
            <button className="btn-primary btn btn-sm" disabled={!eq.from || !eq.to || !eq.reason.trim() || busy === 'eq'}
              onClick={async () => { if (await call('eq', () => supabase.rpc('set_course_equivalency', { p_from_course_id: eq.from, p_to_course_id: eq.to, p_relation: eq.relation, p_reason: eq.reason }), 'Equivalency recorded')) setEq({ from: '', to: '', relation: 'same', reason: '' }) }}>
              Record
            </button>
          </div>
          <ul className="text-sm space-y-1">
            {equivs.map(x => (
              <li key={x.id} className="flex flex-wrap items-center gap-2">
                <span className={x.revoked_at ? 'line-through text-ink-faint' : 'text-ink'}>{label(x.from_course_id)} → {x.relation.replace('_', ' ')} → {label(x.to_course_id)}</span>
                <span className="text-xs text-ink-muted">{x.reason}</span>
                {x.revoked_at ? <span className="badge-gray">Revoked</span> : (
                  <button className="btn-ghost btn btn-sm" onClick={() => { const r = reasonFor('revoking this equivalency'); if (r) void call('rev' + x.id, () => supabase.rpc('revoke_course_equivalency', { p_equivalency_id: x.id, p_reason: r }), 'Equivalency revoked') }}>Revoke</button>
                )}
              </li>
            ))}
            {equivs.length === 0 && <li className="text-ink-muted">None recorded.</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}