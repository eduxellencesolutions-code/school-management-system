export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { verifyFlutterwaveTransaction } from '@/lib/payments/flutterwave'
import { applyVerifiedPayment } from '@/lib/payments/dispatch'
import { safeEqual } from '@/lib/payments/safeEqual'

export async function POST(req: NextRequest) {
  const signature = req.headers.get('verif-hash')
  const secret = process.env.FLW_WEBHOOK_HASH
  if (!signature || !secret || !safeEqual(signature, secret)) return new NextResponse(null, { status: 401 })

  const event = await req.json()
  if (event.event === 'charge.completed' && event.data.status === 'successful') {
    const verification = await verifyFlutterwaveTransaction(String(event.data.id))
    if (verification.success && verification.status === 'successful') {
      const result = await applyVerifiedPayment(verification, 'flutterwave')
      if (!result.success) {
        console.error('Failed to apply payment:', result.error)
        if (result.retryable) return new NextResponse(null, { status: 500 })
      }
    }
  }
  return new NextResponse(null, { status: 200 })
}