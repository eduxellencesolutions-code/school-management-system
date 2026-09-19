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
import FoundingBanner from '@/components/founding-500/FoundingBanner'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'
import { getPortalContext, comparePortalToSession } from '@/lib/domains/portalContext'
import WrongPortalNotice from '@/components/domains/WrongPortalNotice'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { user: authUser } = await getAuthenticatedUser(supabase)

  if (!authUser) redirect('/login')

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!user) {
    const { data: learnerId } = await supabase.rpc('get_my_learner_id')
    if (learnerId) redirect('/student')
  }

  if (!user?.organization_id) {
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

  // ---- Custom-domain portal context ---------------------------------------
  const portal = await getPortalContext()
  const portalMatch = comparePortalToSession(portal, user?.organization_id ?? null)

  if (portalMatch === 'mismatch') {
    return (
      <WrongPortalNotice
        orgId={portal.organizationId}
        orgName={portal.orgName}
        correctPortalHref="https://results.eduxellence.org/dashboard"
      />
    )
  }

  const subState = await getSubscriptionState(supabase, authUser.id)
  const planFeatures = await getPlanFeatures(supabase, org?.subscription_plan, org?.id)

  const { isAdmin, permissions } = user?.organization_id
    ? await getSchoolPermissions(supabase, authUser.id, user.role)
    : { isAdmin: false, permissions: [] as string[] }

  const { data: existingRep } = await supabase
    .from('representatives')
    .select('id')
    .eq('user_id', authUser.id)
    .maybeSingle()

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-surface-50">
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
              <FoundingBanner />
              {subState.isGracePeriod && subState.daysRemaining !== null && (
                <GracePeriodBanner daysRemaining={subState.daysRemaining} />
              )}
              {subState.isExpired && <ExpiredBanner />}
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