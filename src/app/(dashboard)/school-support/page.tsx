import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SupportCenter from '@/components/support/SupportCenter'

export default async function SchoolSupportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <SupportCenter />
}