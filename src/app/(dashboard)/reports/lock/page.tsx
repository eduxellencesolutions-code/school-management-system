import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Lock, AlertTriangle } from 'lucide-react'
import LockResultsButton from '@/components/reports/LockResultsButton'

export default async function LockResultsPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: user } = await supabase
    .from('users')
    .select('*, organization:organizations!users_organization_id_fkey(*)')
    .eq('id', authUser.id)
    .single()

  const orgId = user?.organization_id
  const org = user?.organization

  if (!orgId) redirect('/dashboard') // solo teachers don't have this feature
  if (user?.role !== 'admin') redirect('/dashboard')

  // Current session/term — adjust if your org stores these differently
  const sessionId = org?.current_term_id ? org?.session_name : null
  const termId = org?.current_term_id

  const { data: classes } = await supabase
    .from('groups')
    .select('id, name')
    .eq('organization_id', orgId)
    .eq('type', 'class')
    .eq('is_active', true)
    .order('name')

  // For each class, find its most recent published broadsheet for the current term
  const classSummaries = await Promise.all(
    (classes ?? []).map(async (cls) => {
      const { data: report } = await supabase
        .from('reports')
        .select('id, report_status, locked, locked_at, session_id, term_id')
        .eq('group_id', cls.id)
        .eq('type', 'broadsheet')
        .eq('deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      return { class: cls, report }
    })
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Academic Control Center</h1>
        <p className="page-subtitle">
          Review each class's readiness, then lock results to finalize the academic record.
        </p>
      </div>

      <div className="grid gap-4">
        {classSummaries.length === 0 && (
          <div className="card p-8 text-center text-sm text-ink-muted">
            No classes found for your organization.
          </div>
        )}

        {classSummaries.map(({ class: cls, report }) => (
          <div key={cls.id} className="card p-5 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm text-ink">{cls.name}</p>
              {!report && (
                <p className="text-xs text-ink-faint mt-1">No broadsheet generated yet</p>
              )}
              {report && (
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`badge text-[10px] ${
                      report.locked ? 'badge-green' : report.report_status === 'published' ? 'badge-blue' : 'badge-gray'
                    }`}
                  >
                    {report.locked ? 'Locked' : report.report_status}
                  </span>
                  {report.locked && report.locked_at && (
                    <span className="text-[10px] text-ink-faint">
                      Locked {new Date(report.locked_at).toLocaleDateString('en-NG')}
                    </span>
                  )}
                </div>
              )}
            </div>

            {report && !report.locked && report.report_status === 'published' && (
              <LockResultsButton
                groupId={cls.id}
                sessionId={report.session_id}
                termId={report.term_id}
              />
            )}

            {report && report.locked && (
              <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
                <Lock size={13} /> Finalized
              </div>
            )}

            {report && !report.locked && report.report_status !== 'published' && (
              <div className="flex items-center gap-1.5 text-amber-600 text-xs font-medium">
                <AlertTriangle size={13} /> Not yet published
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
