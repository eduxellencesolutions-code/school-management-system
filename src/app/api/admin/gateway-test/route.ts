export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'
import { initiateFlutterwaveCheckout } from '@/lib/payments/flutterwave'
import { initiatePaystackCheckout } from '@/lib/payments/paystack'
import { GatewayTestMetadata } from '@/lib/payments/types'

export async function POST(req: NextRequest) {
  const { gateway, currency, amount } = await req.json().catch(() => ({}))
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { data: isSuper } = await supabase.rpc('is_super_admin')
  if (!isSuper) return NextResponse.json({ error: 'Super Admin only' }, { status: 403 })
  if (!['paystack', 'flutterwave'].includes(gateway)) return NextResponse.json({ error: 'Invalid gateway' }, { status: 400 })
  if (!['NGN', 'USD'].includes(currency)) return NextResponse.json({ error: 'Currency must be NGN or USD' }, { status: 400 })
  const amt = Number(amount)
  const max = currency === 'NGN' ? 5000 : 50
  if (!(amt > 0 && amt <= max)) return NextResponse.json({ error: `Amount must be above 0 and at most ${max}` }, { status: 400 })

  const reference = `edux-gwtest-${Date.now()}`
  const { error } = await supabase.rpc('create_gateway_test_run', { p_gateway: gateway, p_currency: currency, p_amount: amt, p_reference: reference })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { data: profile } = await supabase.from('users').select('name, email').eq('id', user.id).single()
  const metadata: GatewayTestMetadata = { type: 'gateway_test', runReference: reference, platform_key: 'results', expected_amount: amt, expected_currency: currency }
  const input = {
    email: profile?.email ?? user.email ?? '', name: profile?.name ?? 'Super Admin', amount: amt, currency, reference,
    redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/billing/verify?provider=${gateway}&ref=${reference}`, metadata,
  }
  const result = gateway === 'flutterwave' ? await initiateFlutterwaveCheckout(input) : await initiatePaystackCheckout(input)
  if (!result.success || !result.paymentLink) return NextResponse.json({ error: result.error ?? 'Checkout failed to start' }, { status: 500 })
  return NextResponse.json({ paymentLink: result.paymentLink, reference })
}