import { SupabaseClient } from '@supabase/supabase-js'

export type Workspace = {
  type: 'school' | 'solo_teacher' | 'representative' | 'super_admin' | 'staff'
  label: string
  sublabel: string
  href: string
}

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
    workspaces.push({
      type: 'super_admin',
      label: 'Platform Administration',
      sublabel: 'Super Admin',
      href: 'https://admin.eduxellence.org/overview',
    })
  }

  // Platform staff workspace — active platform_staff row is the source of truth.
  // A person can legitimately hold this alongside a school/rep role (e.g. a
  // teacher who is also an Operations Manager on the platform side).
  if (!isSuperAdmin) {
    const { data: staffRow } = await supabase
      .from('platform_staff')
      .select('id, status, platform_roles(name)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()

    if (staffRow) {
      const roleName = (staffRow as { platform_roles?: { name?: string } }).platform_roles?.name
      workspaces.push({
        type: 'staff',
        label: 'Platform Administration',
        sublabel: roleName ?? 'Platform Staff',
        href: 'https://admin.eduxellence.org/overview',
      })
    }
  }

  // Representative workspace — presence of a representatives row is the source of truth,
  // not the users.role value (role is just a hint used at signup time).
  // Retained even after staff promotion so commission history stays viewable.
  const { data: rep } = await supabase
    .from('representatives')
    .select('id, territory_state')
    .eq('user_id', userId)
    .maybeSingle()
  if (rep) {
    workspaces.push({
      type: 'representative',
      label: 'Representative Portal',
      sublabel: rep.territory_state ? `${rep.territory_state} territory` : 'Representative',
      href: '/rep',
    })
  }

  // School/Teacher workspace — legitimate only if there's real org context,
  // or the user owns at least one class directly (solo teacher pattern).
  // Split into two distinct workspace types so the selector can be explicit
  // about which dashboard a person is entering.
  if (profile?.organization_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', profile.organization_id)
      .maybeSingle()
    workspaces.push({
      type: 'school',
      label: org?.name ?? 'Institution Dashboard',
      sublabel: 'Institution Dashboard',
      href: '/dashboard',
    })
  } else if (profile && profile.role !== 'representative') {
    const { data: ownedGroup } = await supabase
      .from('groups')
      .select('id')
      .eq('instructor_id', userId)
      .limit(1)
      .maybeSingle()
    if (ownedGroup) {
      workspaces.push({
        type: 'solo_teacher',
        label: 'My Teaching Workspace',
        sublabel: 'Solo Teacher Dashboard',
        href: '/dashboard',
      })
    }
  }

  return workspaces
}