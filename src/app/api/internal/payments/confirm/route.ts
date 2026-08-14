// app/api/internal/payments/confirm/route.ts
//
// Called ONLY by the central payments service — not by browsers, not
// directly by Paystack/Flutterwave. Reuses applySuccessfulSubscription()
// as-is, including its existing idempotency guard (unique insert into
// processed_payments) — nothing about that function is reimplemented here.
//
// Env var to add: RESULTS_CENTRAL_SHARED_SECRET
// Must exactly match platforms.shared_secret for the 'results' row in
// the central payments Supabase project.

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { applySuccessfulSubscription } from '@/lib/payments/apply-subscription'
import { CheckoutMetadata } from '@/lib/payments/types'

const SHARED_SECRET = process.env.RESULTS_CENTRAL_SHARED_SECRET!

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader || !SHARED_SECRET) return false
  const computed = crypto.createHmac('sha256', SHARED_SECRET).update(rawBody).digest('hex')
  // timing-safe compare
  const a = Buffer.from(computed)
  const b = Buffer.from(signatureHeader)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-signature')

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(rawBody)
  const { event_type, reference, provider, metadata } = payload as {
    event_type: string
    reference: string
    provider: 'paystack' | 'flutterwave'
    metadata: CheckoutMetadata
  }

  if (!reference || !provider) {
    return NextResponse.json({ error: 'Missing reference or provider' }, { status: 400 })
  }

  // Refunds/chargebacks: NOT auto-processed for the same reason as Stats —
  // reversing a subscription grant or a commission automatically risks
  // getting it wrong. Log and require manual handling.
  if (event_type === 'refund' || event_type === 'chargeback') {
    console.warn(`[CENTRAL] ${event_type} received for reference=${reference} — needs manual review`)
    return NextResponse.json({ ok: true, note: `${event_type} logged for manual review` }, { status: 200 })
  }

  if (!metadata?.accountId || !metadata?.plan) {
    return NextResponse.json({ error: 'Missing accountId/plan in metadata' }, { status: 400 })
  }

  // ✅ FIX: Pass payload.amount to applySuccessfulSubscription
  const result = await applySuccessfulSubscription(metadata, provider, reference, payload.amount)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}// force redeploy