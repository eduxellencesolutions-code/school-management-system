import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getStaffAccess } from '@/lib/auth/getStaffAccess'

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const access = await getStaffAccess(supabase, user.id)
  const allowed = access.isSuperAdmin || access.permissions.has('platform_users.view')
  if (!allowed) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const admin = serviceClient()

  const { data: profile, error: profileError } = await admin
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // ✅ FIX: Changed from 'parents' to 'parent_accounts'
  const [{ data: org }, { data: rep }, { data: staffRow }, { data: parent }, { data: recentLogins }, { count: failedLoginCount }] = await Promise.all([
    profile.organization_id
      ? admin.from('organizations').select('id, name, subscription_plan, subscription_status').eq('id', profile.organization_id).maybeSingle()
      : Promise.resolve({ data: null }),
    admin.from('representatives').select('id, territory_state, territory_zone, level, status').eq('user_id', id).maybeSingle(),
    admin.from('platform_staff').select('id, status, role_id, platform_roles(name)').eq('user_id', id).eq('status', 'active').maybeSingle(),
    admin.from('parent_accounts').select('full_name, email, phone, access_code, access_code_active').eq('auth_user_id', id).maybeSingle(),  // ← FIXED
    admin.from('login_history').select('success, ip_address, user_agent, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(10),
    admin.from('login_history').select('id', { count: 'exact', head: true }).eq('user_id', id).eq('success', false).gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
  ])

  // A synthetic parent auth row has no real name/email of its own — prefer
  // the real contact info from the parents table when it exists.
  const displayName = parent?.full_name ?? profile.name
  const displayEmail = parent?.email ?? profile.email
  const displayPhone = parent?.phone ?? profile.phone

  return NextResponse.json({
    profile: {
      id: profile.id,
      name: displayName,
      email: displayEmail,
      phone: displayPhone,
      role: parent ? 'parent' : profile.role,
      accountStatus: profile.account_status ?? 'active',
      lockedAt: profile.locked_at,
      lockReason: profile.lock_reason,
      lastLogin: profile.last_login,
      createdAt: profile.created_at,
    },
    organization: org,
    representative: rep,
    platformStaff: staffRow
      ? { roleName: (staffRow as any).platform_roles?.name ?? null, status: staffRow.status }
      : null,
    parent: parent ? { accessCodeActive: parent.access_code_active } : null,
    recentLogins: recentLogins ?? [],
    failedLoginsLast24h: failedLoginCount ?? 0,
  })
}