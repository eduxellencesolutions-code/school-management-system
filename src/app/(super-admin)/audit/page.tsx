import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'
import { getStaffAccess, hasPermission } from '@/lib/auth/getStaffAccess'

export const dynamic = 'force-dynamic'

export default async function AuditLogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ✅ Use the shared permission helper
  const access = await getStaffAccess(supabase, user.id)
  const allowed = access.isSuperAdmin || hasPermission(access, 'security.audit')
  if (!allowed) redirect('/dashboard')

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: entries, error } = await admin
    .from('platform_audit_log')
    .select('id, actor_id, action, target_type, target_id, reason, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) console.error('Error fetching audit log:', error)

  const actorIds = [...new Set((entries ?? []).map(e => e.actor_id).filter(Boolean))]
  const { data: actors } = actorIds.length > 0
    ? await admin.from('users').select('id, name, email').in('id', actorIds)
    : { data: [] }

  const actorMap = new Map((actors ?? []).map(a => [a.id, a.name ?? a.email]))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink flex items-center gap-2">
          <ShieldAlert size={20} className="text-red-600" /> Audit Log
        </h1>
        <p className="text-sm text-ink-muted mt-1">Recent platform staff and administrative actions</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">When</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Actor</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Action</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Target</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Reason</th>
              </tr>
            </thead>
            <tbody>
              {(entries ?? []).map(e => (
                <tr key={e.id} className="border-b border-surface-100 hover:bg-surface-50">
                  <td className="px-4 py-3 text-xs text-ink-faint whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString('en-NG')}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{actorMap.get(e.actor_id) ?? e.actor_id ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-ink">{e.action}</td>
                  <td className="px-4 py-3 text-ink-muted text-xs">
                    {e.target_type ? `${e.target_type} · ${e.target_id ?? '—'}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-ink-faint text-xs">{e.reason ?? '—'}</td>
                </tr>
              ))}
              {(entries ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink-faint text-sm">
                    No audit entries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}