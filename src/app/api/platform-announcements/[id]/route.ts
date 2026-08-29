import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')
  const { data: canManage } = await supabase.rpc('has_platform_permission', {
    p_user_id: user.id,
    p_permission_key: 'announcements.manage',
  })
  if (!isSuperAdmin && !canManage) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id)
    .is('organization_id', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}