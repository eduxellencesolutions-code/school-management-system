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

  const { error } = await supabase.from('announcements').insert({
    title,
    body: message,
    audience,
    organization_id: null,
    created_by: user.id,
    expires_at: expiresAt || null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}