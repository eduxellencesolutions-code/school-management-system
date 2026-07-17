import { createClient } from '@supabase/supabase-js'
import { CheckoutMetadata } from './types'
import { getCycleDurationDays } from './pricing'

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

  return { success: true }
}