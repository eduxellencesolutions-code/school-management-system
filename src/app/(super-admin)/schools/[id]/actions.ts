'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getStaffAccess } from '@/lib/auth/getStaffAccess'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')
  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')
  if (!isSuperAdmin) redirect('/dashboard')
  return user
}

async function requireSchoolStatusPermission() {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')
  const access = await getStaffAccess(supabase, user.id)
  const allowed = access.isSuperAdmin || access.permissions.has('schools.suspend')
  if (!allowed) redirect('/dashboard')
  return user
}

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Logs through the caller's own session (not the service client), so
// log_platform_action's own actor-identity guard (added earlier this
// session) verifies the real signed-in user, not a spoofed id.
async function logAction(actorId: string, action: string, orgId: string, metadata: Record<string, unknown> = {}) {
  const supabase = await createClient()
  await supabase.rpc('log_platform_action', {
    p_actor_id: actorId,
    p_action: action,
    p_target_type: 'organization',
    p_target_id: orgId,
    p_reason: null,
    p_metadata: metadata,
  })
}

export async function updateSchoolStatus(formData: FormData) {
  const user = await requireSchoolStatusPermission()
  const orgId = formData.get('org_id') as string
  const status = formData.get('status') as string
  if (!orgId || !status) return { success: false, message: 'Missing data' }

  const validStatuses = ['trial', 'active', 'expired', 'suspended', 'cancelled']
  if (!validStatuses.includes(status)) {
    return { success: false, message: `Invalid status: ${status}` }
  }

  const admin = serviceClient()
  const { data: before } = await admin.from('organizations').select('subscription_status').eq('id', orgId).single()

  const updates: Record<string, unknown> = { subscription_status: status }

  if (status === 'suspended') {
    updates.suspended_at = new Date().toISOString()
  } else if (status === 'cancelled') {
    updates.cancelled_at = new Date().toISOString()
  } else if (status === 'active') {
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

  await logAction(user.id, 'school_status_changed', orgId, {
    old_status: before?.subscription_status ?? null,
    new_status: status,
  })

  revalidatePath(`/schools/${orgId}`)
  revalidatePath('/schools')
  return { success: true }
}

export async function extendSubscription(formData: FormData) {
  const user = await requireSchoolStatusPermission()
  const orgId = formData.get('org_id') as string
  const newExpiry = formData.get('expires_at') as string
  if (!orgId || !newExpiry) return { success: false, message: 'Missing data' }

  const admin = serviceClient()
  const { data: before } = await admin.from('organizations').select('subscription_expires_at').eq('id', orgId).single()

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

  await logAction(user.id, 'school_subscription_extended', orgId, {
    old_expiry: before?.subscription_expires_at ?? null,
    new_expiry: newExpiry,
  })

  revalidatePath(`/schools/${orgId}`)
  return { success: true }
}

export async function reassignAdmin(formData: FormData) {
  const user = await requireSuperAdmin()
  const orgId = formData.get('org_id') as string
  const newAdminUserId = formData.get('user_id') as string
  if (!orgId || !newAdminUserId) return { success: false, message: 'Missing data' }

  const admin = serviceClient()

  const { data: previousAdmin } = await admin
    .from('users').select('id').eq('organization_id', orgId).eq('role', 'admin').maybeSingle()

  const { error: demoteError } = await admin
    .from('users')
    .update({ role: 'teacher' })
    .eq('organization_id', orgId)
    .eq('role', 'admin')

  if (demoteError) {
    console.error('Error demoting current admin:', demoteError)
    return { success: false, message: 'Failed to reassign admin' }
  }

  const { error: promoteError } = await admin
    .from('users')
    .update({ role: 'admin' })
    .eq('id', newAdminUserId)
    .eq('organization_id', orgId)

  if (promoteError) {
    console.error('Error promoting new admin:', promoteError)
    return { success: false, message: 'Failed to reassign admin' }
  }

  await logAction(user.id, 'school_admin_reassigned', orgId, {
    previous_admin_id: previousAdmin?.id ?? null,
    new_admin_id: newAdminUserId,
  })

  revalidatePath(`/schools/${orgId}`)
  return { success: true }
}

export async function permanentlyDeleteSchool(formData: FormData) {
  const user = await requireSuperAdmin()
  const orgId = formData.get('org_id') as string
  const confirmName = formData.get('confirm_name') as string
  if (!orgId) return { success: false, message: 'Missing data' }

  const admin = serviceClient()
  const { data: org } = await admin.from('organizations').select('name').eq('id', orgId).single()

  if (!org || org.name !== confirmName) {
    return { success: false, message: 'School name confirmation did not match' }
  }

  // Logged BEFORE the delete — once the row is gone, target_id would point
  // at nothing, and this is the one action that most needs an unambiguous record.
  await logAction(user.id, 'school_permanently_deleted', orgId, { organization_name: org.name })

  const { error } = await admin.from('organizations').delete().eq('id', orgId)

  if (error) {
    console.error('Error deleting school:', error)
    return { success: false, message: 'Failed to delete school. It may have dependent records that must be removed first.' }
  }

  revalidatePath('/schools')
  return { success: true }
}

export async function changeSchoolPlan(formData: FormData) {
  const user = await requireSuperAdmin()
  const orgId = formData.get('org_id') as string
  const plan = formData.get('plan') as string
  if (!orgId || !plan) return { success: false, message: 'Missing data' }

  const validPlans = ['free', 'small_school', 'standard_school', 'premium_school']
  if (!validPlans.includes(plan)) {
    return { success: false, message: `Invalid plan: ${plan}` }
  }

  const admin = serviceClient()
  const { data: before } = await admin.from('organizations').select('subscription_plan').eq('id', orgId).single()

  const { error } = await admin
    .from('organizations')
    .update({ subscription_plan: plan })
    .eq('id', orgId)

  if (error) {
    console.error('Error changing school plan:', error)
    return { success: false, message: 'Failed to change plan' }
  }

  await logAction(user.id, 'school_plan_changed', orgId, {
    old_plan: before?.subscription_plan ?? null,
    new_plan: plan,
  })

  revalidatePath(`/schools/${orgId}`)
  revalidatePath('/schools')
  return { success: true }
}