import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const access = await getStaffAccess(supabase, user.id)

  if (!access.isSuperAdmin && !access.isStaff) {
    redirect('/access-denied')
  }

  const { data: aal, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

  if (aalError) {
    console.error('AAL check failed in super-admin layout:', aalError.message)
    redirect('/login')
  }

  if (aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
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