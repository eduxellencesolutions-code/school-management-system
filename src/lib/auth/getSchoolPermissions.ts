import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Resolves a school-level user's full permission set in one query, mirroring
 * the has_permission() SQL function's exact logic (admin = universal bypass,
 * everyone else = union of permissions granted via their active role
 * assignments). Used to drive sidebar visibility -- NOT a substitute for the
 * per-request has_permission() RPC check that every API route and page must
 * still perform. The sidebar is a navigation aid; the real security boundary
 * stays server-side on each route/page.
 */
export async function getSchoolPermissions(
  supabase: SupabaseClient,
  userId: string,
  role: string | null | undefined
): Promise<{ isAdmin: boolean; permissions: string[] }> {
  if (role === 'admin') {
    return { isAdmin: true, permissions: [] } // admin bypasses every check; explicit list not needed
  }

  const { data, error } = await supabase
    .from('staff_role_assignments')
    .select('role_permissions:role_permissions!inner(permission_key)')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error || !data) return { isAdmin: false, permissions: [] }

  // Supabase returns the joined table as an array per row even for a single match;
  // flatten and dedupe.
  const keys = new Set<string>()
  for (const row of data as any[]) {
    const joined = row.role_permissions
    if (Array.isArray(joined)) {
      joined.forEach((p: any) => p?.permission_key && keys.add(p.permission_key))
    } else if (joined?.permission_key) {
      keys.add(joined.permission_key)
    }
  }

  return { isAdmin: false, permissions: [...keys] }
}