import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Building, Users, BookOpen } from 'lucide-react'
import { isAdminAllowed } from '@/lib/auth/isAdminAllowed'

export const dynamic = 'force-dynamic'

export default async function SchoolsListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ✅ Use shared helper
  const allowed = await isAdminAllowed(supabase, user.id)
  if (!allowed) redirect('/dashboard')

  // Service-role client — bypasses RLS to see every organization, not just one
  const { createClient: createServiceClient } = await import('@supabase/supabase-js')
  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: orgs, error: orgsError } = await adminClient
    .from('organizations')
    .select('id, name, subscription_plan, subscription_status, subscription_expires_at, created_at')
    .order('created_at', { ascending: false })

  if (orgsError) {
    console.error('Error fetching organizations:', orgsError)
  }

  const orgIds = (orgs ?? []).map(o => o.id)

  const { data: userCounts, error: userCountsError } = orgIds.length > 0
    ? await adminClient.from('users').select('organization_id').in('organization_id', orgIds)
    : { data: [], error: null }

  if (userCountsError) {
    console.error('Error fetching user counts:', userCountsError)
  }

  const { data: groupCounts, error: groupCountsError } = orgIds.length > 0
    ? await adminClient.from('groups').select('organization_id').in('organization_id', orgIds)
    : { data: [], error: null }

  if (groupCountsError) {
    console.error('Error fetching group counts:', groupCountsError)
  }

  const userCountMap: Record<string, number> = {}
  ;(userCounts ?? []).forEach(u => { userCountMap[u.organization_id] = (userCountMap[u.organization_id] ?? 0) + 1 })

  const groupCountMap: Record<string, number> = {}
  ;(groupCounts ?? []).forEach(g => { groupCountMap[g.organization_id] = (groupCountMap[g.organization_id] ?? 0) + 1 })

  const statusStyle: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-700',
    suspended: 'bg-red-100 text-red-800',
    trial: 'bg-amber-100 text-amber-800',
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Schools</h1>
        <p className="text-sm text-ink-muted mt-1">{orgs?.length ?? 0} registered institutions</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">School</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Plan</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Status</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Users</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Classes</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Signed up</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase"></th>
              </tr>
            </thead>
            <tbody>
              {(orgs ?? []).map(org => (
                <tr key={org.id} className="border-b border-surface-100 hover:bg-surface-50">
                  <td className="px-4 py-3 font-medium text-ink flex items-center gap-2">
                    <Building size={14} className="text-ink-faint" /> {org.name}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{org.subscription_plan ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[org.subscription_status] ?? statusStyle.inactive}`}>
                      {org.subscription_status ?? 'inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-mono">{userCountMap[org.id] ?? 0}</td>
                  <td className="px-4 py-3 text-center font-mono">{groupCountMap[org.id] ?? 0}</td>
                  <td className="px-4 py-3 text-ink-faint text-xs">
                    {new Date(org.created_at).toLocaleDateString('en-NG')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/schools/${org.id}`} className="text-brand-600 text-xs font-medium hover:underline">
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}