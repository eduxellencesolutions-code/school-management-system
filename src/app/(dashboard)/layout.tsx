import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import { getSubscriptionState } from '@/lib/subscription/getSubscriptionState'
import GracePeriodBanner from '@/components/billing/GracePeriodBanner'
import ExpiredBanner from '@/components/billing/ExpiredBanner'
import ExpiringSoonBanner from '@/components/billing/ExpiringSoonBanner'
import NotificationBell from '@/components/notifications/NotificationBell'
import RepresentativeBanner from '@/components/dashboard/RepresentativeBanner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  
  // Only redirect if truly not logged in
  if (!authUser) redirect('/login')

  // Fetch user profile — don't redirect if missing, user may be new
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  // Block access if this account has no legitimate school/teacher context
  // (e.g. a Representative-only account) but redirect them somewhere useful
  // instead of rendering an empty teacher shell.
  if (!user?.organization_id) {
    const { data: ownedGroup } = await supabase
      .from('groups')
      .select('id')
      .eq('instructor_id', authUser.id)
      .limit(1)
      .maybeSingle()

    if (!ownedGroup) {
      const { data: rep } = await supabase
        .from('representatives')
        .select('id')
        .eq('user_id', authUser.id)
        .maybeSingle()

      redirect(rep ? '/rep' : '/workspaces')
    }
  }

  // Fetch org if linked
  const { data: org } = user?.organization_id
    ? await supabase
        .from('organizations')
        .select('*')
        .eq('id', user.organization_id)
        .single()
    : { data: null }

  // ✅ Get subscription state for grace period and expired banners
  const subState = await getSubscriptionState(supabase, authUser.id)

  // Only promote the rep program to people who aren't already a rep
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
      />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {/* ✅ Header with Notification Bell */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              {!existingRep && <RepresentativeBanner />}
              {/* Grace period banner - shown when subscription is in grace period */}
              {subState.isGracePeriod && subState.daysRemaining !== null && (
                <GracePeriodBanner daysRemaining={subState.daysRemaining} />
              )}
              
              {/* Expired banner - shown when subscription has expired */}
              {subState.isExpired && (
                <ExpiredBanner />
              )}

              {/* ✅ NEW: Expiring soon banner - shown when subscription expires within 3 days */}
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