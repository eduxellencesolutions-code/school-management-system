import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SupportCenter from '@/components/support/SupportCenter'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export default async function SchoolSupportPage() {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  return <SupportCenter />
}