export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { initiateFlutterwaveCheckout } from '@/lib/payments/flutterwave'
import { initiatePaystackCheckout } from '@/lib/payments/paystack'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'
import { TertiaryCheckoutMetadata, Currency } from '@/lib/payments/types'

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
    return NextResponse.json({ error: 'Only an institution admin can make tertiary billing payments' }, { status: 403 })
  }
  const orgId = profile.organization_id

  const { data: org, error: orgError } = await admin
    .from('organizations')
    .select('type, tertiary_plan')
    .eq('id', orgId)
    .single()

  if (orgError || !org) {
    return NextResponse.json({ error: 'Institution not found' }, { status: 404 })
  }
  if (org.type !== 'university') {
    return NextResponse.json({ error: 'Tertiary billing only applies to University/Polytechnic/College institutions' }, { status: 400 })
  }
  if (!org.tertiary_plan) {
    return NextResponse.json({ error: 'Please select a tertiary billing plan before proceeding to payment' }, { status: 400 })
  }

  const tentativeReference = `edux-tertiary-${orgId}-${Date.now()}`

  const { data: quote, error: quoteError } = await admin.rpc('create_tertiary_payment_quote', {
    p_org_id: orgId,
    p_reference: tentativeReference,
  })

  if (quoteError) {
    return NextResponse.json({ error: quoteError.message }, { status: 400 })
  }

  const reference = quote.reference as string
  const amount = quote.amount_due as number
  const currency = quote.currency as Currency

  const metadata: TertiaryCheckoutMetadata = {
    type: 'tertiary_subscription',
    organizationId: orgId,
    tierKey: quote.tier_key,
    billingCycle: quote.billing_cycle,
    platform_key: 'results',
    expected_amount: amount,
    expected_currency: currency,
  }

  const commonInput = {
    email: profile.email ?? user.email!,
    name: profile.name ?? 'Institution Admin',
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

  return NextResponse.json({ paymentLink: result.paymentLink, amount, currency, reused: quote.reused })
}