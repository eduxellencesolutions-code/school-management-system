import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RolesManager from '@/components/roles/RolesManager'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export default async function RolesPage() {
  const supabase = await createClient()
  const { user: authUser } = await getAuthenticatedUser(supabase)
  if (!authUser) redirect('/login')

  const { data: user } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', authUser.id)
    .single()

  if (!user?.organization_id) redirect('/dashboard')
  if (user.role !== 'admin') redirect('/dashboard')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Staff Roles & Permissions</h1>
        <p className="page-subtitle">Create roles, define what they can do, and assign staff.</p>
      </div>
      <RolesManager />
    </div>
  )
}