import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')
  const { data: canManage } = await supabase.rpc('has_platform_permission', {
    p_user_id: user.id,
    p_permission_key: 'announcements.manage',
  })
  if (!isSuperAdmin && !canManage) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, body, audience, expires_at, created_at, created_by')
    .is('organization_id', null)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ announcements: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')
  const { data: canManage } = await supabase.rpc('has_platform_permission', {
    p_user_id: user.id,
    p_permission_key: 'announcements.manage',
  })
  if (!isSuperAdmin && !canManage) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const body = await request.json()
  const { title, message, audience, expiresAt } = body

  if (!title || !message || !audience) {
    return NextResponse.json({ error: 'Missing title, message, or audience' }, { status: 400 })
  }

  // Insert the announcement
  const { error: insertError } = await supabase.from('announcements').insert({
    title,
    body: message,
    audience,
    organization_id: null,
    created_by: user.id,
    expires_at: expiresAt || null,
  })

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // ── Fan out in-app notification ONLY to users matching the selected audience ──
  const { createClient: createServiceClient } = await import('@supabase/supabase-js')
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  let targetUserIds: string[] = []

  if (audience === 'all') {
    const { data: allUsers } = await admin.from('users').select('id')
    targetUserIds = (allUsers ?? []).map(u => u.id)
  } else if (audience === 'platform_staff') {
    const { data: staffUsers } = await admin.from('platform_staff').select('user_id').eq('status', 'active')
    targetUserIds = (staffUsers ?? []).map(s => s.user_id)
  } else if (audience === 'representatives') {
    const { data: repUsers } = await admin.from('representatives').select('user_id')
    targetUserIds = (repUsers ?? []).map(r => r.user_id)
  } else if (audience === 'subscribers') {
    const { data: orgUsers } = await admin.from('users').select('id').not('organization_id', 'is', null)
    const { data: soloGroups } = await admin.from('groups').select('instructor_id')
    const soloIds = [...new Set((soloGroups ?? []).map(g => g.instructor_id))]
    targetUserIds = [...new Set([...(orgUsers ?? []).map(u => u.id), ...soloIds])]
  } else if (audience === 'parents') {
    const { data: parentUsers } = await admin.from('parent_accounts').select('auth_user_id')
    targetUserIds = (parentUsers ?? []).map(p => p.auth_user_id)
  }

  if (targetUserIds.length > 0) {
    const { data: userOrgMap } = await admin.from('users').select('id, organization_id').in('id', targetUserIds)
    const orgMap = new Map((userOrgMap ?? []).map(u => [u.id, u.organization_id]))

    const notificationRows = targetUserIds.map(uid => ({
      user_id: uid,
      organization_id: orgMap.get(uid) ?? null,
      title: title,
      body: message,
      is_read: false,
      metadata: { type: 'platform_announcement' },
    }))

    const { error: notifError } = await admin
      .from('notifications')
      .insert(notificationRows)

    if (notifError) {
      console.error('Failed to fan out notifications:', notifError)
      // Don't fail the request - announcement was created successfully
    }
  }

  return NextResponse.json({ success: true })
}