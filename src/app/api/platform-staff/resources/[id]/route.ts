import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
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

  // Read current status before updating, so we only notify on a genuine
  // draft/archived -> published transition, not on every edit to an
  // already-published resource.
  const { data: before } = await supabase.from('representative_resources').select('title, status').eq('id', id).maybeSingle()

  const { error } = await supabase.from('representative_resources').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const isNewlyPublished = updates.status === 'published' && before?.status !== 'published'
  if (isNewlyPublished) {
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: reps } = await admin.from('representatives').select('user_id').not('user_id', 'is', null)
    const targetUserIds = (reps ?? []).map(r => r.user_id)
    if (targetUserIds.length > 0) {
      const title = updates.title ?? before?.title ?? 'New resource'
      const notificationRows = targetUserIds.map(uid => ({
        user_id: uid,
        organization_id: null,
        title: 'New resource published',
        body: `"${title}" is now available in the Resource Centre.`,
        is_read: false,
        metadata: { type: 'resource_published', link: '/rep/resources' },
      }))
      await admin.from('notifications').insert(notificationRows)
    }
  }

  return NextResponse.json({ success: true })
}
