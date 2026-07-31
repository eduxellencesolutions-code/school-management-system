import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const audiences = new Set<string>(['all'])

  const { data: userRow } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()

  const orgId = userRow?.organization_id ?? null

  if (orgId) {
    audiences.add('subscribers')
    audiences.add('staff')
  } else {
    const { data: ownedGroup } = await supabase
      .from('groups')
      .select('id')
      .eq('instructor_id', user.id)
      .limit(1)
      .maybeSingle()
    if (ownedGroup) audiences.add('subscribers')
  }

  const { data: staffRow } = await supabase
    .from('platform_staff')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (staffRow) audiences.add('platform_staff')

  const { data: repRow } = await supabase
    .from('representatives')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (repRow) audiences.add('representatives')

  const { data: rows, error } = await supabase
    .from('announcements')
    .select('id, title, body, audience, created_at, expires_at, organization_id')
    .or(orgId ? `organization_id.eq.${orgId},organization_id.is.null` : 'organization_id.is.null')
    .in('audience', [...audiences])
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const now = Date.now()
  const announcements = (rows ?? [])
    .filter(a => !a.expires_at || new Date(a.expires_at).getTime() > now)
    .slice(0, 10)

  return NextResponse.json({ announcements })
}