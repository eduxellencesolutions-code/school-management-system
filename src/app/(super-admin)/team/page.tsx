import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TeamManager from '@/components/super-admin/TeamManager'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')
  if (!isSuperAdmin) redirect('/dashboard')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Platform Team</h1>
        <p className="text-sm text-ink-muted mt-1">Manage delegated staff, roles, and permissions</p>
      </div>
      <TeamManager />
    </div>
  )
}