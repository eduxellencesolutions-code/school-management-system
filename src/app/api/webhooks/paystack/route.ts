export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { verifyPaystackTransaction } from '@/lib/payments/paystack'
import { applyVerifiedPayment } from '@/lib/payments/dispatch'
import { safeEqual } from '@/lib/payments/safeEqual'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-paystack-signature')
  const expected = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!).update(rawBody).digest('hex')
  if (!signature || !safeEqual(signature, expected)) return new NextResponse(null, { status: 401 })

  const event = JSON.parse(rawBody)
  if (event.event === 'charge.success') {
    const verification = await verifyPaystackTransaction(event.data.reference)
    if (verification.success && verification.status === 'successful') {
      const result = await applyVerifiedPayment(verification, 'paystack')
      if (!result.success) {
        console.error('Failed to apply payment:', result.error)
        if (result.retryable) return new NextResponse(null, { status: 500 })
      }
    }
  }
  return new NextResponse(null, { status: 200 })
}