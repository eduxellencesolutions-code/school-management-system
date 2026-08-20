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
    return { success: false, error: 'No valid referral found for this school. Please contact support.' }
  }

  // ✅ enroll_founding_500() handles its own idempotency — no pre-claim needed
  const { error: enrollError } = await admin.rpc('enroll_founding_500', {
    p_org_id: metadata.organizationId,
    p_referral_code: referral.referral_code,
    p_payment_reference: reference,
    p_provider: provider,
    p_amount_paid: amountPaid,
  })

  if (enrollError) {
    console.error('enroll_founding_500 failed:', enrollError.message)
    return { success: false, error: enrollError.message }
  }

  return { success: true }
}