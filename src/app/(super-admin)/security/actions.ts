'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getStaffAccess } from '@/lib/auth/getStaffAccess'

async function requireAccountLockPermission() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const access = await getStaffAccess(supabase, user.id)
  const allowed = access.isSuperAdmin || access.permissions.has('security.account_lock.manage')
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

async function writeAuditLog(
  admin: ReturnType<typeof serviceClient>,
  actorId: string,
  action: string,
  targetId: string,
  reason: string | null,
  metadata: Record<string, unknown> = {}
) {
  const { error } = await admin.rpc('log_platform_action', {
    p_actor_id: actorId,
    p_action: action,
    p_target_type: 'users',
    p_target_id: targetId,
    p_reason: reason,
    p_metadata: metadata,
  })
  if (error) console.error('Failed to write audit log:', error)
}

export async function lockAccount(formData: FormData) {
  const actor = await requireAccountLockPermission()
  const targetUserId = formData.get('user_id') as string
  const reason = (formData.get('reason') as string)?.trim()

  if (!targetUserId) return { success: false, message: 'Missing user id' }
  if (!reason) return { success: false, message: 'A reason is required to lock an account' }
  if (targetUserId === actor.id) return { success: false, message: "You can't lock your own account" }

  const admin = serviceClient()

  const { error: banError } = await admin.auth.admin.updateUserById(targetUserId, {
    ban_duration: '876000h',
  })
  if (banError) {
    console.error('Error banning user:', banError)
    return { success: false, message: 'Failed to lock account at the auth layer' }
  }

  const { error: updateError } = await admin
    .from('users')
    .update({
      account_status: 'locked',
      locked_at: new Date().toISOString(),
      locked_by: actor.id,
      lock_reason: reason,
      unlocked_at: null,
      unlocked_by: null,
    })
    .eq('id', targetUserId)

  if (updateError) {
    console.error('Error updating account_status:', updateError)
    return { success: false, message: 'Account was locked, but the status record failed to update' }
  }

  await writeAuditLog(admin, actor.id, 'locked_account', targetUserId, reason)

  revalidatePath('/security')
  return { success: true }
}

export async function unlockAccount(formData: FormData) {
  const actor = await requireAccountLockPermission()
  const targetUserId = formData.get('user_id') as string
  if (!targetUserId) return { success: false, message: 'Missing user id' }

  const admin = serviceClient()

  const { error: banError } = await admin.auth.admin.updateUserById(targetUserId, {
    ban_duration: 'none',
  })
  if (banError) {
    console.error('Error unbanning user:', banError)
    return { success: false, message: 'Failed to unlock account at the auth layer' }
  }

  const { error: updateError } = await admin
    .from('users')
    .update({
      account_status: 'active',
      unlocked_at: new Date().toISOString(),
      unlocked_by: actor.id,
    })
    .eq('id', targetUserId)

  if (updateError) {
    console.error('Error updating account_status:', updateError)
    return { success: false, message: 'Account was unlocked, but the status record failed to update' }
  }

  await writeAuditLog(admin, actor.id, 'unlocked_account', targetUserId, null)

  revalidatePath('/security')
  return { success: true }
}