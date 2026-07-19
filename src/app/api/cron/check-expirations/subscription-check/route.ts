import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const GRACE_PERIOD_DAYS = 7

export async function GET(req: NextRequest) {
  // Vercel Cron sends a secret header — verify it matches, so this endpoint can't be triggered by anyone else
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const now = new Date()
  const results = { orgsMovedToGrace: 0, orgsMovedToExpired: 0, soloMovedToGrace: 0, soloMovedToExpired: 0 }

  // --- Organizations: active → grace (once expires_at has passed) ---
  const { data: orgsToGrace } = await admin
    .from('organizations')
    .select('id, subscription_expires_at')
    .eq('subscription_status', 'active')
    .not('subscription_expires_at', 'is', null)
    .lte('subscription_expires_at', now.toISOString())

  for (const org of orgsToGrace ?? []) {
    const graceEnd = new Date(now.getTime() + GRACE_PERIOD_DAYS * 86400000)
    await admin.from('organizations')
      .update({ subscription_status: 'grace_period', grace_period_ends_at: graceEnd.toISOString() })
      .eq('id', org.id)
    results.orgsMovedToGrace++
  }

  // --- Organizations: grace_period → expired (once grace period itself has passed) ---
  const { data: orgsToExpire } = await admin
    .from('organizations')
    .select('id')
    .eq('subscription_status', 'grace_period')
    .not('grace_period_ends_at', 'is', null)
    .lte('grace_period_ends_at', now.toISOString())

  for (const org of orgsToExpire ?? []) {
    await admin.from('organizations')
      .update({ subscription_status: 'expired' })
      .eq('id', org.id)
    results.orgsMovedToExpired++
  }

  // --- Solo teachers: same two transitions, on the users table ---
  const { data: soloToGrace } = await admin
    .from('users')
    .select('id, subscription_expires_at')
    .is('organization_id', null)
    .eq('subscription_status', 'active')
    .not('subscription_expires_at', 'is', null)
    .lte('subscription_expires_at', now.toISOString())

  for (const u of soloToGrace ?? []) {
    const graceEnd = new Date(now.getTime() + GRACE_PERIOD_DAYS * 86400000)
    await admin.from('users')
      .update({ subscription_status: 'grace_period', grace_period_ends_at: graceEnd.toISOString() })
      .eq('id', u.id)
    results.soloMovedToGrace++
  }

  const { data: soloToExpire } = await admin
    .from('users')
    .select('id')
    .is('organization_id', null)
    .eq('subscription_status', 'grace_period')
    .not('grace_period_ends_at', 'is', null)
    .lte('grace_period_ends_at', now.toISOString())

  for (const u of soloToExpire ?? []) {
    await admin.from('users')
      .update({ subscription_status: 'expired' })
      .eq('id', u.id)
    results.soloMovedToExpired++
  }

  console.log('Subscription check completed:', results)
  return NextResponse.json({ success: true, ranAt: now.toISOString(), ...results })
}
