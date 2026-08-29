import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('resource_categories').select('*').eq('is_active', true).order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ categories: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: canManage } = await supabase.rpc('has_platform_permission', { p_user_id: user.id, p_permission_key: 'representatives.view' })
  if (!canManage) return NextResponse.json({ error: 'You do not have permission to manage categories' }, { status: 403 })

  const { key, label, icon } = await request.json()
  if (!key || !label) return NextResponse.json({ error: 'key and label are required' }, { status: 400 })

  const { data, error } = await supabase
    .from('resource_categories').insert({ key, label, icon: icon ?? null }).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, id: data.id })
}