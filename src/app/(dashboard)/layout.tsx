import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import { getSubscriptionState } from '@/lib/subscription/getSubscriptionState'
import { getPlanFeatures } from '@/lib/subscription/getPlanFeatures'
import { getSchoolPermissions } from '@/lib/auth/getSchoolPermissions'
import GracePeriodBanner from '@/components/billing/GracePeriodBanner'
import ExpiredBanner from '@/components/billing/ExpiredBanner'
import ExpiringSoonBanner from '@/components/billing/ExpiringSoonBanner'
import NotificationBell from '@/components/notifications/NotificationBell'
import RepresentativeBanner from '@/components/dashboard/RepresentativeBanner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) redirect('/login')

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!user?.organization_id) {
    // A solo teacher is identified by role, not by already owning a class —
    // a brand-new signup has zero classes and must still reach /dashboard,
    // which already handles the zero-groups case in its own solo-teacher
    // branch. Only redirect away for roles with no personal workspace.
    if (user?.role !== 'teacher') {
      const { data: rep } = await supabase
        .from('representatives')
        .select('id')
        .eq('user_id', authUser.id)
        .maybeSingle()

      redirect(rep ? '/rep' : '/workspaces')
    }
  }

  const { data: org } = user?.organization_id
    ? await supabase
        .from('organizations')
        .select('*')
        .eq('id', user.organization_id)
        .single()
    : { data: null }

  const subState = await getSubscriptionState(supabase, authUser.id)

  // Real plan-feature lookup (backend-driven)
  const planFeatures = await getPlanFeatures(supabase, org?.subscription_plan)

  // Real permission set, computed once, mirroring has_permission() exactly.
  // Sidebar uses this only for what to SHOW -- every route/page still enforces
  // its own has_permission() check server-side regardless of what's rendered here.
  const { isAdmin, permissions } = user?.organization_id
    ? await getSchoolPermissions(supabase, authUser.id, user.role)
    : { isAdmin: false, permissions: [] as string[] }

  const { data: existingRep } = await supabase
    .from('representatives')
    .select('id')
    .eq('user_id', authUser.id)
    .maybeSingle()

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50">
      <Sidebar
        user={user ?? {
          id: authUser.id,
          name: authUser.email ?? 'User',
          email: authUser.email ?? '',
          role: 'teacher',
          organization_id: null
        }}
        org={org}
        features={planFeatures}
        isSchoolAdmin={isAdmin}
        permissions={permissions}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              {!existingRep && <RepresentativeBanner />}
              {subState.isGracePeriod && subState.daysRemaining !== null && (
                <GracePeriodBanner daysRemaining={subState.daysRemaining} />
              )}
              {subState.isExpired && (
                <ExpiredBanner />
              )}
              {subState.isExpiringSoon && subState.daysUntilExpiry !== null && (
                <ExpiringSoonBanner daysUntilExpiry={subState.daysUntilExpiry} />
              )}
            </div>
            <div className="ml-4 shrink-0">
              <NotificationBell />
            </div>
          </div>

          {children}
        </div>
      </main>
    </div>
  )
}