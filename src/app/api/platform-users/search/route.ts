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

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const access = await getStaffAccess(supabase, user.id)
  const allowed = access.isSuperAdmin || access.permissions.has('platform_users.view')
  if (!allowed) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const q = request.nextUrl.searchParams.get('q')?.trim()
  const admin = serviceClient()

  // No search query yet — show the most recently active users instead of
  // an empty state, so Super Admin sees the platform is populated without
  // having to search first. Same enrichment pipeline as a real search,
  // just a different initial row set (recent last_login instead of ilike match).
  if (!q || q.length < 2) {
    const { data: recentRows, error: recentError } = await admin
      .from('users')
      .select('id, name, email, phone, role, organization_id, account_status, subscription_plan, subscription_status, last_login')
      .not('last_login', 'is', null)
      .order('last_login', { ascending: false })
      .limit(20)

    if (recentError) {
      console.error('platform user recent-list error (users):', recentError)
      return NextResponse.json({ error: 'Failed to load recent users' }, { status: 500 })
    }

    return NextResponse.json({ users: await enrichRows(admin, (recentRows ?? []).map(r => ({ ...r, __isParentMatch: false }))), isDefaultList: true })
  }

  // Primary search: direct users (admins, teachers, principals, reps, staff —
  // anyone whose real contact info actually lives on this table).
  const { data: directRows, error: directError } = await admin
    .from('users')
    .select('id, name, email, phone, role, organization_id, account_status, subscription_plan, subscription_status, last_login')
    .or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
    .limit(50)

  if (directError) {
    console.error('platform user search error (users):', directError)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }

  // ✅ FIX: Changed from 'parents' to 'parent_accounts'
  const { data: parentRows, error: parentError } = await admin
    .from('parent_accounts')
    .select('auth_user_id, full_name, email, phone, access_code_active')
    .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
    .limit(50)

  if (parentError) {
    console.error('platform user search error (parent_accounts):', parentError)
    // Don't fail the whole search if this table's shape turns out to differ —
    // just return what the direct search found.
  }

  const directIds = new Set((directRows ?? []).map(r => r.id))
  const parentAuthIds = (parentRows ?? [])
    .map(p => p.auth_user_id)
    .filter((id): id is string => Boolean(id) && !directIds.has(id))

  const { data: parentUserRows } = parentAuthIds.length > 0
    ? await admin
        .from('users')
        .select('id, account_status, last_login, subscription_plan, organization_id')
        .in('id', parentAuthIds)
    : { data: [] as any[] }

  const parentUserMap = new Map((parentUserRows ?? []).map(u => [u.id, u]))

  const allRows = [
    ...(directRows ?? []).map(r => ({ ...r, __isParentMatch: false })),
    ...(parentRows ?? [])
      .filter(p => p.auth_user_id && !directIds.has(p.auth_user_id))
      .map(p => {
        const linkedUser = parentUserMap.get(p.auth_user_id!)
        return {
          id: p.auth_user_id!,
          name: p.full_name,
          email: p.email,
          phone: p.phone,
          role: 'parent' as const,
          organization_id: linkedUser?.organization_id ?? null,
          account_status: linkedUser?.account_status ?? 'active',
          subscription_plan: linkedUser?.subscription_plan ?? null,
          subscription_status: null,
          last_login: linkedUser?.last_login ?? null,
          __isParentMatch: true,
        }
      }),
  ]

  return NextResponse.json({ users: await enrichRows(admin, allRows), isDefaultList: false })
}

// Extracted so both the default-list path and the search path enrich rows
// (org name, representative badge, staff badge, primaryType label) the
// exact same way — no duplicated logic, no risk of the two paths drifting
// out of sync with each other over time.
async function enrichRows(admin: ReturnType<typeof serviceClient>, allRows: any[]) {
  const orgIds = [...new Set(allRows.map(r => r.organization_id).filter(Boolean))]
  const userIds = allRows.map(r => r.id)

  const [{ data: orgs }, { data: repRows }, { data: staffRows }] = await Promise.all([
    orgIds.length > 0
      ? admin.from('organizations').select('id, name, subscription_plan').in('id', orgIds)
      : Promise.resolve({ data: [] as any[] }),
    userIds.length > 0
      ? admin.from('representatives').select('user_id').in('user_id', userIds)
      : Promise.resolve({ data: [] as any[] }),
    userIds.length > 0
      ? admin.from('platform_staff').select('user_id, status').in('user_id', userIds).eq('status', 'active')
      : Promise.resolve({ data: [] as any[] }),
  ])

  const orgMap = new Map((orgs ?? []).map(o => [o.id, o]))
  const repSet = new Set((repRows ?? []).map(r => r.user_id))
  const staffSet = new Set((staffRows ?? []).map(s => s.user_id))

  return allRows.map(u => {
    const org = u.organization_id ? orgMap.get(u.organization_id) : null
    const isRep = repSet.has(u.id) || u.role === 'representative'
    const isStaff = staffSet.has(u.id)
    const isParent = u.__isParentMatch || u.role === 'parent'

    let primaryType = 'User'
    if (isParent) primaryType = 'Parent'
    else if (u.role === 'admin' && u.organization_id) primaryType = 'Institution Admin'
    else if (u.role === 'principal') primaryType = 'Institution Admin'
    else if (u.role === 'teacher' && u.organization_id) primaryType = 'Teacher'
    else if (u.role === 'teacher' && !u.organization_id) primaryType = 'Solo Teacher'
    else if (isRep) primaryType = 'Representative'
    else if (isStaff) primaryType = 'Platform Staff'

    const orgLabel =
      org?.name ??
      (primaryType === 'Parent' ? 'Parent' :
       primaryType === 'Solo Teacher' ? 'Solo Teacher' :
       primaryType === 'Platform Staff' ? 'Platform Staff' :
       primaryType === 'Representative' ? 'Representative Network' : '—')

    const plan = org?.subscription_plan ?? u.subscription_plan ?? null

    const roleSignals = [
      Boolean(u.organization_id) || u.role === 'teacher' || u.role === 'admin' || u.role === 'principal',
      isRep,
      isStaff,
      isParent,
    ]
    const roleCount = roleSignals.filter(Boolean).length

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      primaryType,
      orgLabel,
      accountStatus: u.account_status ?? 'active',
      plan,
      lastLogin: u.last_login,
      badges: {
        representative: isRep,
        platformStaff: isStaff,
        parent: isParent,
        multiRole: roleCount > 1,
      },
    }
  })
}