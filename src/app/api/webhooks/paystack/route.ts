export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { verifyPaystackTransaction } from '@/lib/payments/paystack'
import { applySuccessfulSubscription } from '@/lib/payments/apply-subscription'
import { applyFounding500Payment } from '@/lib/payments/apply-founding500'

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

    // ✅ Require reference AND amount before applying subscription
    if (verification.success && verification.status === 'successful' && verification.metadata && verification.reference && verification.amount !== undefined) {
      const result = verification.metadata.type === 'founding_500'
        ? await applyFounding500Payment(
            verification.metadata, 'paystack', verification.reference, verification.amount,
            verification.currency ?? 'NGN'
          )
        : await applySuccessfulSubscription(
            verification.metadata, 'paystack', verification.reference, verification.amount
          )
      if (!result.success) console.error('Failed to apply payment:', result.error)
    } else if (verification.success && verification.status === 'successful' && !verification.reference) {
      console.error('Paystack verification succeeded but returned no reference — refusing to apply subscription')
    } else if (verification.success && verification.status === 'successful' && verification.amount === undefined) {
      console.error('Paystack verification succeeded but returned no amount — refusing to apply subscription')
    }
  }

  return new NextResponse(null, { status: 200 })
}