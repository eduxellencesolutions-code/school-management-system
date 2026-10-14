export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { initiateFlutterwaveCheckout } from '@/lib/payments/flutterwave'
import { initiatePaystackCheckout } from '@/lib/payments/paystack'
import { getPrice, BillingCycle, Currency, PaidPlan } from '@/lib/payments/pricing'
import { CheckoutMetadata } from '@/lib/payments/types'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

const PROVIDER_SAFE_EMAIL = 'no-reply@eduxellence.org'
function paymentEmail(profileEmail: string | null | undefined, userEmail: string | null | undefined): string {
  const raw = profileEmail ?? userEmail ?? ''
  if (process.env.NODE_ENV !== 'production' && /\.(invalid|test|example)$/i.test(raw)) {
    return PROVIDER_SAFE_EMAIL
  }
  return raw
}

export async function POST(req: NextRequest) {
  const { plan, currency, cycle, provider } = await req.json() as {
    plan: PaidPlan
    currency: Currency
    cycle: BillingCycle
    provider: 'flutterwave' | 'paystack'
  }

  const validPlans = ['small_school', 'standard_school', 'premium_school', 'solo_teacher_pro']
  if (!validPlans.includes(plan)) {
    console.error('Invalid plan received:', plan)
    return NextResponse.json({ error: `Invalid plan: ${plan}` }, { status: 400 })
  }
  if (!['NGN', 'USD'].includes(currency)) {
    return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })
  }
  if (!['termly', 'annual'].includes(cycle)) {
    return NextResponse.json({ error: 'Invalid billing cycle' }, { status: 400 })
  }
  if (!['flutterwave', 'paystack'].includes(provider)) {
    return NextResponse.json({ error: 'Invalid payment provider' }, { status: 400 })
  }

  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users').select('organization_id, name, email').eq('id', user.id).single()

  if (profile?.organization_id) {
    return NextResponse.json({ error: 'Please use the plan and payment wizard in Settings.' }, { status: 403 })
  }

  if (profile?.organization_id) {
    const { data: eligible } = await supabase.rpc('org_plan_eligibility', { p_org_id: profile.organization_id, p_plan: plan })
    if (!eligible) return NextResponse.json({ error: 'This plan is not available for your institution type.' }, { status: 403 })
  } else if (plan !== 'solo_teacher_pro') {
    return NextResponse.json({ error: 'This plan is not available for individual teachers.' }, { status: 403 })
  }

  const accountType = profile?.organization_id ? 'org' : 'solo'
  const accountId = profile?.organization_id ?? user.id

  const amount = getPrice(plan, currency, cycle)
  const reference = `edux-${accountType}-${accountId}-${Date.now()}`

  // NEW: platform_key lets the central payments router identify this as
  // a Results transaction. expected_amount/currency let the router catch
  // a tampered/mismatched amount before it ever reaches this app.
  const metadata: CheckoutMetadata = {
    type: 'subscription',
    accountType,
    accountId,
    plan,
    cycle,
    platform_key: 'results',
    expected_amount: amount,
    expected_currency: currency,
  }

  const commonInput = {
    email: paymentEmail(profile?.email, user.email),
    name: profile?.name ?? 'Customer',
    amount,
    currency,
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