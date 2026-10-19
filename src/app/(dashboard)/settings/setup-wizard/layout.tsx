import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export default async function SetupWizardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')
  const { data: p } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
  const { data: o } = p?.organization_id
    ? await supabase.from('organizations').select('type').eq('id', p.organization_id).single()
    : { data: null }
  if (o?.type !== 'university') redirect('/setup-guide')
  return <>{children}</>
}