import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RepManagementCentre from '@/components/super-admin/RepManagementCentre'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export const dynamic = 'force-dynamic'

export default async function RepresentativesPage() {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  const { data: canView } = await supabase.rpc('has_platform_permission', { p_user_id: user.id, p_permission_key: 'representatives.view' })
  if (!canView) redirect('/dashboard')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Representative Management Centre</h1>
        <p className="text-sm text-ink-muted mt-1">Review identity, agreements, account status and performance across the representative network</p>
      </div>
      <RepManagementCentre />
    </div>
  )
}