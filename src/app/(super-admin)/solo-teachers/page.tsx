import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SoloTeachersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')
  if (!isSuperAdmin) redirect('/dashboard')

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // ✅ Fetch super admin IDs to exclude them from solo teacher list
  const { data: superAdminRows } = await admin.from('super_admins').select('id')
  const superAdminIds = (superAdminRows ?? []).map(s => s.id)
  const superAdminIdList = superAdminIds.length > 0 
    ? superAdminIds.join(',') 
    : '00000000-0000-0000-0000-000000000000'

  // ✅ FIX: Exclude super admins and include subscription_status
  const { data: soloTeachers, error } = await admin
    .from('users')
    .select('id, name, email, created_at, is_active, subscription_status')
    .is('organization_id', null)
    .not('id', 'in', `(${superAdminIdList})`)
    .eq('is_super_admin', false)
    .order('created_at', { ascending: false })

  if (error) console.error('Error fetching solo teachers:', error)

  const teacherIds = (soloTeachers ?? []).map(t => t.id)

  const { data: groupCounts, error: groupCountsError } = teacherIds.length > 0
    ? await admin.from('groups').select('instructor_id').in('instructor_id', teacherIds)
    : { data: [], error: null }

  if (groupCountsError) {
    console.error('Error fetching group counts:', groupCountsError)
  }

  const groupCountMap: Record<string, number> = {}
  ;(groupCounts ?? []).forEach(g => { groupCountMap[g.instructor_id] = (groupCountMap[g.instructor_id] ?? 0) + 1 })

  // Status badge styles
  const getStatusBadge = (status: string | null) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800',
      trial: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-gray-100 text-gray-700',
      expired: 'bg-gray-100 text-gray-700',
    }
    return styles[status ?? 'cancelled'] ?? 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Solo Teachers</h1>
        <p className="text-sm text-ink-muted mt-1">{soloTeachers?.length ?? 0} individual subscribers</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Email</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Classes</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Signed up</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Manage</th>
              </tr>
            </thead>
            <tbody>
              {(soloTeachers ?? []).map(t => (
                <tr key={t.id} className="border-b border-surface-100 hover:bg-surface-50">
                  <td className="px-4 py-3 font-medium text-ink flex items-center gap-2">
                    <Users size={14} className="text-ink-faint" /> {t.name}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{t.email}</td>
                  <td className="px-4 py-3 text-center font-mono">{groupCountMap[t.id] ?? 0}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(t.subscription_status)}`}>
                      {t.subscription_status ?? 'cancelled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-faint text-xs">
                    {new Date(t.created_at).toLocaleDateString('en-NG')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/solo-teachers/${t.id}`} className="text-sm text-brand-600 hover:underline">
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
