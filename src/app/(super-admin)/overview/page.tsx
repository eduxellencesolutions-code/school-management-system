// app/(super-admin)/overview/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SuperAdminOverview() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check if user is super admin
  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')
  if (!isSuperAdmin) redirect('/dashboard')

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">Super Admin</h1>
      <p className="text-sm text-ink-muted mt-1">Platform overview — organizations, subscribers, and system health.</p>
    </div>
  )
}
