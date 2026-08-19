export const runtime = 'nodejs'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingClient from './OnboardingClient'

export default async function RepOnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rep } = await supabase
    .from('representatives').select('id').eq('user_id', user.id).maybeSingle()
  if (!rep) redirect('/dashboard')

  return <OnboardingClient />
}