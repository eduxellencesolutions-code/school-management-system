import { SupabaseClient } from '@supabase/supabase-js'

export type Workspace =
  | { type: 'school'; label: string; href: string }
  | { type: 'representative'; label: string; href: string }
  | { type: 'super_admin'; label: string; href: string }
  | { type: 'staff'; label: string; href: string }

export async function getUserWorkspaces(
  supabase: SupabaseClient,
  userId: string
): Promise<Workspace[]> {
  const workspaces: Workspace[] = []

  const { data: profile } = await supabase
    .from('users')
    .select('id, role, organization_id')
    .eq('id', userId)
    .maybeSingle()

  // Super admin check first — independent of role/org.
  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')
  if (isSuperAdmin) {
    workspaces.push({ type: 'super_admin', label: 'Super Admin Console', href: 'https://admin.eduxellence.org/overview' })
  }

  // Platform staff workspace — active platform_staff row is the source of truth.
  // Skip this if already flagged super_admin, since that console supersedes it.
  if (!isSuperAdmin) {
    const { data: staffRow } = await supabase
      .from('platform_staff')
      .select('id, status, platform_roles(name)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()

    if (staffRow) {
      const roleName = (staffRow as { platform_roles?: { name?: string } }).platform_roles?.name ?? 'Staff'
      workspaces.push({ type: 'staff', label: `${roleName} (Staff)`, href: 'https://admin.eduxellence.org/overview' })
    }
  }

  // Representative workspace — presence of a representatives row is the source of truth,
  // not the users.role value (role is just a hint used at signup time).
  // Retained even after staff promotion so commission history stays viewable.
  const { data: rep } = await supabase
    .from('representatives')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  if (rep) {
    workspaces.push({ type: 'representative', label: 'Representative Portal', href: '/rep' })
  }

  // School/Teacher workspace — legitimate only if there's real org context,
  // or the user owns at least one class directly (solo teacher pattern).
  if (profile?.organization_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', profile.organization_id)
      .maybeSingle()
    workspaces.push({ type: 'school', label: org?.name ?? 'School Dashboard', href: '/dashboard' })
  } else if (profile && profile.role !== 'representative') {
    const { data: ownedGroup } = await supabase
      .from('groups')
      .select('id')
      .eq('instructor_id', userId)
      .limit(1)
      .maybeSingle()
    if (ownedGroup) {
      workspaces.push({ type: 'school', label: 'My Classes', href: '/dashboard' })
    }
  }

  return workspaces
}