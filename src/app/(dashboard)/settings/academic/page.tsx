import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Calendar, Star } from 'lucide-react'
import { createSession, createTerm, deleteSession, deleteTerm, setCurrentTerm } from './actions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AcademicPeriodsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()

  const orgId = profile?.organization_id
  const isAdmin = profile?.role === 'admin' || profile?.role === 'school_admin'
  const isAssigned = !!orgId && !isAdmin

  if (isAssigned) redirect('/settings')

  const { data: sessions } = orgId
    ? await supabase.from('academic_sessions').select('id, name').eq('organization_id', orgId).order('name', { ascending: false })
    : await supabase.from('academic_sessions').select('id, name').eq('instructor_id', user.id).order('name', { ascending: false })

  const sessionIds = (sessions ?? []).map(s => s.id)
  const { data: terms } = sessionIds.length > 0
    ? await supabase.from('terms').select('id, name, session_id').in('session_id', sessionIds).order('name')
    : { data: [] }

  const currentTermId = orgId
    ? (await supabase.from('organizations').select('current_term_id').eq('id', orgId).single()).data?.current_term_id
    : (await supabase.from('users').select('current_term_id').eq('id', user.id).single()).data?.current_term_id

  const termsBySession: Record<string, typeof terms> = {}
  for (const t of terms ?? []) {
    if (!termsBySession[t.session_id]) termsBySession[t.session_id] = []
    termsBySession[t.session_id]!.push(t)
  }

  const allTerms = (terms ?? []).map(t => ({
    ...t,
    sessionName: sessions?.find(s => s.id === t.session_id)?.name,
  }))

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/settings" className="text-ink-muted hover:text-ink flex items-center gap-1">
          <ArrowLeft size={13} /> Settings
        </Link>
        <span className="text-ink-faint">/</span>
        <span className="text-ink font-medium">Academic Periods</span>
      </div>

      <div>
        <h1 className="page-title">Academic Periods</h1>
        <p className="page-subtitle">
          Manage your sessions and terms. {orgId ? 'Set the current term below — every teacher will generate reports for this term automatically.' : 'Choose a default term for your reports.'}
        </p>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-sm text-ink mb-3 flex items-center gap-2">
          <Star size={14} className="text-brand-500" /> Current term
        </h2>
        <form action={setCurrentTerm} className="flex gap-2 items-end">
          <select name="term_id" defaultValue={currentTermId ?? ''} className="input max-w-xs">
            <option value="">None selected</option>
            {allTerms.map(t => (
              <option key={t.id} value={t.id}>{t.sessionName} — {t.name}</option>
            ))}
          </select>
          <button type="submit" className="btn-primary btn-sm btn">Set as current</button>
        </form>
        {orgId && (
          <p className="text-xs text-amber-600 mt-2">
            ⚠ Changing this affects report generation for every teacher in your organization going forward.
          </p>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-sm text-ink mb-3">Add a session</h2>
        <form action={createSession} className="flex gap-2">
          <input name="name" required placeholder="e.g. 2026/2027" className="input max-w-xs" />
          <button type="submit" className="btn-primary btn-sm btn"><Plus size={13} /> Add session</button>
        </form>
      </div>

      <div className="flex flex-col gap-3">
        {(sessions ?? []).map(session => (
          <div key={session.id} className="card overflow-hidden">
            <div className="card-header flex items-center justify-between">
              <h3 className="font-semibold text-sm text-ink flex items-center gap-2">
                <Calendar size={14} className="text-ink-muted" /> {session.name}
              </h3>
              <form action={deleteSession}>
                <input type="hidden" name="id" value={session.id} />
                <button type="submit" className="text-xs text-red-600 hover:underline">Remove session</button>
              </form>
            </div>
            <div className="px-5 py-3 flex flex-col gap-2">
              {(termsBySession[session.id] ?? []).map(term => (
                <div key={term.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink flex items-center gap-2">
                    {term.name}
                    {term.id === currentTermId && <span className="badge badge-green text-[10px]">Current</span>}
                  </span>
                  <form action={deleteTerm}>
                    <input type="hidden" name="id" value={term.id} />
                    <button type="submit" className="text-xs text-red-600 hover:underline">Remove</button>
                  </form>
                </div>
              ))}
              <form action={createTerm} className="flex gap-2 mt-1 pt-2 border-t border-surface-100">
                <input type="hidden" name="session_id" value={session.id} />
                <input name="name" required placeholder="e.g. First Term" className="input input-sm flex-1" />
                <button type="submit" className="btn-secondary btn-sm btn">Add term</button>
              </form>
            </div>
          </div>
        ))}
        {(sessions ?? []).length === 0 && (
          <p className="text-sm text-ink-faint text-center py-8">No sessions yet — add one above to get started.</p>
        )}
      </div>
    </div>
  )
}
