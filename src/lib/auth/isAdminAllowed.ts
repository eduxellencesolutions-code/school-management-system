import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Returns true if the user is either a super admin or an active platform_staff member.
 * Use this anywhere a page under (super-admin) currently checks is_super_admin alone.
 */
export async function isAdminAllowed(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')
  if (isSuperAdmin) return true

  const { data: staffRow } = await supabase
    .from('platform_staff')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  return !!staffRow
}