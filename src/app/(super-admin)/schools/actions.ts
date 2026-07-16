'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ASSUMPTION: there is no dedicated "super admin" role/table yet.
// This checks the logged-in user's email against a comma-separated
// env var. Set SUPER_ADMIN_EMAILS="you@eduxellence.org,other@x.com"
// in your .env / Vercel project settings.
// Swap this out later for a real `platform_admins` table or an
// `is_super_admin` boolean column if you want something more robust.
async function getSuperAdminContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const allowList = (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  const email = user.email?.toLowerCase() ?? ''
  const isSuperAdmin = allowList.includes(email)

  if (!isSuperAdmin) {
    throw new Error('Not authorized: super admin access required')
  }

  return { user }
}

type ActionResult = { success: boolean; error?: string }

// Helper to create service client
function serviceClient() {
  const { createClient: createServiceClient } = require('@supabase/supabase-js')
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function requireSuperAdmin() {
  try {
    await getSuperAdminContext()
  } catch (error) {
    throw new Error('Not authorized: super admin access required')
  }
}

// ---- Activate ----
// Full paid access. Used for: new school going live, or reinstating
// a previously expired/cancelled/suspended school.
export async function activateOrganization(formData: FormData): Promise<ActionResult> {
  try {
    await getSuperAdminContext()
    const supabase = await createClient()
    const orgId = formData.get('org_id') as string
    if (!orgId) return { success: false, error: 'Organization ID is required' }

    const { data: org } = await supabase
      .from('organizations')
      .select('subscription_start')
      .eq('id', orgId)
      .single()

    const { error } = await supabase
      .from('organizations')
      .update({
        status: 'active',
        subscription_start: org?.subscription_start ?? new Date().toISOString(),
        suspended_at: null,
        cancelled_at: null,
      })
      .eq('id', orgId)

    if (error) {
      console.error('Error activating organization:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/schools')
    return { success: true }
  } catch (error: any) {
    console.error('Activate organization error:', error)
    return { success: false, error: error.message ?? 'Something went wrong' }
  }
}

// ---- Deactivate (= customer/permanently cancelled) ----
export async function deactivateOrganization(formData: FormData): Promise<ActionResult> {
  try {
    await getSuperAdminContext()
    const supabase = await createClient()
    const orgId = formData.get('org_id') as string
    if (!orgId) return { success: false, error: 'Organization ID is required' }

    const { error } = await supabase
      .from('organizations')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', orgId)

    if (error) {
      console.error('Error deactivating organization:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/schools')
    return { success: true }
  } catch (error: any) {
    console.error('Deactivate organization error:', error)
    return { success: false, error: error.message ?? 'Something went wrong' }
  }
}

// ---- Suspend (super admin action: fraud, abuse, non-compliance) ----
export async function suspendOrganization(formData: FormData): Promise<ActionResult> {
  try {
    await getSuperAdminContext()
    const supabase = await createClient()
    const orgId = formData.get('org_id') as string
    const reason = (formData.get('reason') as string)?.trim() || null
    if (!orgId) return { success: false, error: 'Organization ID is required' }

    const { error } = await supabase
      .from('organizations')
      .update({
        status: 'suspended',
        suspended_at: new Date().toISOString(),
        // Optional: only include this if you add a `suspension_reason` text column
        ...(reason ? { suspension_reason: reason } : {}),
      })
      .eq('id', orgId)

    if (error) {
      console.error('Error suspending organization:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/schools')
    return { success: true }
  } catch (error: any) {
    console.error('Suspend organization error:', error)
    return { success: false, error: error.message ?? 'Something went wrong' }
  }
}

// ---- Reactivate / extend ----
// Used after suspension is lifted, or to push out the subscription_end
// date for a renewal, without necessarily touching subscription_start.
export async function reactivateOrExtendOrganization(formData: FormData): Promise<ActionResult> {
  try {
    await getSuperAdminContext()
    const supabase = await createClient()
    const orgId = formData.get('org_id') as string
    const newExpiryRaw = formData.get('subscription_end') as string | null
    if (!orgId) return { success: false, error: 'Organization ID is required' }

    const updates: Record<string, unknown> = {
      status: 'active',
      suspended_at: null,
      cancelled_at: null,
    }

    if (newExpiryRaw) {
      const newExpiry = new Date(newExpiryRaw)
      if (isNaN(newExpiry.getTime())) {
        return { success: false, error: 'Invalid expiry date' }
      }
      updates.subscription_end = newExpiry.toISOString()
    }

    const { error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', orgId)

    if (error) {
      console.error('Error reactivating organization:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/schools')
    return { success: true }
  } catch (error: any) {
    console.error('Reactivate organization error:', error)
    return { success: false, error: error.message ?? 'Something went wrong' }
  }
}

// ---- Manually set subscription expiry (no status change) ----
// For adjusting a date without forcing a status transition — e.g.
// correcting a wrong date, or backdating for support purposes.
export async function setSubscriptionExpiry(formData: FormData): Promise<ActionResult> {
  try {
    await getSuperAdminContext()
    const supabase = await createClient()
    const orgId = formData.get('org_id') as string
    const expiryRaw = formData.get('subscription_end') as string

    if (!orgId) return { success: false, error: 'Organization ID is required' }
    if (!expiryRaw) return { success: false, error: 'Expiry date is required' }

    const expiry = new Date(expiryRaw)
    if (isNaN(expiry.getTime())) {
      return { success: false, error: 'Invalid expiry date' }
    }

    const { error } = await supabase
      .from('organizations')
      .update({ subscription_end: expiry.toISOString() })
      .eq('id', orgId)

    if (error) {
      console.error('Error setting subscription expiry:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/schools')
    return { success: true }
  } catch (error: any) {
    console.error('Set subscription expiry error:', error)
    return { success: false, error: error.message ?? 'Something went wrong' }
  }
}

// ✅ FIXED: Update school status with proper validation and date stamps
export async function updateSchoolStatus(formData: FormData) {
  await requireSuperAdmin()
  const orgId = formData.get('org_id') as string
  const status = formData.get('status') as string
  if (!orgId || !status) return { success: false, message: 'Missing data' }

  const validStatuses = ['trial', 'active', 'expired', 'suspended', 'cancelled']
  if (!validStatuses.includes(status)) {
    return { success: false, message: `Invalid status: ${status}` }
  }

  const admin = serviceClient()

  const updates: Record<string, unknown> = { subscription_status: status }

  if (status === 'suspended') {
    updates.suspended_at = new Date().toISOString()
  } else if (status === 'cancelled') {
    updates.cancelled_at = new Date().toISOString()
  } else if (status === 'active') {
    // reinstating from suspended/cancelled — clear those markers
    updates.suspended_at = null
    updates.cancelled_at = null
  }

  const { error } = await admin
    .from('organizations')
    .update(updates)
    .eq('id', orgId)

  if (error) {
    console.error('Error updating school status:', error)
    return { success: false, message: 'Failed to update status' }
  }

  revalidatePath(`/schools/${orgId}`)
  revalidatePath('/schools')
  return { success: true }
}

// ✅ FIXED: Extend subscription with proper status update
export async function extendSubscription(formData: FormData) {
  await requireSuperAdmin()
  const orgId = formData.get('org_id') as string
  const newExpiry = formData.get('expires_at') as string
  if (!orgId || !newExpiry) return { success: false, message: 'Missing data' }

  const admin = serviceClient()
  const { error } = await admin
    .from('organizations')
    .update({
      subscription_expires_at: newExpiry,
      subscription_status: 'active',
      suspended_at: null,
      cancelled_at: null,
    })
    .eq('id', orgId)

  if (error) {
    console.error('Error extending subscription:', error)
    return { success: false, message: 'Failed to extend subscription' }
  }

  revalidatePath(`/schools/${orgId}`)
  return { success: true }
}
