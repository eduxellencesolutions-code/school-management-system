import { createClient } from '@/lib/supabase/server'
import { getStaffAccess } from '@/lib/auth/getStaffAccess'
import { getUserWorkspaces } from '@/lib/workspaces/getUserWorkspaces'
import { NextResponse } from 'next/server'

// TEMPORARY — delete this route once the access-denied issue is diagnosed.
// Not gated behind super-admin check on purpose, so it can be hit while
// mid-redirect-loop; do not leave this in production longer than needed.
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'not authenticated', userError }, { status: 401 })
  }

  const rawStaffQuery = await supabase
    .from('platform_staff')
    .select('id, status, role_id, platform_roles(name)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  const rawIsSuperAdmin = await supabase.rpc('is_super_admin')

  let access, accessError
  try {
    access = await getStaffAccess(supabase, user.id)
  } catch (e: any) {
    accessError = e.message
  }

  let workspaces, workspacesError
  try {
    workspaces = await getUserWorkspaces(supabase, user.id)
  } catch (e: any) {
    workspacesError = e.message
  }

  return NextResponse.json({
    userId: user.id,
    userEmail: user.email,
    rawStaffQuery: { data: rawStaffQuery.data, error: rawStaffQuery.error },
    rawIsSuperAdmin: { data: rawIsSuperAdmin.data, error: rawIsSuperAdmin.error },
    getStaffAccessResult: access ? { ...access, permissions: Array.from(access.permissions) } : null,
    getStaffAccessError: accessError,
    getUserWorkspacesResult: workspaces,
    getUserWorkspacesError: workspacesError,
  })
}