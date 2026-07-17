import { SupabaseClient } from '@supabase/supabase-js'

export async function requireActiveSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<{ allowed: boolean; message?: string }> {
  const { data: profile } = await supabase
    .from('users').select('organization_id, subscription_status').eq('id', userId).single()

  const status = profile?.organization_id
    ? (await supabase.from('organizations').select('subscription_status').eq('id', profile.organization_id).single()).data?.subscription_status
    : profile?.subscription_status

  if (status === 'expired') {
    return { allowed: false, message: 'Your subscription has expired. Renew in Settings → Billing to continue adding or editing data.' }
  }

  return { allowed: true }
}