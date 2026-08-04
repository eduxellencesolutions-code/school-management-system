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
  reference: string
): Promise<{ success: boolean; error?: string }> {
  const admin = serviceClient()

  // IDEMPOTENCY GUARD: try to claim this (provider, reference) pair first.
  // If it's already been claimed — by the webhook, by verify-status polling,
  // or by a retried webhook delivery — this insert fails on the unique
  // constraint and we stop here, before touching subscriptions or commissions.
  const { error: claimError } = await admin
    .from('processed_payments')
    .insert({ provider, reference, account_id: metadata.accountId, plan: metadata.plan })

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

  const now = new Date()
  const expiresAt = new Date(now.getTime() + getCycleDurationDays(metadata.cycle) * 86400000)

  const updates = {
    subscription_plan: metadata.plan,
    subscription_status: 'active',
    subscription_start: now.toISOString(),
    subscription_expires_at: expiresAt.toISOString(),
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
      const amount = getPrice(
        metadata.plan,
        'NGN' as Currency,
        metadata.cycle as BillingCycle
      )

      if (amount > 0) {
        await admin.rpc('record_commission', {
          p_referral_id: referral.id,
          p_plan: metadata.plan,
          p_amount: amount,
        })
      }
    }
  } catch (err) {
    console.error('Commission recording failed (non-fatal):', err)
  }

  return { success: true }
}