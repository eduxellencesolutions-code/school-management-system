export const runtime = 'nodejs'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EnrollClient from './EnrollClient'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export default async function FoundingEnrollPage() {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()
  if (!profile?.organization_id) redirect('/dashboard')

  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/founding-500/status`, {
    headers: { cookie: (await import('next/headers')).cookies().toString() },
    cache: 'no-store',
  })
  const status = await res.json()

  return <EnrollClient status={status} isAdmin={profile.role === 'admin'} />
}