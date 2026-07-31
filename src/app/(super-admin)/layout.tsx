import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SuperAdminShell from '@/components/super-admin/SuperAdminShell'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')
  if (!isSuperAdmin) redirect('/dashboard')

  // Require step-up (aal2) if this account has a verified MFA factor.
  // If they've never enrolled, nextLevel stays 'aal1' and this passes through —
  // nudging/requiring enrollment itself belongs on the Security Center page,
  // not silently blocked here.
  const { data: aal, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

  if (aalError) {
    console.error('AAL check failed in super-admin layout:', aalError.message)
    redirect('/login')
  }

  if (aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    // They have a verified factor but haven't passed the challenge this
    // session. Send them back through login to re-challenge.
    redirect('/login?reauth=1')
  }

  return <SuperAdminShell>{children}</SuperAdminShell>
}