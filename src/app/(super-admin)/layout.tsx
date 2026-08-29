import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCachedUser } from '@/lib/supabase/getCachedUser'
import SuperAdminShell from '@/components/super-admin/SuperAdminShell'
import { getStaffAccess } from '@/lib/auth/getStaffAccess'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await getCachedUser()
  if (!user) redirect('/login')

  const access = await getStaffAccess(supabase, user.id)

  if (!access.isSuperAdmin && !access.isStaff) {
    redirect('/access-denied')
  }

  const { data: aal, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

  if (aalError) {
    console.error('AAL check failed in super-admin layout:', aalError.message)

    // A concurrent request (e.g. middleware or another server component
    // rendering at the same time) may have already consumed this refresh
    // token a moment ago -- this is an expected, transient race under
    // Supabase's single-use refresh tokens, not evidence the session is
    // actually invalid. getCachedUser() and getStaffAccess() above already
    // independently confirmed this user's identity and role, so
    // force-logging them out here would punish a legitimate admin for a
    // benign timing collision. Fail open on THIS specific check only,
    // matching the same policy already used in the login page.
    const isTransientRefreshRace =
      aalError.message?.includes('Already Used') ||
      aalError.message?.includes('Refresh Token Not Found')

    if (!isTransientRefreshRace) {
      redirect('/login')
    }
  } else if (aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    redirect('/login?reauth=1')
  }

  return (
    <SuperAdminShell
      access={{
        isSuperAdmin: access.isSuperAdmin,
        permissions: Array.from(access.permissions),
      }}
    >
      {children}
    </SuperAdminShell>
  )
}