export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'
import { initiateFlutterwaveCheckout } from '@/lib/payments/flutterwave'
import { initiatePaystackCheckout } from '@/lib/payments/paystack'
import { K12CheckoutMetadata } from '@/lib/payments/types'

// Payment providers reject reserved test TLDs (.invalid, .test, .example).
// Swap those for a real address so the test flow can proceed. This is
// safe in production because RFC 2606 guarantees .invalid/.test/.example
// are never real domains — no real user has such an email.
const PROVIDER_SAFE_EMAIL = 'no-reply@eduxellence.org'
function paymentEmail(profileEmail: string | null | undefined, userEmail: string | null | undefined): string {
  const raw = profileEmail ?? userEmail ?? ''
  if (/\.(invalid|test|example)$/i.test(raw)) {
    return PROVIDER_SAFE_EMAIL
  }
  return raw
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const plan = String(body.plan ?? '')
  const cycle = body.cycle as 'termly' | 'annual'
  const provider = body.provider as 'paystack' | 'flutterwave'
  const expectedAmount = Number(body.expectedAmount)
  if (!['termly', 'annual'].includes(cycle)) return NextResponse.json({ error: 'Invalid billing cycle' }, { status: 400 })
  if (!['paystack', 'flutterwave'].includes(provider)) return NextResponse.json({ error: 'Invalid payment provider' }, { status: 400 })

  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('organization_id, role, name, email').eq('id', user.id).single()
  if (!profile?.organization_id || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Only an institution admin can make billing payments' }, { status: 403 })
  }
  const orgId = profile.organization_id

  const { data: gateways } = await supabase.rpc('get_available_gateways', { p_currency: 'NGN', p_scope: 'k12' })
  if (!Array.isArray(gateways) || !gateways.includes(provider)) {
    return NextResponse.json({ error: 'That payment method is not available right now.' }, { status: 400 })
  }

  const { data: quote, error: quoteError } = await supabase.rpc('create_k12_payment_quote', {
    p_org_id: orgId, p_plan: plan, p_cycle: cycle, p_reference: `edux-k12q-${orgId}-${Date.now()}`,
  })
  if (quoteError || !quote) return NextResponse.json({ error: quoteError?.message ?? 'Could not create a quote' }, { status: 400 })

  const amount = Number(quote.amount_due)
  if (Number.isFinite(expectedAmount) && Math.abs(amount - expectedAmount) > 0.005) {
    return NextResponse.json({ error: 'The amount changed since you reviewed it. Please review the updated quote.', code: 'quote_changed', amount }, { status: 409 })
  }

  const reference = `${quote.reference}-${Date.now().toString(36)}`
  const metadata: K12CheckoutMetadata = {
    type: 'k12_subscription', organizationId: orgId, quoteReference: quote.reference, planKey: quote.plan_key,
    billingCycle: quote.billing_cycle, platform_key: 'results', expected_amount: amount, expected_currency: 'NGN',
  }
  const input = {
    email: paymentEmail(profile.email, user.email), name: profile.name ?? 'Institution Admin', amount, currency: 'NGN' as const,
    reference, redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/billing/verify?provider=${provider}&ref=${reference}`, metadata,
  }
  const result = provider === 'flutterwave' ? await initiateFlutterwaveCheckout(input) : await initiatePaystackCheckout(input)
  if (!result.success || !result.paymentLink) return NextResponse.json({ error: result.error ?? 'Failed to start checkout' }, { status: 500 })
  return NextResponse.json({ paymentLink: result.paymentLink, amount, currency: 'NGN', periodLabel: quote.period_label })
}