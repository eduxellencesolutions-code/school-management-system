'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')
  if (!isSuperAdmin) redirect('/dashboard')

  return user
}

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function updateSchoolStatus(formData: FormData) {
  await requireSuperAdmin()
  const orgId = formData.get('org_id') as string
  const status = formData.get('status') as string
  if (!orgId || !status) return { success: false, message: 'Missing data' }

  const admin = serviceClient()
  const { error } = await admin
    .from('organizations')
    .update({ subscription_status: status })
    .eq('id', orgId)

  if (error) {
    console.error('Error updating school status:', error)
    return { success: false, message: 'Failed to update status' }
  }

  revalidatePath(`/schools/${orgId}`)
  revalidatePath('/schools')
  return { success: true }
}

export async function extendSubscription(formData: FormData) {
  await requireSuperAdmin()
  const orgId = formData.get('org_id') as string
  const newExpiry = formData.get('expires_at') as string
  if (!orgId || !newExpiry) return { success: false, message: 'Missing data' }

  const admin = serviceClient()
  const { error } = await admin
    .from('organizations')
    .update({ subscription_expires_at: newExpiry, subscription_status: 'active' })
    .eq('id', orgId)

  if (error) {
    console.error('Error extending subscription:', error)
    return { success: false, message: 'Failed to extend subscription' }
  }

  revalidatePath(`/schools/${orgId}`)
  return { success: true }
}

export async function reassignAdmin(formData: FormData) {
  await requireSuperAdmin()
  const orgId = formData.get('org_id') as string
  const newAdminUserId = formData.get('user_id') as string
  if (!orgId || !newAdminUserId) return { success: false, message: 'Missing data' }

  const admin = serviceClient()

  // Demote current admin(s) in this org to teacher, then promote the chosen user
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

  revalidatePath(`/schools/${orgId}`)
  return { success: true }
}

export async function permanentlyDeleteSchool(formData: FormData) {
  await requireSuperAdmin()
  const orgId = formData.get('org_id') as string
  const confirmName = formData.get('confirm_name') as string
  if (!orgId) return { success: false, message: 'Missing data' }

  const admin = serviceClient()
  const { data: org } = await admin.from('organizations').select('name').eq('id', orgId).single()

  if (!org || org.name !== confirmName) {
    return { success: false, message: 'School name confirmation did not match' }
  }

  const { error } = await admin.from('organizations').delete().eq('id', orgId)
  if (error) {
    console.error('Error deleting school:', error)
    return { success: false, message: 'Failed to delete school. It may have dependent records that must be removed first.' }
  }

  revalidatePath('/schools')
  return { success: true }
}