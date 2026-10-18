export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'
import { initiateFlutterwaveCheckout } from '@/lib/payments/flutterwave'
import { initiatePaystackCheckout } from '@/lib/payments/paystack'
import { CentreCheckoutMetadata } from '@/lib/payments/types'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const plan = String(body.plan ?? '')
  const cycle = body.cycle as 'monthly' | 'quarterly' | 'annual'
  const provider = body.provider as 'paystack' | 'flutterwave'
  const expectedAmount = Number(body.expectedAmount)
  if (!['monthly', 'quarterly', 'annual'].includes(cycle)) return NextResponse.json({ error: 'Invalid billing cycle' }, { status: 400 })
  if (!['paystack', 'flutterwave'].includes(provider)) return NextResponse.json({ error: 'Invalid payment provider' }, { status: 400 })

  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('organization_id, role, name, email').eq('id', user.id).single()
  if (!profile?.organization_id || profile.role !== 'admin') return NextResponse.json({ error: 'Only an institution admin can make billing payments' }, { status: 403 })
  const orgId = profile.organization_id

  const { data: billing } = await supabase.rpc('resolve_org_billing', { p_org_id: orgId })
  if (!billing?.ready) return NextResponse.json({ error: billing?.message ?? 'Billing is not available for your institution yet.', code: billing?.blocked_reason }, { status: 403 })
  if (!Array.isArray(billing.gateways) || !billing.gateways.includes(provider)) {
    return NextResponse.json({ error: 'That payment method is not available for your billing country.' }, { status: 400 })
  }

  const { data: quote, error: quoteError } = await supabase.rpc('create_centre_payment_quote', {
    p_org_id: orgId, p_plan: plan, p_cycle: cycle, p_reference: `edux-cq-${orgId}-${Date.now()}`,
  })
  if (quoteError || !quote) {
    const msg = quoteError?.message ?? 'Could not create a quote'
    return NextResponse.json({ error: msg, code: /awaiting verification/i.test(msg) ? 'type_unverified' : undefined }, { status: /awaiting verification|billing/i.test(msg) ? 403 : 400 })
  }
  const amount = Number(quote.amount_due)
  if (Number.isFinite(expectedAmount) && Math.abs(amount - expectedAmount) > 0.005) {
    return NextResponse.json({ error: 'The amount changed since you reviewed it. Please review the updated quote.', code: 'quote_changed', amount }, { status: 409 })
  }
  const currency = quote.currency as 'NGN' | 'USD'
  const reference = `${quote.reference}-${Date.now().toString(36)}`
  const metadata: CentreCheckoutMetadata = {
    type: 'centre_subscription', organizationId: orgId, quoteReference: quote.reference, planKey: quote.plan_key, billingCycle: quote.billing_cycle,
    platform_key: 'results', expected_amount: amount, expected_currency: currency,
  }
  const input = {
    email: profile.email ?? user.email ?? '', name: profile.name ?? 'Institution Admin', amount, currency, reference,
    redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/billing/verify?provider=${provider}&ref=${reference}`, metadata,
  }
  const result = provider === 'flutterwave' ? await initiateFlutterwaveCheckout(input) : await initiatePaystackCheckout(input)
  if (!result.success || !result.paymentLink) return NextResponse.json({ error: result.error ?? 'Failed to start checkout' }, { status: 500 })
  return NextResponse.json({ paymentLink: result.paymentLink, amount, currency })
}