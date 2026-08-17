export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { initiateFlutterwaveCheckout } from '@/lib/payments/flutterwave'
import { initiatePaystackCheckout } from '@/lib/payments/paystack'
import { FoundingCheckoutMetadata } from '@/lib/payments/types'

export async function POST(req: NextRequest) {
  const { provider } = await req.json() as { provider: 'flutterwave' | 'paystack' }
  if (!['flutterwave', 'paystack'].includes(provider)) {
    return NextResponse.json({ error: 'Invalid payment provider' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('organization_id, role, name, email').eq('id', user.id).single()

  if (!profile?.organization_id || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Only a school admin can enroll their school in Founding 500' }, { status: 403 })
  }
  const orgId = profile.organization_id

  // ── Pre-flight checks — UX only, NOT the real security boundary.
  // enroll_founding_500() re-validates everything at confirmation time
  // regardless; this just avoids charging someone for an enrollment
  // that's already doomed (e.g. no slots left, already enrolled).

  const { data: campaign } = await supabase
    .from('campaign_slot_counters')
    .select('slots_max, slots_claimed, is_active, qualifying_price')
    .eq('campaign_key', 'founding_500')
    .single()

  if (!campaign || !campaign.is_active) {
    return NextResponse.json({ error: 'The Founding 500 campaign is not currently active' }, { status: 400 })
  }
  if (campaign.slots_claimed >= campaign.slots_max) {
    return NextResponse.json({ error: 'All Founding 500 slots have been claimed' }, { status: 400 })
  }

  const { data: existingEnrollment } = await supabase
    .from('founding500_enrollments')
    .select('id')
    .eq('organization_id', orgId)
    .maybeSingle()
  if (existingEnrollment) {
    return NextResponse.json({ error: 'This school is already enrolled in Founding 500' }, { status: 400 })
  }

  const { data: referral } = await supabase
    .from('referrals')
    .select('id')
    .eq('organization_id', orgId)
    .eq('status', 'pending')
    .maybeSingle()
  if (!referral) {
    return NextResponse.json(
      { error: 'No valid representative referral found for this school. Founding 500 requires signing up through a referral link.' },
      { status: 400 }
    )
  }

  const { data: org } = await supabase
    .from('organizations').select('current_term_id').eq('id', orgId).single()
  if (!org?.current_term_id) {
    return NextResponse.json(
      { error: 'Please set your school\'s current academic term before enrolling in Founding 500' },
      { status: 400 }
    )
  }
  const { data: term } = await supabase
    .from('terms').select('end_date').eq('id', org.current_term_id).single()
  if (!term?.end_date) {
    return NextResponse.json(
      { error: 'Your current academic term has no end date set. Please update it before enrolling in Founding 500' },
      { status: 400 }
    )
  }

  // ── Checkout ──
  const amount = campaign.qualifying_price
  const reference = `edux-founding500-${orgId}-${Date.now()}`

  const metadata: FoundingCheckoutMetadata = {
    type: 'founding_500',
    organizationId: orgId,
    platform_key: 'results',
    expected_amount: amount,
    expected_currency: 'NGN',
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