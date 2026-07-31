import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SuperAdminShell from '@/components/super-admin/SuperAdminShell'
import { getStaffAccess } from '@/lib/auth/getStaffAccess'

// Force this segment to be evaluated fresh on every request — rules out
// any static/edge caching of the auth decision.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const access = await getStaffAccess(supabase, user.id)

  // TEMPORARY DIAGNOSTIC — remove once the access-denied mismatch is resolved.
  console.error('[super-admin layout]', {
    userId: user.id,
    userEmail: user.email,
    access: { ...access, permissions: Array.from(access.permissions) },
    timestamp: new Date().toISOString(),
  })

  if (!access.isSuperAdmin && !access.isStaff) {
    redirect('/access-denied')
  }

  // Require step-up (aal2) if this account has a verified MFA factor.
  // If they've never enrolled, nextLevel stays 'aal1' and this passes through.
  const { data: aal, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

  if (aalError) {
    console.error('AAL check failed in super-admin layout:', aalError.message)
    redirect('/login')
  }

  if (aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    redirect('/login?reauth=1')
  }

  return <SuperAdminShell>{children}</SuperAdminShell>
}