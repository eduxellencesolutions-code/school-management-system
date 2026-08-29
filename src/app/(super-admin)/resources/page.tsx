import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ResourceManager from '@/components/super-admin/ResourceManager'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export const dynamic = 'force-dynamic'

export default async function ResourcesPage() {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')
  const { data: canManage } = await supabase.rpc('has_platform_permission', { p_user_id: user.id, p_permission_key: 'representatives.view' })
  if (!canManage) redirect('/dashboard')
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Representative Resources</h1>
        <p className="text-sm text-ink-muted mt-1">Manage materials available to representatives</p>
      </div>
      <ResourceManager />
    </div>
  )
}