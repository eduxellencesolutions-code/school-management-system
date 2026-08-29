import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getStaffAccess, hasPermission } from '@/lib/auth/getStaffAccess'
import AnalyticsDashboard from '@/components/super-admin/AnalyticsDashboard'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  // ✅ Use the shared permission helper
  const access = await getStaffAccess(supabase, user.id)
  const allowed = access.isSuperAdmin || hasPermission(access, 'analytics.view')
  if (!allowed) redirect('/dashboard')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Platform Analytics</h1>
        <p className="text-sm text-ink-muted mt-1">Revenue, growth, and usage across Eduxellence</p>
      </div>
      <AnalyticsDashboard />
    </div>
  )
}