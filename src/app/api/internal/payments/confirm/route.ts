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
import { createClient } from '@supabase/supabase-js'
import { applySuccessfulSubscription } from '@/lib/payments/apply-subscription'
import { AnyCheckoutMetadata } from '@/lib/payments/types'

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
  const { event_type, reference, provider, metadata, amount } = payload as {
    event_type: string
    reference: string
    provider: 'paystack' | 'flutterwave'
    metadata: AnyCheckoutMetadata
    amount: number
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

  // Founding 500 is a distinct enrollment flow, not a subscription — route
  // it to enroll_founding_500() entirely, never through applySuccessfulSubscription.
  if (metadata?.type === 'founding_500') {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Check for referral_code (it should exist on FoundingCheckoutMetadata)
    if (!('referral_code' in metadata) || !metadata.referral_code) {
      return NextResponse.json({ error: 'Missing referral_code for Founding 500 enrollment' }, { status: 400 })
    }

    const { data: enrollmentId, error: rpcError } = await admin.rpc('enroll_founding_500', {
      p_org_id: metadata.organizationId,
      p_referral_code: metadata.referral_code,
      p_payment_reference: reference,
      p_provider: provider,
      p_amount_paid: amount,
    })

    if (rpcError) {
      console.error('Founding 500 enrollment failed:', rpcError)
      return NextResponse.json({ error: rpcError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, enrollment_id: enrollmentId })
  }

  // Regular subscription flow - TypeScript now knows this is CheckoutMetadata
  // because type !== 'founding_500'
  if (!('accountId' in metadata) || !('plan' in metadata) || !('cycle' in metadata)) {
    return NextResponse.json({ error: 'Missing required subscription metadata fields' }, { status: 400 })
  }

  // ✅ FIX: Pass payload.amount to applySuccessfulSubscription
  const result = await applySuccessfulSubscription(metadata, provider, reference, amount)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}// force redeploy