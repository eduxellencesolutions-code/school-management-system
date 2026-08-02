'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getStaffAccess } from '@/lib/auth/getStaffAccess'
import { generateAccessCode } from '@/lib/supabase/admin'

// ✅ Updated: Generic permission check (replaces requireAccountLockPermission)
async function requireStaffPermission(permissionKey: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const access = await getStaffAccess(supabase, user.id)
  const allowed = access.isSuperAdmin || access.permissions.has(permissionKey)
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
  const actor = await requireStaffPermission('security.account_lock.manage')
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
  const actor = await requireStaffPermission('security.account_lock.manage')
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

export async function forcePasswordReset(formData: FormData) {
  const actor = await requireStaffPermission('security.password_reset.force')
  const targetUserId = formData.get('user_id') as string
  const reason = (formData.get('reason') as string)?.trim()

  if (!targetUserId) return { success: false, message: 'Missing user id' }
  if (!reason) return { success: false, message: 'A reason is required to force a password reset' }

  const admin = serviceClient()

  // ✅ Parents don't authenticate with email/password — they use an access code.
  // Password reset never applies to them.
  const { data: parentRow } = await admin
    .from('parent_accounts')
    .select('id')
    .eq('auth_user_id', targetUserId)
    .maybeSingle()

  if (parentRow) {
    return { success: false, message: 'This user authenticates via access code, not a password. Use the access code actions instead.' }
  }

  const { data: userRow, error: userError } = await admin
    .from('users')
    .select('email')
    .eq('id', targetUserId)
    .single()

  let targetEmail = userRow?.email

  if (!targetEmail) {
    return { success: false, message: 'Could not resolve an email address for this user' }
  }

  // Uses the anon client on purpose — resetPasswordForEmail sends through
  // Supabase's configured email templates, which the admin API doesn't do.
  const anonClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { error: resetError } = await anonClient.auth.resetPasswordForEmail(targetEmail, {
    redirectTo: 'https://results.eduxellence.org/reset-password',
  })

  if (resetError) {
    console.error('Error sending password reset:', resetError)
    return { success: false, message: 'Failed to send password reset email' }
  }

  await writeAuditLog(admin, actor.id, 'forced_password_reset', targetUserId, reason, {
    email: targetEmail,
  })

  revalidatePath('/security')
  return { success: true, message: `Reset email sent to ${targetEmail}` }
}

// ── Parent Access Code Actions ──

export async function regenerateParentAccessCode(formData: FormData) {
  const actor = await requireStaffPermission('parents.access_code.manage')
  const targetUserId = formData.get('user_id') as string
  const reason = (formData.get('reason') as string)?.trim()

  if (!targetUserId) return { success: false, message: 'Missing user id' }
  if (!reason) return { success: false, message: 'A reason is required' }

  const admin = serviceClient()
  const newCode = generateAccessCode()

  const { error } = await admin
    .from('parent_accounts')
    .update({
      access_code: newCode,
      access_code_active: true,
      access_code_regenerated_at: new Date().toISOString(),
    })
    .eq('auth_user_id', targetUserId)

  if (error) {
    console.error('Error regenerating access code:', error)
    return { success: false, message: 'Failed to regenerate access code' }
  }

  await writeAuditLog(admin, actor.id, 'regenerated_parent_access_code', targetUserId, reason)

  revalidatePath('/security')
  return { success: true, message: `New code generated: ${newCode}` }
}

export async function setParentPortalAccess(formData: FormData) {
  const actor = await requireStaffPermission('parents.access_code.manage')
  const targetUserId = formData.get('user_id') as string
  const active = formData.get('active') === 'true'
  const reason = (formData.get('reason') as string)?.trim()

  if (!targetUserId) return { success: false, message: 'Missing user id' }
  if (!reason) return { success: false, message: 'A reason is required' }

  const admin = serviceClient()

  const { error } = await admin
    .from('parent_accounts')
    .update({ access_code_active: active })
    .eq('auth_user_id', targetUserId)

  if (error) {
    console.error('Error updating parent portal access:', error)
    return { success: false, message: 'Failed to update portal access' }
  }

  await writeAuditLog(
    admin,
    actor.id,
    active ? 'reactivated_parent_portal' : 'disabled_parent_portal',
    targetUserId,
    reason
  )

  revalidatePath('/security')
  return { success: true }
}

// ── NEW: Revoke All Sessions ──

export async function revokeSessions(formData: FormData) {
  const actor = await requireStaffPermission('security.sessions.manage')
  const targetUserId = formData.get('user_id') as string
  const reason = (formData.get('reason') as string)?.trim()

  if (!targetUserId) return { success: false, message: 'Missing user id' }
  if (!reason) return { success: false, message: 'A reason is required' }
  if (targetUserId === actor.id) return { success: false, message: "You can't revoke your own sessions" }

  const admin = serviceClient()

  const { error } = await admin.auth.admin.signOut(targetUserId, 'global')
  if (error) {
    console.error('Error revoking sessions:', error)
    return { success: false, message: 'Failed to revoke sessions — check server logs for the exact SDK error' }
  }

  await writeAuditLog(admin, actor.id, 'revoked_sessions', targetUserId, reason)
  
  revalidatePath('/security')
  return { success: true }
}