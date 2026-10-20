export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'
import { initiateFlutterwaveCheckout } from '@/lib/payments/flutterwave'
import { initiatePaystackCheckout } from '@/lib/payments/paystack'
import { TopupCheckoutMetadata } from '@/lib/payments/types'

export async function POST(req: NextRequest) {
  const { quoteId, provider } = await req.json().catch(() => ({}))
  if (!['paystack', 'flutterwave'].includes(provider)) return NextResponse.json({ error: 'Invalid payment provider' }, { status: 400 })
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('organization_id, role, name, email').eq('id', user.id).single()
  if (!profile?.organization_id || profile.role !== 'admin') return NextResponse.json({ error: 'Only an institution admin can make billing payments' }, { status: 403 })
  const orgId = profile.organization_id

  const { data: billing } = await supabase.rpc('resolve_org_billing', { p_org_id: orgId })
  if (!billing?.ready) return NextResponse.json({ error: billing?.message ?? 'Billing is not available yet.', code: billing?.blocked_reason }, { status: 403 })
  if (!Array.isArray(billing.gateways) || !billing.gateways.includes(provider)) return NextResponse.json({ error: 'That payment method is not available for your billing country.' }, { status: 400 })

  const { data: list } = await supabase.rpc('get_org_topups', { p_org_id: orgId })
  const quote = (list ?? []).find((q: any) => q.id === quoteId)
  if (!quote || quote.status !== 'issued') return NextResponse.json({ error: 'This top-up quote is not open for payment.' }, { status: 400 })
  if (quote.currency !== billing.currency) return NextResponse.json({ error: 'Your billing currency changed. Please contact support.' }, { status: 409 })

  const amount = Number(quote.amount_due)
  const currency = quote.currency as 'NGN' | 'USD'
  const reference = `${quote.reference}-${Date.now().toString(36)}`
  const metadata: TopupCheckoutMetadata = { type: 'topup_subscription', organizationId: orgId, quoteReference: quote.reference, planKey: quote.target_plan, platform_key: 'results', expected_amount: amount, expected_currency: currency }
  const input = {
    email: profile.email ?? user.email ?? '', name: profile.name ?? 'Institution Admin', amount, currency, reference,
    redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/billing/verify?provider=${provider}&ref=${reference}`, metadata,
  }
  const result = provider === 'flutterwave' ? await initiateFlutterwaveCheckout(input) : await initiatePaystackCheckout(input)
  if (!result.success || !result.paymentLink) return NextResponse.json({ error: result.error ?? 'Failed to start checkout' }, { status: 500 })
  return NextResponse.json({ paymentLink: result.paymentLink, amount, currency })
}