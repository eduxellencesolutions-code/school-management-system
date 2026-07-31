import { SupabaseClient } from '@supabase/supabase-js'

export interface SubscriptionState {
  status: string
  daysRemaining: number | null
  graceEndsAt: string | null
  plan: string
  isExpired: boolean
  isGracePeriod: boolean
  isExpiringSoon: boolean
  daysUntilExpiry: number | null
  expiresAt: string | null  // ✅ NEW
}

export async function getSubscriptionState(
  supabase: SupabaseClient,
  userId: string
): Promise<SubscriptionState> {
  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, subscription_plan, subscription_status, grace_period_ends_at, subscription_expires_at')
    .eq('id', userId).single()

  if (profile?.organization_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('subscription_status, subscription_plan, grace_period_ends_at, subscription_expires_at')
      .eq('id', profile.organization_id)
      .single()
    return computeState(org?.subscription_status, org?.subscription_plan, org?.grace_period_ends_at, org?.subscription_expires_at)
  }

  return computeState(profile?.subscription_status, profile?.subscription_plan, profile?.grace_period_ends_at, profile?.subscription_expires_at)
}

function computeState(
  status: string | undefined,
  plan: string | undefined,
  graceEndsAt: string | null | undefined,
  expiresAt: string | null | undefined
): SubscriptionState {
  let daysRemaining: number | null = null
  const currentStatus = status ?? 'active'

  if (currentStatus === 'grace_period' && graceEndsAt) {
    const msRemaining = new Date(graceEndsAt).getTime() - Date.now()
    daysRemaining = Math.max(0, Math.ceil(msRemaining / 86400000))
  }

  let daysUntilExpiry: number | null = null
  let isExpiringSoon = false
  if (currentStatus === 'active' && expiresAt && plan && plan !== 'free') {
    const msUntilExpiry = new Date(expiresAt).getTime() - Date.now()
    daysUntilExpiry = Math.ceil(msUntilExpiry / 86400000)
    isExpiringSoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 3
  }

  return {
    status: currentStatus,
    daysRemaining,
    graceEndsAt: graceEndsAt ?? null,
    plan: plan ?? 'free',
    isExpired: currentStatus === 'expired',
    isGracePeriod: currentStatus === 'grace_period',
    isExpiringSoon,
    daysUntilExpiry,
    expiresAt: expiresAt ?? null,  // ✅ NEW
  }
}