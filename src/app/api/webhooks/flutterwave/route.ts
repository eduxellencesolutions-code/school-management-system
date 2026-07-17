export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { verifyFlutterwaveTransaction } from '@/lib/payments/flutterwave'
import { applySuccessfulSubscription } from '@/lib/payments/apply-subscription'

export async function POST(req: NextRequest) {
  const signature = req.headers.get('verif-hash')
  if (!signature || signature !== process.env.FLW_WEBHOOK_HASH) {
    return new NextResponse(null, { status: 401 })
  }

  const event = await req.json()

  if (event.event === 'charge.completed' && event.data.status === 'successful') {
    const verification = await verifyFlutterwaveTransaction(String(event.data.id))

    if (verification.success && verification.status === 'successful' && verification.metadata) {
      const result = await applySuccessfulSubscription(verification.metadata)
      if (!result.success) console.error('Failed to apply subscription:', result.error)
    }
  }

  return new NextResponse(null, { status: 200 })
}
