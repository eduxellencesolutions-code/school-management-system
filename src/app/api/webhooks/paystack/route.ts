export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { verifyPaystackTransaction } from '@/lib/payments/paystack'
import { applySuccessfulSubscription } from '@/lib/payments/apply-subscription'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-paystack-signature')

  const expectedSignature = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(rawBody)
    .digest('hex')

  if (!signature || signature !== expectedSignature) {
    return new NextResponse(null, { status: 401 })
  }

  const event = JSON.parse(rawBody)

  if (event.event === 'charge.success') {
    const verification = await verifyPaystackTransaction(event.data.reference)

    // ✅ Require reference before applying subscription
    if (verification.success && verification.status === 'successful' && verification.metadata && verification.reference) {
      const result = await applySuccessfulSubscription(
        verification.metadata,
        'paystack',
        verification.reference,
        verification.amount   // ✅ NEW — actual verified amount
      )
      if (!result.success) console.error('Failed to apply subscription:', result.error)
    } else if (verification.success && verification.status === 'successful' && !verification.reference) {
      console.error('Paystack verification succeeded but returned no reference — refusing to apply subscription')
    }
  }

  return new NextResponse(null, { status: 200 })
}