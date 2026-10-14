export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { verifyFlutterwaveTransaction } from '@/lib/payments/flutterwave'
import { verifyPaystackTransaction } from '@/lib/payments/paystack'
import { applyVerifiedPayment } from '@/lib/payments/dispatch'

export async function GET(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get('provider')
  const ref = req.nextUrl.searchParams.get('ref')
  const transactionId = req.nextUrl.searchParams.get('transaction_id')
  if (!provider || !ref) return NextResponse.json({ status: 'error', message: 'Missing provider or reference' }, { status: 400 })

  try {
    const verification = provider === 'flutterwave'
      ? await verifyFlutterwaveTransaction(transactionId ?? ref)
      : await verifyPaystackTransaction(ref)
    if (!verification.success) return NextResponse.json({ status: 'error', message: verification.error ?? 'Verification failed' })
    if (verification.status !== 'successful') return NextResponse.json({ status: verification.status })
    if (!verification.metadata) return NextResponse.json({ status: 'error', message: 'Payment verified but no subscription details found' })
    if (!verification.reference || verification.amount === undefined) {
      return NextResponse.json({ status: 'error', message: 'Payment verification incomplete — please contact support' })
    }

    const applied = await applyVerifiedPayment(verification, provider === 'flutterwave' ? 'flutterwave' : 'paystack')
    if (!applied.success) {
      if (applied.needsReview) return NextResponse.json({ status: 'needs_review', message: applied.error })
      return NextResponse.json({ status: 'error', message: applied.error ?? 'Failed to activate subscription' })
    }

    const m = verification.metadata
    const plan = m.type === 'founding_500' ? 'founding_500'
      : m.type === 'tertiary_subscription' ? (m.tierKey ?? 'founding_conversion')
      : m.type === 'k12_subscription' ? m.planKey
      : m.plan
    return NextResponse.json({ status: 'successful', plan })
  } catch (err) {
    console.error('Verify status error:', err)
    return NextResponse.json({ status: 'error', message: 'Something went wrong verifying your payment' }, { status: 500 })
  }
}