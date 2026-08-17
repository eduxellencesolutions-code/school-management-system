import { createClient } from '@supabase/supabase-js'
import { CheckoutMetadata } from './types'
import { getCycleDurationDays, getPrice, PaidPlan, Currency, BillingCycle } from './pricing'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function applySuccessfulSubscription(
  metadata: CheckoutMetadata,
  provider: 'paystack' | 'flutterwave',
  reference: string,
  amountPaid: number
): Promise<{ success: boolean; error?: string }> {
  const admin = serviceClient()

  // Founding 500 is a distinct enrollment flow — route it entirely to
  // enroll_founding_500() and skip everything below (subscription update,
  // getCycleDurationDays, the normal commission path). This one check
  // protects ALL callers of this function, not just one route.
  if (metadata.plan === 'founding_500') {
    if (!metadata.referral_code) {
      return { success: false, error: 'Missing referral_code for Founding 500 enrollment' }
    }
    const { error: rpcError } = await admin.rpc('enroll_founding_500', {
      p_org_id: metadata.accountId,
      p_referral_code: metadata.referral_code,
      p_payment_reference: reference,
      p_provider: provider,
      p_amount_paid: amountPaid,
    })
    if (rpcError) {
      console.error('Founding 500 enrollment failed:', rpcError)
      return { success: false, error: rpcError.message }
    }
    return { success: true }
  }

  // IDEMPOTENCY GUARD: try to claim this (provider, reference) pair first.
  // If it's already been claimed — by the webhook, by verify-status polling,
  // or by a retried webhook delivery — this insert fails on the unique
  // constraint and we stop here, before touching subscriptions or commissions.
  const { error: claimError } = await admin
    .from('processed_payments')
    .insert({
      provider,
      reference,
      account_id: metadata.accountId,
      plan: metadata.plan,
      amount: amountPaid,
      currency: metadata.expected_currency,
      billing_cycle: metadata.cycle ?? null,
      gateway: provider,
    })

  if (claimError) {
    if (claimError.code === '23505') {
      // Already processed — this is the expected, safe outcome for a
      // duplicate webhook or a verify-status call after the webhook
      // already ran. Not an error from the caller's point of view.
      return { success: true }
    }
    console.error('Error claiming payment reference:', claimError)
    return { success: false, error: claimError.message }
  }

  if (!metadata.cycle) {
    return { success: false, error: 'Missing billing cycle in metadata for subscription plan' }
  }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + getCycleDurationDays(metadata.cycle) * 86400000)

  const updates = {
    subscription_plan: metadata.plan,
    subscription_status: 'active',
    subscription_start: now.toISOString(),
    subscription_expires_at: expiresAt.toISOString(),
    billing_cycle: metadata.cycle,
    suspended_at: null,
    cancelled_at: null,
  }

  const table = metadata.accountType === 'org' ? 'organizations' : 'users'

  const { error } = await admin
    .from(table)
    .update(updates)
    .eq('id', metadata.accountId)

  if (error) {
    console.error('Error applying subscription:', error)
    return { success: false, error: error.message }
  }

  // ── Representative commission check ──
  try {
    const referralQuery = metadata.accountType === 'org'
      ? admin.from('referrals').select('id').eq('organization_id', metadata.accountId).eq('status', 'pending')
      : admin.from('referrals').select('id').eq('referred_user_id', metadata.accountId).eq('status', 'pending')

    const { data: referral } = await referralQuery.maybeSingle()

    if (referral) {
      if (amountPaid > 0) {
        await admin.rpc('record_commission', {
          p_referral_id: referral.id,
          p_plan: metadata.plan,
          p_amount: amountPaid,
        })
      }
    }
  } catch (err) {
    console.error('Commission recording failed (non-fatal):', err)
  }

  return { success: true }
}