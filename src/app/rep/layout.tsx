import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export default async function RepLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')
  const { data: rep } = await supabase.from('representatives').select('id, status').eq('user_id', user.id).maybeSingle()
  if (!rep) redirect('/dashboard')
  if (rep.status !== 'active') redirect('/access-denied')
  return <>{children}</>
}