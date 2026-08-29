export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { initiateFlutterwaveCheckout } from '@/lib/payments/flutterwave'
import { initiatePaystackCheckout } from '@/lib/payments/paystack'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function POST(req: NextRequest) {
  const { provider } = await req.json() as { provider: 'flutterwave' | 'paystack' }
  if (!['flutterwave', 'paystack'].includes(provider)) {
    return NextResponse.json({ error: 'Invalid payment provider' }, { status: 400 })
  }

  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: profile } = await supabase
    .from('users').select('organization_id, role, name, email').eq('id', user.id).single()

  if (!profile?.organization_id || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Only a school admin can activate Founding 500' }, { status: 403 })
  }
  const orgId = profile.organization_id

  // Referral is resolved server-side from signup-time data — never
  // re-entered or trusted from the client at payment time.
  const { data: referral, error: referralError } = await admin
    .from('referrals')
    .select('referral_code, status')
    .eq('organization_id', orgId)
    .neq('status', 'rejected')
    .maybeSingle()

  if (referralError) {
    console.error('referrals query failed:', referralError)
    return NextResponse.json({ error: `Referral lookup failed: ${referralError.message}` }, { status: 500 })
  }
  if (!referral) {
    return NextResponse.json(
      { error: 'Founding 500 requires signing up through a valid representative referral link.' },
      { status: 400 }
    )
  }

  const { data: existingEnrollment } = await admin
    .from('founding500_enrollments')
    .select('id')
    .eq('campaign_key', 'founding_500')
    .eq('organization_id', orgId)
    .maybeSingle()
  if (existingEnrollment) {
    return NextResponse.json({ error: 'This school already has a Founding 500 enrollment' }, { status: 400 })
  }

  const { data: campaign, error: campaignError } = await admin
    .from('campaign_slot_counters')
    .select('slots_max, slots_claimed, is_active, qualifying_price')
    .eq('campaign_key', 'founding_500')
    .maybeSingle()

  if (campaignError) {
    console.error('campaign_slot_counters query failed:', campaignError)
    return NextResponse.json({ error: `Campaign lookup failed: ${campaignError.message}` }, { status: 500 })
  }
  if (!campaign || !campaign.is_active) {
    return NextResponse.json({ error: 'The Founding 500 campaign is not currently active' }, { status: 400 })
  }
  if (campaign.slots_claimed >= campaign.slots_max) {
    return NextResponse.json({ error: 'All Founding 500 slots have been claimed' }, { status: 400 })
  }

  const { data: org } = await admin
    .from('organizations').select('current_term_id').eq('id', orgId).single()
  if (!org?.current_term_id) {
    return NextResponse.json(
      { error: "Please set your school's current academic term before activating Founding 500" },
      { status: 400 }
    )
  }
  const { data: term } = await admin
    .from('terms').select('end_date').eq('id', org.current_term_id).single()
  if (!term?.end_date) {
    return NextResponse.json(
      { error: 'Your current academic term has no end date set. Please update it before activating Founding 500' },
      { status: 400 }
    )
  }

  const amount = campaign.qualifying_price
  const reference = `edux-f500-${orgId}-${Date.now()}`

  const metadata = {
    type: 'founding_500' as const,
    organizationId: orgId,
    platform_key: 'results',
    expected_amount: amount,
    expected_currency: 'NGN' as const,
    referral_code: referral.referral_code,
  }

  const commonInput = {
    email: profile.email ?? user.email!,
    name: profile.name ?? 'School Admin',
    amount,
    currency: 'NGN' as const,
    reference,
    redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/billing/verify?provider=${provider}&ref=${reference}`,
    metadata,
  }

  const result = provider === 'flutterwave'
    ? await initiateFlutterwaveCheckout(commonInput)
    : await initiatePaystackCheckout(commonInput)

  if (!result.success || !result.paymentLink) {
    return NextResponse.json({ error: result.error ?? 'Failed to start checkout' }, { status: 500 })
  }

  return NextResponse.json({ paymentLink: result.paymentLink })
}