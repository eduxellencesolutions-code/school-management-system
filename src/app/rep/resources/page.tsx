export const runtime = 'nodejs'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ResourceCentreClient from './ResourceCentreClient'

export default async function ResourceCentrePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: rep } = await supabase.from('representatives').select('id').eq('user_id', user.id).maybeSingle()
  if (!rep) redirect('/dashboard')
  return <ResourceCentreClient />
}