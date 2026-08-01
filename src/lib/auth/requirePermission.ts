import { SupabaseClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { getStaffAccess } from './getStaffAccess'

/**
 * Centralized page-level guard. Redirects to /dashboard if the current user
 * doesn't have the given permission and isn't a super admin (super admins
 * bypass every permission check automatically).
 *
 * Usage in a page.tsx:
 *   const supabase = await createClient()
 *   const { data: { user } } = await supabase.auth.getUser()
 *   if (!user) redirect('/login')
 *   await requirePermission(supabase, user.id, 'security.dashboard.view')
 */
export async function requirePermission(
  supabase: SupabaseClient,
  userId: string,
  permissionKey: string
): Promise<void> {
  const access = await getStaffAccess(supabase, userId)
  const allowed = access.isSuperAdmin || access.permissions.has(permissionKey)
  if (!allowed) redirect('/dashboard')
}

/**
 * Non-redirecting variant for conditional UI (e.g. "only show this button
 * if the user can do X"), rather than gating an entire page.
 */
export async function checkPermission(
  supabase: SupabaseClient,
  userId: string,
  permissionKey: string
): Promise<boolean> {
  const access = await getStaffAccess(supabase, userId)
  return access.isSuperAdmin || access.permissions.has(permissionKey)
}