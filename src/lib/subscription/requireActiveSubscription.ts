import { SupabaseClient } from '@supabase/supabase-js'
import { getSubscriptionState } from './getSubscriptionState'

export async function requireActiveSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<{ allowed: boolean; message?: string }> {
  const { status } = await getSubscriptionState(supabase, userId)

  if (status === 'expired') {
    return { allowed: false, message: 'Your subscription has expired. Renew in Settings → Billing to continue adding or editing data.' }
  }

  return { allowed: true }
}
