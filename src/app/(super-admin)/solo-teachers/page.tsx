import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
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

  const { data: soloTeachers, error } = await admin
    .from('users')
    .select('id, name, email, created_at, is_active')
    .is('organization_id', null)
    .order('created_at', { ascending: false })

  if (error) console.error('Error fetching solo teachers:', error)

  const teacherIds = (soloTeachers ?? []).map(t => t.id)

  const { data: groupCounts } = teacherIds.length > 0
    ? await admin.from('groups').select('instructor_id').in('instructor_id', teacherIds)
    : { data: [] }

  const groupCountMap: Record<string, number> = {}
  ;(groupCounts ?? []).forEach(g => { groupCountMap[g.instructor_id] = (groupCountMap[g.instructor_id] ?? 0) + 1 })

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
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                      {t.is_active ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-faint text-xs">
                    {new Date(t.created_at).toLocaleDateString('en-NG')}
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