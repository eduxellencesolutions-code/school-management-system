import { createClient } from '@supabase/supabase-js'
import { FoundingCheckoutMetadata } from './types'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function applyFounding500Payment(
  metadata: FoundingCheckoutMetadata,
  provider: 'paystack' | 'flutterwave',
  reference: string,
  amountPaid: number,
  currency: string
): Promise<{ success: boolean; error?: string }> {
  const admin = serviceClient()

  // Same idempotency mechanism as the normal subscription path — same
  // table, same unique(provider, reference) constraint, not a second
  // idempotency system.
  const { error: claimError } = await admin
    .from('processed_payments')
    .insert({ provider, reference, account_id: metadata.organizationId, plan: 'founding_500' })

  if (claimError) {
    if (claimError.code === '23505') {
      // Already processed — safe, expected outcome for a duplicate webhook.
      return { success: true }
    }
    console.error('Error claiming Founding 500 payment reference:', claimError)
    return { success: false, error: claimError.message }
  }

  // Re-verify amount/currency server-side against the live campaign price —
  // never trust metadata.expected_amount alone, in case the qualifying
  // price changed between checkout initiation and this confirmation.
  const { data: campaign } = await admin
    .from('campaign_slot_counters')
    .select('qualifying_price')
    .eq('campaign_key', 'founding_500')
    .single()

  if (!campaign || amountPaid !== campaign.qualifying_price || currency !== 'NGN') {
    console.error(
      `Founding 500 payment amount/currency mismatch: paid=${amountPaid} ${currency}, expected=${campaign?.qualifying_price} NGN`
    )
    // Roll back the claim — this payment was never actually enrolled,
    // so a legitimate retry (or manual investigation) must not be
    // permanently blocked by our own idempotency guard.
    await admin.from('processed_payments').delete().eq('provider', provider).eq('reference', reference)
    return { success: false, error: 'Payment amount or currency did not match the Founding 500 offer' }
  }

  // Referral code is deliberately NOT taken from the frontend/metadata —
  // enroll_founding_500() itself looks up the matching referrals row by
  // organization_id server-side. We only need to know which one to pass.
  const { data: referral } = await admin
    .from('referrals')
    .select('referral_code')
    .eq('organization_id', metadata.organizationId)
    .eq('status', 'pending')
    .maybeSingle()

  if (!referral) {
    console.error(`No pending referral found for organization ${metadata.organizationId} — cannot enroll in Founding 500`)
    await admin.from('processed_payments').delete().eq('provider', provider).eq('reference', reference)
    return { success: false, error: 'No valid referral found for this school. Please contact support.' }
  }

  const { error: enrollError } = await admin.rpc('enroll_founding_500', {
    p_org_id: metadata.organizationId,
    p_referral_code: referral.referral_code,
    p_payment_reference: reference,
    p_provider: provider,
    p_amount_paid: amountPaid,
  })

  if (enrollError) {
    console.error('enroll_founding_500 failed:', enrollError.message)
    // Enrollment failed (slot race lost, term unconfigured, etc.) — roll
    // back the claim so a retry can actually succeed instead of silently
    // no-op'ing forever against a payment that was never fulfilled.
    await admin.from('processed_payments').delete().eq('provider', provider).eq('reference', reference)
    return { success: false, error: enrollError.message }
  }

  return { success: true }
}