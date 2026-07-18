import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { Building, Users, GraduationCap, FileText, TrendingUp, AlertTriangle, DollarSign, UserPlus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SuperAdminOverview() {
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

  const [
    { count: totalSchools },
    { count: activeSchools },
    { count: totalSoloTeachers },
    { data: allUsers },
    { count: totalStudents },
    { count: totalReports },
    { data: orgsExpiring },
    { data: newOrgsThisMonth },
    { data: newSoloThisMonth },
  ] = await Promise.all([
    admin.from('organizations').select('*', { count: 'exact', head: true }),
    admin.from('organizations').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
    admin.from('users').select('*', { count: 'exact', head: true }).is('organization_id', null),
    admin.from('users').select('id, organization_id, role'),
    admin.from('learners').select('*', { count: 'exact', head: true }),
    admin.from('reports').select('*', { count: 'exact', head: true }),
    admin.from('organizations')
      .select('id, name, subscription_expires_at')
      .not('subscription_expires_at', 'is', null)
      .lte('subscription_expires_at', new Date(Date.now() + 7 * 86400000).toISOString())
      .gte('subscription_expires_at', new Date().toISOString())
      .order('subscription_expires_at'),
    admin.from('organizations')
      .select('id')
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    admin.from('users')
      .select('id')
      .is('organization_id', null)
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ])

  const totalTeachers = (allUsers ?? []).filter(u => u.role === 'teacher' || u.role === 'admin' || u.role === 'school_admin').length

  const { data: paidOrgs } = await admin
    .from('organizations')
    .select('subscription_plan, subscription_status')
    .in('subscription_status', ['active'])

  const PLAN_PRICES: Record<string, number> = {
    small_school: 15000,
    standard_school: 35000,
    premium_school: 75000,
  }

  const { data: paidSolo } = await admin
    .from('users')
    .select('subscription_plan, subscription_status')
    .is('organization_id', null)
    .eq('subscription_status', 'active')
    .eq('subscription_plan', 'solo_teacher_pro')

  const estimatedRevenue =
    (paidOrgs ?? []).reduce((sum, o) => sum + (PLAN_PRICES[o.subscription_plan] ?? 0), 0) +
    (paidSolo ?? []).length * 3000

  const stats = [
    { label: 'Total Schools', value: totalSchools ?? 0, icon: Building, color: 'text-brand-500', bg: 'bg-brand-50' },
    { label: 'Active Schools', value: activeSchools ?? 0, icon: Building, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Solo Teachers', value: totalSoloTeachers ?? 0, icon: UserPlus, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Total Students', value: totalStudents ?? 0, icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Total Teachers', value: totalTeachers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Reports Generated', value: totalReports ?? 0, icon: FileText, color: 'text-pink-600', bg: 'bg-pink-50' },
    { label: 'New Schools (this month)', value: newOrgsThisMonth?.length ?? 0, icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'New Solo Teachers (this month)', value: newSoloThisMonth?.length ?? 0, icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Platform Overview</h1>
        <p className="text-sm text-ink-muted mt-1">A snapshot of every school and solo teacher on Eduxellence</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-4">
            <div className={`w-9 h-9 rounded ${bg} flex items-center justify-center mb-2`}>
              <Icon size={18} className={color} />
            </div>
            <div className="text-xl font-bold text-ink">{value.toLocaleString()}</div>
            <div className="text-xs text-ink-muted">{label}</div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign size={16} className="text-green-600" />
          <h2 className="font-semibold text-sm text-ink">Estimated Monthly Recurring Revenue</h2>
        </div>
        <p className="text-2xl font-bold text-ink">₦{estimatedRevenue.toLocaleString()}</p>
        <p className="text-xs text-ink-faint mt-1">Based on current active paid subscriptions (termly plans normalized)</p>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-amber-600" />
          <h2 className="font-semibold text-sm text-ink">Subscriptions Expiring Within 7 Days</h2>
        </div>
        {orgsExpiring && orgsExpiring.length > 0 ? (
          <div className="divide-y divide-surface-200">
            {orgsExpiring.map(org => (
              <div key={org.id} className="py-2 flex items-center justify-between text-sm">
                <span className="text-ink font-medium">{org.name}</span>
                <span className="text-xs text-amber-700">
                  Expires {new Date(org.subscription_expires_at).toLocaleDateString('en-NG')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-ink-faint">No subscriptions expiring in the next 7 days.</p>
        )}
      </div>
    </div>
  )
}
