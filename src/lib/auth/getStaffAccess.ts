import { SupabaseClient } from '@supabase/supabase-js'

export interface StaffAccess {
  isSuperAdmin: boolean
  isStaff: boolean
  roleName: string | null
  permissions: Set<string>
}

// ✅ Updated to match your actual platform role names from the database
const ROLE_LANDING: Record<string, string> = {
  'Super Admin': '/overview',
  'Finance Officer': '/commissions',
  'Operations Manager': '/support',
  'Representative Manager': '/representatives',
  'Security Administrator': '/audit',
  'Support Agent': '/support',
}

export async function getStaffAccess(supabase: SupabaseClient, userId: string): Promise<StaffAccess> {
  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')
  if (isSuperAdmin) {
    return { isSuperAdmin: true, isStaff: false, roleName: 'Super Admin', permissions: new Set() }
  }

  const { data: staffRow } = await supabase
    .from('platform_staff')
    .select('status, role_id, platform_roles(name)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (!staffRow) {
    return { isSuperAdmin: false, isStaff: false, roleName: null, permissions: new Set() }
  }

  const roleName = (staffRow as unknown as { platform_roles?: { name?: string } }).platform_roles?.name ?? null

  const { data: perms } = await supabase
    .from('platform_role_permissions')
    .select('permission_key')
    .eq('role_id', staffRow.role_id)

  return {
    isSuperAdmin: false,
    isStaff: true,
    roleName,
    permissions: new Set((perms ?? []).map(p => p.permission_key)),
  }
}

export function hasPermission(access: StaffAccess, key: string): boolean {
  return access.isSuperAdmin || access.permissions.has(key)
}

// ✅ UPDATED: Universal landing page is /welcome
export function getStaffLandingPath(access: StaffAccess): string {
  return '/welcome'
}