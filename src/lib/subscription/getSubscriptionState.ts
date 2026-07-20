import { SupabaseClient } from '@supabase/supabase-js'

export interface SubscriptionState {
  status: string
  daysRemaining: number | null
  graceEndsAt: string | null
  plan: string
  isExpired: boolean
  isGracePeriod: boolean
}

export async function getSubscriptionState(
  supabase: SupabaseClient,
  userId: string
): Promise<SubscriptionState> {
  const { data: profile } = await supabase
    .from('users').select('organization_id, subscription_plan, subscription_status, grace_period_ends_at').eq('id', userId).single()

  if (profile?.organization_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('subscription_status, subscription_plan, grace_period_ends_at')
      .eq('id', profile.organization_id)
      .single()

    return computeState(org?.subscription_status, org?.subscription_plan, org?.grace_period_ends_at)
  }

  return computeState(profile?.subscription_status, profile?.subscription_plan, profile?.grace_period_ends_at)
}

function computeState(status: string | undefined, plan: string | undefined, graceEndsAt: string | null | undefined): SubscriptionState {
  let daysRemaining: number | null = null
  const currentStatus = status ?? 'active'

  if (currentStatus === 'grace_period' && graceEndsAt) {
    const msRemaining = new Date(graceEndsAt).getTime() - Date.now()
    daysRemaining = Math.max(0, Math.ceil(msRemaining / 86400000))
  }

  return {
    status: currentStatus,
    daysRemaining,
    graceEndsAt: graceEndsAt ?? null,
    plan: plan ?? 'free',
    isExpired: currentStatus === 'expired',
    isGracePeriod: currentStatus === 'grace_period',
  }
}
