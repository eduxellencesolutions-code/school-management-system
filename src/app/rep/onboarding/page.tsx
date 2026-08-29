export const runtime = 'nodejs'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingClient from './OnboardingClient'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export default async function RepOnboardingPage() {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  const { data: rep } = await supabase
    .from('representatives').select('id').eq('user_id', user.id).maybeSingle()
  if (!rep) redirect('/dashboard')

  return <OnboardingClient />
}