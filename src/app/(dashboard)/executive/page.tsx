// src/app/(dashboard)/executive/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExecutiveOverview from '@/components/executive/ExecutiveOverview'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export default async function ExecutivePage() {
  const supabase = await createClient()
  const { user: authUser } = await getAuthenticatedUser(supabase)
  if (!authUser) redirect('/login')

  const { data: user } = await supabase.from('users').select('organization_id, role').eq('id', authUser.id).single()
  if (!user?.organization_id) redirect('/dashboard')

  const { data: hasAccess } = await supabase.rpc('has_permission', {
    p_user_id: authUser.id,
    p_permission_key: 'executive.view_overview',
  })

  if (user.role !== 'admin' && !hasAccess) redirect('/dashboard')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">🏫 School at a Glance</h1>
        <p className="page-subtitle">Know what is happening in your school — without being in the school.</p>
      </div>
      <ExecutiveOverview />
    </div>
  )
}