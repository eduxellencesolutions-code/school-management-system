import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Resolves a school-level user's full permission set, mirroring the
 * has_permission() SQL function's exact logic (admin = universal bypass,
 * everyone else = union of permissions granted via their active role
 * assignments). Used to drive sidebar visibility -- NOT a substitute for
 * the per-request has_permission() RPC check that every API route and page
 * must still perform. The sidebar is a navigation aid; the real security
 * boundary stays server-side on each route/page.
 */
export async function getSchoolPermissions(
  supabase: SupabaseClient,
  userId: string,
  role: string | null | undefined
): Promise<{ isAdmin: boolean; permissions: string[] }> {
  if (role === 'admin') {
    return { isAdmin: true, permissions: [] }
  }

  // Two-step query — PostgREST cannot resolve a direct relationship between
  // staff_role_assignments and role_permissions (the FK path goes through
  // school_roles), so the previous embedded-resource query always returned
  // an error and silently yielded an empty permission set.
  const { data: assignments, error: assignmentsError } = await supabase
    .from('staff_role_assignments')
    .select('role_id')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (assignmentsError || !assignments || assignments.length === 0) {
    return { isAdmin: false, permissions: [] }
  }

  const roleIds = assignments.map((a: any) => a.role_id)

  const { data: permissionRows, error: permError } = await supabase
    .from('role_permissions')
    .select('permission_key')
    .in('role_id', roleIds)

  if (permError || !permissionRows) {
    return { isAdmin: false, permissions: [] }
  }

  const keys = new Set<string>()
  for (const p of permissionRows) {
    if (p.permission_key) keys.add(p.permission_key)
  }

  return { isAdmin: false, permissions: [...keys] }
}