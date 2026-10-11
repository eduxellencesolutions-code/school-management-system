export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { initiateFlutterwaveCheckout } from '@/lib/payments/flutterwave'
import { initiatePaystackCheckout } from '@/lib/payments/paystack'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'
import { Currency } from '@/lib/payments/pricing'
import { TertiaryCheckoutMetadata } from '@/lib/payments/types'

// Payment providers reject reserved test TLDs (.invalid, .test, .example).
// In non-production, swap those for a real address so the test flow can proceed.
const PROVIDER_SAFE_EMAIL = 'no-reply@eduxellence.org'
function paymentEmail(profileEmail: string | null, userEmail: string | null): string {
  const raw = profileEmail ?? userEmail ?? ''
  if (process.env.NODE_ENV !== 'production' && /\.(invalid|test|example)$/i.test(raw)) {
    return PROVIDER_SAFE_EMAIL
  }
  return raw
}

export async function POST(req: NextRequest) {
  if (process.env.TERTIARY_BILLING_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Tertiary billing checkout is not yet available.' }, { status: 503 })
  }
  const body = await req.json().catch(() => ({}))
  const provider = body.provider as 'flutterwave' | 'paystack'
  const kind: 'period' | 'founding_conversion' = body.kind === 'founding_conversion' ? 'founding_conversion' : 'period'
  const applicationId = typeof body.applicationId === 'string' ? body.applicationId : null
  if (!['flutterwave', 'paystack'].includes(provider)) return NextResponse.json({ error: 'Invalid payment provider' }, { status: 400 })
  if (kind === 'founding_conversion' && !applicationId) return NextResponse.json({ error: 'Application is required' }, { status: 400 })

  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('organization_id, role, name, email').eq('id', user.id).single()
  if (!profile?.organization_id || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Only an institution admin can make tertiary billing payments' }, { status: 403 })
  }
  const orgId = profile.organization_id
  const { data: org } = await supabase.from('organizations').select('type').eq('id', orgId).single()
  if (org?.type !== 'university') {
    return NextResponse.json({ error: 'Tertiary billing only applies to University/Polytechnic/College institutions' }, { status: 400 })
  }

  const quoteReference = `edux-tq-${orgId}-${Date.now()}`
  const { data: quote, error: quoteError } = kind === 'period'
    ? await supabase.rpc('create_tertiary_payment_quote', { p_org_id: orgId, p_reference: quoteReference })
    : await supabase.rpc('create_founding_conversion_quote', { p_application_id: applicationId, p_reference: quoteReference })
  if (quoteError || !quote) return NextResponse.json({ error: quoteError?.message ?? 'Could not create a quote' }, { status: 400 })

  const amount = Number(quote.amount_due)
  const currency = quote.currency as Currency
  const reference = `${quote.reference}-${Date.now().toString(36)}`

  const metadata: TertiaryCheckoutMetadata = {
    type: 'tertiary_subscription', quoteKind: kind, organizationId: orgId, quoteReference: quote.reference,
    tierKey: quote.tier_key ?? undefined, billingCycle: quote.billing_cycle ?? undefined,
    platform_key: 'results', expected_amount: amount, expected_currency: currency,
  }
  const commonInput = {
    email: paymentEmail(profile.email, user.email ?? null),
    name: profile.name ?? 'Institution Admin', amount, currency, reference,
    redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/billing/verify?provider=${provider}&ref=${reference}`, metadata,
  }
  const result = provider === 'flutterwave' ? await initiateFlutterwaveCheckout(commonInput) : await initiatePaystackCheckout(commonInput)
  if (!result.success || !result.paymentLink) return NextResponse.json({ error: result.error ?? 'Failed to start checkout' }, { status: 500 })

  return NextResponse.json({ paymentLink: result.paymentLink, amount, currency, reused: quote.reused, periodLabel: quote.period_label ?? null })
}