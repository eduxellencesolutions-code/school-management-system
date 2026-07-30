import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building, Users, BookOpen, Calendar, ShieldAlert, Ticket, UserPlus } from 'lucide-react'
import SchoolStatusActions from '@/components/super-admin/SchoolStatusActions'
import ReassignAdminForm from '@/components/super-admin/ReassignAdminForm'
import DeleteSchoolForm from '@/components/super-admin/DeleteSchoolForm'
import { getStaffAccess, hasPermission } from '@/lib/auth/getStaffAccess'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

export default async function SchoolDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ✅ Use permission-based check
  const access = await getStaffAccess(supabase, user.id)
  const allowed = access.isSuperAdmin || hasPermission(access, 'schools.view')
  if (!allowed) redirect('/dashboard')

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: org, error: orgError } = await admin
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single()

  if (orgError) {
    console.error('Error fetching organization:', orgError)
    notFound()
  }
  if (!org) notFound()

  const { data: users, error: usersError } = await admin
    .from('users')
    .select('id, name, email, role, created_at')
    .eq('organization_id', id)
    .order('created_at')

  if (usersError) {
    console.error('Error fetching users:', usersError)
  }

  const { count: groupsCount, error: groupsError } = await admin
    .from('groups')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', id)

  if (groupsError) {
    console.error('Error fetching groups count:', groupsError)
  }

  const { count: learnersCount, error: learnersError } = await admin
    .from('learners')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', id)

  if (learnersError) {
    console.error('Error fetching learners count:', learnersError)
  }

  // ── NEW: Fetch support tickets ──
  const { data: tickets } = await admin
    .from('support_tickets')
    .select('id, subject, status, priority, created_at')
    .eq('organization_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  // ── NEW: Fetch referral info ──
  const { data: referral } = await admin
    .from('referrals')
    .select('representative_id')
    .eq('organization_id', id)
    .maybeSingle();

  let referredByName: string | null = null;
  if (referral?.representative_id) {
    const { data: rep } = await admin.from('representatives').select('full_name').eq('id', referral.representative_id).single();
    referredByName = rep?.full_name ?? null;
  }

  // ✅ FIX 1: Simplified to just 'admin' (school_admin doesn't exist)
  const currentAdmin = users?.find(u => u.role === 'admin')
  const teachers = users?.filter(u => u.role === 'teacher') ?? []

  // ✅ FIX 2: Updated status styles with all valid statuses and proper fallback
  const statusStyle: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    trial: 'bg-blue-100 text-blue-800',
    expired: 'bg-amber-100 text-amber-800',
    suspended: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-700',
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <Link href="/schools" className="text-sm text-ink-muted hover:text-ink flex items-center gap-1">
        <ArrowLeft size={14} /> All Schools
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building size={20} className="text-ink-faint" />
            <h1 className="text-xl font-bold text-ink">{org.name}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[org.subscription_status] ?? statusStyle.cancelled}`}>
              {org.subscription_status ?? 'cancelled'}
            </span>
          </div>
          <p className="text-sm text-ink-muted">
            Plan: {org.subscription_plan ?? '—'} · Signed up {new Date(org.created_at).toLocaleDateString('en-NG')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <Users size={18} className="text-brand-500" />
          <div>
            <p className="text-lg font-bold text-ink">{users?.length ?? 0}</p>
            <p className="text-xs text-ink-muted">Users</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <BookOpen size={18} className="text-green-600" />
          <div>
            <p className="text-lg font-bold text-ink">{groupsCount ?? 0}</p>
            <p className="text-xs text-ink-muted">Classes</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <Calendar size={18} className="text-amber-600" />
          <div>
            <p className="text-lg font-bold text-ink">{learnersCount ?? 0}</p>
            <p className="text-xs text-ink-muted">Students</p>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-sm text-ink mb-3">Subscription & Status</h2>
        <SchoolStatusActions
          orgId={org.id}
          currentStatus={org.subscription_status ?? 'cancelled'}
          currentExpiry={org.subscription_expires_at}
          currentPlan={org.subscription_plan ?? 'free'}
        />
      </div>

      {/* ── NEW: Support Tickets Card ── */}
      <div className="card p-5">
        <h2 className="font-semibold text-sm text-ink mb-3 flex items-center gap-2">
          <Ticket size={16} className="text-ink-muted" />
          Support Tickets
        </h2>
        {referredByName && (
          <p className="text-xs text-ink-muted mb-3">
            Referred by: <strong>{referredByName}</strong>
          </p>
        )}
        {tickets && tickets.length > 0 ? (
          <div className="divide-y divide-surface-100">
            {tickets.map(t => (
              <div key={t.id} className="py-2 flex justify-between text-sm">
                <span>{t.subject}</span>
                <span className="text-xs text-ink-faint">{t.status} · {t.priority}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-ink-faint">No support tickets for this school.</p>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-sm text-ink mb-3">School Administrator</h2>
        <p className="text-sm text-ink-muted mb-3">
          {currentAdmin ? `${currentAdmin.name} (${currentAdmin.email})` : 'No admin currently assigned'}
        </p>
        <ReassignAdminForm orgId={org.id} teachers={teachers} currentAdminId={currentAdmin?.id} />
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-sm text-ink mb-3">All Users</h2>
        <div className="divide-y divide-surface-200">
          {(users ?? []).map(u => (
            <div key={u.id} className="py-2.5 flex items-center justify-between text-sm">
              <div>
                <p className="text-ink font-medium">{u.name}</p>
                <p className="text-xs text-ink-faint">{u.email}</p>
              </div>
              <span className="text-xs text-ink-muted capitalize">{u.role}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5 border-red-200">
        <h2 className="font-semibold text-sm text-red-600 mb-3 flex items-center gap-2">
          <ShieldAlert size={15} /> Danger Zone
        </h2>
        <p className="text-sm text-ink-muted mb-3">
          Permanently delete this school and all its data. This cannot be undone.
        </p>
        <DeleteSchoolForm orgId={org.id} orgName={org.name} />
      </div>
    </div>
  )
}