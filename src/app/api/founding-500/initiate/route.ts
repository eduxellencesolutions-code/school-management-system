export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { initiateFlutterwaveCheckout } from '@/lib/payments/flutterwave'
import { initiatePaystackCheckout } from '@/lib/payments/paystack'

export async function POST(req: NextRequest) {
  const { referral_code, provider } = await req.json() as {
    referral_code: string
    provider: 'flutterwave' | 'paystack'
  }

  if (!referral_code) {
    return NextResponse.json({ error: 'referral_code is required' }, { status: 400 })
  }
  if (!['flutterwave', 'paystack'].includes(provider)) {
    return NextResponse.json({ error: 'Invalid payment provider' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: profile } = await supabase
    .from('users').select('organization_id, name, email').eq('id', user.id).single()

  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'Founding 500 is only available to institution accounts' }, { status: 400 })
  }
  const orgId = profile.organization_id

  // Pre-checks — fail fast BEFORE charging, so a real ₦2,000 payment is
  // never taken for a slot/referral that's already invalid. These mirror
  // the RPC's own checks but run before money moves, not after.
  const { data: campaign } = await admin
    .from('campaign_slot_counters')
    .select('slots_max, slots_claimed, is_active, qualifying_price')
    .eq('campaign_key', 'founding_500')
    .maybeSingle()

  if (!campaign) {
    return NextResponse.json({ error: 'Founding 500 campaign not found' }, { status: 400 })
  }
  if (!campaign.is_active) {
    return NextResponse.json({ error: 'Founding 500 campaign is not currently active' }, { status: 400 })
  }
  if (campaign.slots_claimed >= campaign.slots_max) {
    return NextResponse.json({ error: 'Founding 500 is fully claimed' }, { status: 400 })
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

  const { data: referral } = await admin
    .from('referrals')
    .select('id')
    .eq('organization_id', orgId)
    .eq('referral_code', referral_code)
    .maybeSingle()

  if (!referral) {
    return NextResponse.json({ error: 'No matching referral found for this school and referral code' }, { status: 400 })
  }

  const amount = campaign.qualifying_price // 2000, NGN, both providers
  const reference = `edux-f500-${orgId}-${Date.now()}`

  const metadata = {
    accountType: 'org' as const,
    accountId: orgId,
    plan: 'founding_500' as const,
    referral_code,
    platform_key: 'results',
    expected_amount: amount,
    expected_currency: 'NGN' as const,
  }

  const commonInput = {
    email: profile.email ?? user.email!,
    name: profile.name ?? 'Customer',
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