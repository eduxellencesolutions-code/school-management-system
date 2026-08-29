import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getStaffAccess } from '@/lib/auth/getStaffAccess'
import PlatformUsersDirectory from '@/components/super-admin/PlatformUsersDirectory'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export const dynamic = 'force-dynamic'

export default async function PlatformUsersPage() {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  const access = await getStaffAccess(supabase, user.id)
  const allowed = access.isSuperAdmin || access.permissions.has('platform_users.view')
  if (!allowed) redirect('/dashboard')

  const canManageLocks = access.isSuperAdmin || access.permissions.has('security.account_lock.manage')
  const canForceReset = access.isSuperAdmin || access.permissions.has('security.password_reset.force')
  const canManageParentAccess = access.isSuperAdmin || access.permissions.has('parents.access_code.manage')
  const canRevokeSessions = access.isSuperAdmin || access.permissions.has('security.sessions.manage')  // ✅ NEW

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Platform Users</h1>
        <p className="text-sm text-ink-muted mt-1">Search and manage every user across the Eduxellence platform</p>
      </div>
      <PlatformUsersDirectory 
        canManageLocks={canManageLocks} 
        canForceReset={canForceReset} 
        canManageParentAccess={canManageParentAccess}
        canRevokeSessions={canRevokeSessions}  // ✅ NEW
      />
    </div>
  )
}