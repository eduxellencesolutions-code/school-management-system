import { createClient } from '@/lib/supabase/server'
import { getSubscriptionState } from '@/lib/subscription/getSubscriptionState'
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
  let isSubscriber = false

  if (orgId) {
    audiences.add('subscribers')
    audiences.add('staff')
    isSubscriber = true
  } else {
    const { data: ownedGroup } = await supabase
      .from('groups')
      .select('id')
      .eq('instructor_id', user.id)
      .limit(1)
      .maybeSingle()
    if (ownedGroup) {
      audiences.add('subscribers')
      isSubscriber = true
    }
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

  // ── Auto-generated subscription reminder, personalized per subscriber ──
  const systemEntries: typeof announcements = []
  if (isSubscriber) {
    const subState = await getSubscriptionState(supabase, user.id)

    if (subState.isExpiringSoon && subState.expiresAt) {
      const dt = new Date(subState.expiresAt)
      const formatted = dt.toLocaleString('en-NG', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
      })
      systemEntries.push({
        id: 'system-expiring-soon',
        title: '⚠️ Subscription Expiring Soon',
        body: `Your subscription expires on ${formatted}. Renew now to avoid any interruption to your account.`,
        audience: 'subscribers',
        created_at: new Date().toISOString(),
        expires_at: subState.expiresAt,
        organization_id: orgId,
      })
    } else if (subState.isGracePeriod && subState.graceEndsAt) {
      const dt = new Date(subState.graceEndsAt)
      const formatted = dt.toLocaleString('en-NG', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
      })
      systemEntries.push({
        id: 'system-grace-period',
        title: '🔴 Subscription Expired — Grace Period',
        body: `Your subscription has expired. You have until ${formatted} to renew before access is restricted.`,
        audience: 'subscribers',
        created_at: new Date().toISOString(),
        expires_at: subState.graceEndsAt,
        organization_id: orgId,
      })
    } else if (subState.isExpired) {
      systemEntries.push({
        id: 'system-expired',
        title: '🔴 Subscription Expired',
        body: 'Your subscription has expired and your access is now limited. Renew now to restore full access.',
        audience: 'subscribers',
        created_at: new Date().toISOString(),
        expires_at: null,
        organization_id: orgId,
      })
    }
  }

  return NextResponse.json({ announcements: [...systemEntries, ...announcements] })
}