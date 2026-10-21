export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'
import { initiateFlutterwaveCheckout } from '@/lib/payments/flutterwave'
import { initiatePaystackCheckout } from '@/lib/payments/paystack'
import { CheckoutMetadata } from '@/lib/payments/types'

export async function POST(req: NextRequest) {
  const { cycle, provider, expectedAmount } = await req.json().catch(() => ({}))
  if (!['termly', 'annual'].includes(cycle)) return NextResponse.json({ error: 'Invalid billing cycle' }, { status: 400 })
  if (!['paystack', 'flutterwave'].includes(provider)) return NextResponse.json({ error: 'Invalid payment provider' }, { status: 400 })
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { data: profile } = await supabase.from('users').select('organization_id, name, email').eq('id', user.id).single()
  if (profile?.organization_id) return NextResponse.json({ error: 'Your institution manages its own billing.' }, { status: 403 })

  const { data: opts, error } = await supabase.rpc('get_solo_plan_options')
  if (error || !opts) return NextResponse.json({ error: error?.message ?? 'Billing is not available' }, { status: 500 })
  if (!opts.billing?.ready) return NextResponse.json({ error: opts.billing?.message ?? 'Billing is not available yet.', code: opts.billing?.blocked_reason }, { status: 403 })
  if (!opts.available) return NextResponse.json({ error: opts.message ?? 'This plan is not available for online payment yet.' }, { status: 400 })
  if (!opts.billing.gateways?.includes(provider)) return NextResponse.json({ error: 'That payment method is not available for your billing country.' }, { status: 400 })

  const amount = Number(opts[cycle].charge)
  const currency = opts.currency as 'NGN' | 'USD'
  if (Number.isFinite(Number(expectedAmount)) && Math.abs(amount - Number(expectedAmount)) > 0.005) {
    return NextResponse.json({ error: 'The amount changed since you reviewed it. Please review it again.', code: 'quote_changed', amount }, { status: 409 })
  }
  const reference = `edux-solo-${user.id}-${Date.now()}`
  const metadata = {
    type: 'subscription', accountType: 'solo', accountId: user.id, plan: 'solo_teacher_pro', cycle,
    platform_key: 'results', expected_amount: amount, expected_currency: currency,
  } as unknown as CheckoutMetadata
  const input = {
    email: profile?.email ?? user.email ?? '', name: profile?.name ?? 'Teacher', amount, currency, reference,
    redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/billing/verify?provider=${provider}&ref=${reference}`, metadata,
  }
  const result = provider === 'flutterwave' ? await initiateFlutterwaveCheckout(input as any) : await initiatePaystackCheckout(input as any)
  if (!result.success || !result.paymentLink) return NextResponse.json({ error: result.error ?? 'Failed to start checkout' }, { status: 500 })
  return NextResponse.json({ paymentLink: result.paymentLink, amount, currency })
}