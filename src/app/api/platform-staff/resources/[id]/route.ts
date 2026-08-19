import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: canManage } = await supabase.rpc('has_platform_permission', { p_user_id: user.id, p_permission_key: 'representatives.view' })
  if (!canManage) return NextResponse.json({ error: 'You do not have permission to manage resources' }, { status: 403 })

  const body = await request.json()
  const allowedFields = [
    'title', 'description', 'category_id', 'product', 'campaign_key', 'version',
    'effective_date', 'expiry_date', 'status', 'visibility', 'visible_group',
    'is_featured', 'is_important',
  ]
  const updates: Record<string, any> = { updated_by: user.id, updated_at: new Date().toISOString() }
  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key]
  }

  const { error } = await supabase.from('representative_resources').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}