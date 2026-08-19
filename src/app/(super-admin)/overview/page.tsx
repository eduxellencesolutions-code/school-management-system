import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { Building, Users, GraduationCap, FileText, TrendingUp, AlertTriangle, DollarSign, UserPlus, AlertCircle, Clock, Ticket } from 'lucide-react'
import Link from 'next/link'
import { getStaffAccess, getStaffLandingPath } from '@/lib/auth/getStaffAccess'

export const dynamic = 'force-dynamic'

export default async function SuperAdminOverview() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ✅ Get staff access and redirect non-super-admins to their landing page
  const access = await getStaffAccess(supabase, user.id)
  if (!access.isSuperAdmin && !access.isStaff) redirect('/dashboard')
  if (!access.isSuperAdmin) redirect(getStaffLandingPath(access))

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // ✅ Fetch super admin IDs once to exclude them from solo teacher counts
  const { data: superAdminRows } = await admin.from('super_admins').select('id')
  const superAdminIds = (superAdminRows ?? []).map(s => s.id)

  // ✅ Representatives and platform staff also get a public.users row with
  // organization_id = null on signup, so they must be excluded from solo
  // teacher counts the same way super admins already are.
  const { data: repUserRows } = await admin.from('representatives').select('user_id').not('user_id', 'is', null)
  const { data: staffUserRows } = await admin.from('platform_staff').select('user_id').not('user_id', 'is', null)
  const nonSoloUserIds = [
    ...superAdminIds,
    ...(repUserRows ?? []).map(r => r.user_id),
    ...(staffUserRows ?? []).map(s => s.user_id),
  ]
  const nonSoloUserIdList = nonSoloUserIds.length > 0
    ? nonSoloUserIds.join(',')
    : '00000000-0000-0000-0000-000000000000'

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
    { count: totalRepresentatives },
    { count: totalPlatformStaff },
  ] = await Promise.all([
    admin.from('organizations').select('*', { count: 'exact', head: true }),
    admin.from('organizations').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
    // ✅ Exclude super admins, representatives, and platform staff from solo teacher count
    admin.from('users')
      .select('*', { count: 'exact', head: true })
      .is('organization_id', null)
      .not('id', 'in', `(${nonSoloUserIdList})`),
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
    // ✅ Exclude super admins, representatives, and platform staff from new solo teachers this month
    admin.from('users')
      .select('id')
      .is('organization_id', null)
      .not('id', 'in', `(${nonSoloUserIdList})`)
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    admin.from('representatives').select('*', { count: 'exact', head: true }),
    admin.from('platform_staff').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ])

  // ✅ FIX: Exclude admin (platform super admin) from teacher count
  // school_admin is included as they are school-level administrators, not platform-level
  const totalTeachers = (allUsers ?? []).filter(u => 
    u.role === 'teacher' || u.role === 'school_admin'
  ).length

  const { data: paidOrgs } = await admin
    .from('organizations')
    .select('subscription_plan, subscription_status')
    .in('subscription_status', ['active'])

  const PLAN_PRICES: Record<string, number> = {
    small_school: 15000,
    standard_school: 35000,
    premium_school: 75000,
  }

  // ✅ Exclude super admins, representatives, and platform staff from paid solo teacher count
  const { data: paidSolo } = await admin
    .from('users')
    .select('subscription_plan, subscription_status')
    .is('organization_id', null)
    .not('id', 'in', `(${nonSoloUserIdList})`)
    .eq('subscription_status', 'active')
    .eq('subscription_plan', 'solo_teacher_pro')

  const estimatedRevenue =
    (paidOrgs ?? []).reduce((sum, o) => sum + (PLAN_PRICES[o.subscription_plan] ?? 0), 0) +
    (paidSolo ?? []).length * 3000

  // ── FETCH "NEEDS ATTENTION" DATA ──
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 86400000).toISOString();

  const [{ data: expiring }, { data: criticalTickets }, { data: unassignedTickets }, { data: pendingCommissions }] = await Promise.all([
    admin.from('organizations').select('id, name, subscription_expires_at').not('subscription_expires_at', 'is', null).lte('subscription_expires_at', in7Days).gte('subscription_expires_at', now.toISOString()),
    admin.from('support_tickets').select('id, subject').eq('priority', 'critical').not('status', 'in', '(resolved,closed)'),
    admin.from('support_tickets').select('id, subject').is('assigned_to', null).not('status', 'in', '(resolved,closed)'),
    admin.from('commissions').select('id, amount').eq('status', 'pending'),
  ]);

  const attentionItems = [
    ...(expiring ?? []).map(o => ({ severity: 'amber', label: `${o.name} expires ${new Date(o.subscription_expires_at).toLocaleDateString('en-NG')}`, href: `/schools/${o.id}` })),
    ...(criticalTickets ?? []).map(t => ({ severity: 'red', label: `Critical ticket: ${t.subject}`, href: `/support?ticket=${t.id}` })),
    ...(unassignedTickets ?? []).map(t => ({ severity: 'amber', label: `Unassigned: ${t.subject}`, href: `/support?ticket=${t.id}` })),
  ];

  const stats = [
    { label: 'Total Schools', value: totalSchools ?? 0, icon: Building, color: 'text-brand-500', bg: 'bg-brand-50' },
    { label: 'Active Schools', value: activeSchools ?? 0, icon: Building, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Solo Teachers', value: totalSoloTeachers ?? 0, icon: UserPlus, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Total Students', value: totalStudents ?? 0, icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Total Teachers', value: totalTeachers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Reports Generated', value: totalReports ?? 0, icon: FileText, color: 'text-pink-600', bg: 'bg-pink-50' },
    { label: 'Representatives', value: totalRepresentatives ?? 0, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Platform Staff', value: totalPlatformStaff ?? 0, icon: Ticket, color: 'text-cyan-600', bg: 'bg-cyan-50' },
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

      {/* ── NEW: NEEDS ATTENTION CARD ── */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle size={16} className="text-red-600" />
          <h2 className="font-semibold text-sm text-ink">Needs Attention</h2>
          <span className="text-xs text-ink-faint ml-auto">
            {attentionItems.length} item{attentionItems.length !== 1 ? 's' : ''}
          </span>
        </div>
        {attentionItems.length > 0 ? (
          <div className="divide-y divide-surface-200">
            {attentionItems.map((item, idx) => (
              <Link key={idx} href={item.href} className="py-2 flex items-center gap-3 text-sm hover:bg-surface-50 transition-colors -mx-2 px-2 rounded">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.severity === 'red' ? 'bg-red-500' : 'bg-amber-500'}`} />
                <span className="text-ink flex-1">{item.label}</span>
                <span className="text-xs text-ink-faint">
                  {item.severity === 'red' ? 'Critical' : 'Urgent'}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs text-ink-faint">All systems clear — no pending issues.</p>
        )}
        {pendingCommissions && pendingCommissions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-surface-100">
            <p className="text-xs text-ink-muted">
              <strong>{pendingCommissions.length}</strong> pending commission{pendingCommissions.length !== 1 ? 's' : ''} 
              {' · Total: '}₦{pendingCommissions.reduce((s, c) => s + c.amount, 0).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}