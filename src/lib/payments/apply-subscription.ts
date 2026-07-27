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

export async function applySuccessfulSubscription(metadata: CheckoutMetadata): Promise<{ success: boolean; error?: string }> {
  const admin = serviceClient()
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
  // Only fires if this account was referred and the plan is a commissionable paid plan.
  try {
    const referralQuery = metadata.accountType === 'org'
      ? admin.from('referrals').select('id').eq('organization_id', metadata.accountId).eq('status', 'pending')
      : admin.from('referrals').select('id').eq('referred_user_id', metadata.accountId).eq('status', 'pending')

    const { data: referral } = await referralQuery.maybeSingle()

    if (referral && metadata.plan !== 'free') {
      // CheckoutMetadata has no currency field — hardcode NGN, the platform's primary market
      const amount = getPrice(
        metadata.plan as PaidPlan,
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