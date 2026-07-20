import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import { getSubscriptionState } from '@/lib/subscription/getSubscriptionState'
import GracePeriodBanner from '@/components/billing/GracePeriodBanner'
import ExpiredBanner from '@/components/billing/ExpiredBanner'

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
          {/* ✅ Grace period banner - shown when subscription is in grace period */}
          {subState.isGracePeriod && subState.daysRemaining !== null && (
            <div className="mb-4">
              <GracePeriodBanner daysRemaining={subState.daysRemaining} />
            </div>
          )}
          
          {/* ✅ Expired banner - shown when subscription has expired */}
          {subState.isExpired && (
            <div className="mb-4">
              <ExpiredBanner />
            </div>
          )}
          
          {children}
        </div>
      </main>
    </div>
  )
}
