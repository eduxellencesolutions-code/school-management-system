export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { verifyFlutterwaveTransaction } from '@/lib/payments/flutterwave'
import { verifyPaystackTransaction } from '@/lib/payments/paystack'
import { applySuccessfulSubscription } from '@/lib/payments/apply-subscription'

export async function GET(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get('provider')
  const ref = req.nextUrl.searchParams.get('ref')
  // Flutterwave's redirect also appends its own transaction_id — prefer
  // that for Flutterwave verification since tx_ref alone isn't enough
  // for their verify-by-id endpoint.
  const transactionId = req.nextUrl.searchParams.get('transaction_id')

  if (!provider || !ref) {
    return NextResponse.json({ status: 'error', message: 'Missing provider or reference' }, { status: 400 })
  }

  try {
    const verification = provider === 'flutterwave'
      ? await verifyFlutterwaveTransaction(transactionId ?? ref)
      : await verifyPaystackTransaction(ref)

    if (!verification.success) {
      return NextResponse.json({ status: 'error', message: verification.error ?? 'Verification failed' })
    }

    if (verification.status !== 'successful') {
      return NextResponse.json({ status: verification.status })
    }

    if (!verification.metadata) {
      return NextResponse.json({ status: 'error', message: 'Payment verified but no subscription details found' })
    }

    // ✅ Validate reference exists before applying
    if (!verification.reference) {
      console.error('Payment verified but provider returned no reference — refusing to apply subscription')
      return NextResponse.json({ status: 'error', message: 'Payment verification incomplete — please contact support' })
    }

    // ✅ Pass gateway and verification.reference to applySuccessfulSubscription
    // No fallback here — apply-subscription.ts owns the fallback logic centrally
    const applied = await applySuccessfulSubscription(
      verification.metadata,
      provider === 'flutterwave' ? 'flutterwave' : 'paystack',
      verification.reference,
      verification.amount
    )
    if (!applied.success) {
      return NextResponse.json({ status: 'error', message: applied.error ?? 'Failed to activate subscription' })
    }

    return NextResponse.json({ status: 'successful', plan: verification.metadata.plan })
  } catch (err: any) {
    console.error('Verify status error:', err)
    return NextResponse.json({ status: 'error', message: 'Something went wrong verifying your payment' }, { status: 500 })
  }
}