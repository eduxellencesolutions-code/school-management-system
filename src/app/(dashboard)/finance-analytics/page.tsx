import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FinanceExecutiveDashboard from '@/components/fees/FinanceExecutiveDashboard'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export default async function FinanceAnalyticsPage() {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  const { data: userRow } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (userRow?.role !== 'admin') redirect('/dashboard')

  return <FinanceExecutiveDashboard />
}