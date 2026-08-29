export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function GET() {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return NextResponse.json({ eligible: false }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()

  if (!profile?.organization_id) {
    return NextResponse.json({ eligible: false })
  }
  const orgId = profile.organization_id

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: referral } = await admin
    .from('referrals')
    .select('referral_code, status, representative_id')
    .eq('organization_id', orgId)
    .neq('status', 'rejected')
    .maybeSingle()

  if (!referral) {
    return NextResponse.json({ eligible: false })
  }

  const { data: existingEnrollment } = await admin
    .from('founding500_enrollments')
    .select('id, status')
    .eq('campaign_key', 'founding_500')
    .eq('organization_id', orgId)
    .maybeSingle()

  if (existingEnrollment) {
    return NextResponse.json({ eligible: false, alreadyEnrolled: true, enrollmentStatus: existingEnrollment.status })
  }

  const { data: campaign } = await admin
    .from('campaign_slot_counters')
    .select('slots_max, slots_claimed, is_active, qualifying_price')
    .eq('campaign_key', 'founding_500')
    .maybeSingle()

  if (!campaign || !campaign.is_active || campaign.slots_claimed >= campaign.slots_max) {
    return NextResponse.json({ eligible: false, campaignClosed: true })
  }

  return NextResponse.json({
    eligible: true,
    referral_code: referral.referral_code,
    qualifying_price: campaign.qualifying_price,
    slots_remaining: campaign.slots_max - campaign.slots_claimed,
  })
}