import { supabase } from './client'

export function isAdminRole(role: string): boolean {
  return role === 'admin' || role === 'school_admin'
}

export async function hasPermission(userId: string, permissionKey: string): Promise<boolean> {
  const { data } = await supabase.rpc('has_permission', { p_user_id: userId, p_permission_key: permissionKey })
  return !!data
}

// Replicates the exact three-tier pattern from students/page.tsx and classes/page.tsx:
// 1. admin/school_admin -> full org access
// 2. non-admin with a relevant permission -> full org access
// 3. everyone else -> assigned-classes-only
export type AccessTier = 'full' | 'assigned'

export async function resolveAccessTier(
  userId: string,
  role: string,
  relevantPermissions: string[]
): Promise<AccessTier> {
  if (isAdminRole(role)) return 'full'
  for (const perm of relevantPermissions) {
    if (await hasPermission(userId, perm)) return 'full'
  }
  return 'assigned'
}

export async function canManageAnnouncements(userId: string, role: string): Promise<boolean> {
  if (isAdminRole(role)) return true
  return hasPermission(userId, 'announcements.post')
}