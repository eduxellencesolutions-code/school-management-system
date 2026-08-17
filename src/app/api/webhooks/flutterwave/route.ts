export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { verifyFlutterwaveTransaction } from '@/lib/payments/flutterwave'
import { applySuccessfulSubscription } from '@/lib/payments/apply-subscription'
import { applyFounding500Payment } from '@/lib/payments/apply-founding500'

export async function POST(req: NextRequest) {
  const signature = req.headers.get('verif-hash')
  if (!signature || signature !== process.env.FLW_WEBHOOK_HASH) {
    return new NextResponse(null, { status: 401 })
  }

  const event = await req.json()

  if (event.event === 'charge.completed' && event.data.status === 'successful') {
    const verification = await verifyFlutterwaveTransaction(String(event.data.id))

    // ✅ Require reference AND amount before applying subscription
    if (verification.success && verification.status === 'successful' && verification.metadata && verification.reference && verification.amount !== undefined) {
      const result = verification.metadata.type === 'founding_500'
        ? await applyFounding500Payment(
            verification.metadata, 'flutterwave', verification.reference, verification.amount,
            verification.currency ?? 'NGN'
          )
        : await applySuccessfulSubscription(
            verification.metadata, 'flutterwave', verification.reference, verification.amount
          )
      if (!result.success) console.error('Failed to apply payment:', result.error)
    } else if (verification.success && verification.status === 'successful' && !verification.reference) {
      console.error('Flutterwave verification succeeded but returned no reference — refusing to apply subscription')
    } else if (verification.success && verification.status === 'successful' && verification.amount === undefined) {
      console.error('Flutterwave verification succeeded but returned no amount — refusing to apply subscription')
    }
  }

  return new NextResponse(null, { status: 200 })
}