export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { initiateFlutterwaveCheckout } from '@/lib/payments/flutterwave'
import { initiatePaystackCheckout } from '@/lib/payments/paystack'
import { getPrice, BillingCycle, Currency, PaidPlan } from '@/lib/payments/pricing'
import { CheckoutMetadata } from '@/lib/payments/types'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

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
    email: profile?.email ?? user.email!,
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