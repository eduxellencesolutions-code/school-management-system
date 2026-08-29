import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CommissionQueue from '@/components/super-admin/CommissionQueue'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export const dynamic = 'force-dynamic'

export default async function CommissionsPage() {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  const { data: canApprove } = await supabase.rpc('has_platform_permission', {
    p_user_id: user.id,
    p_permission_key: 'commissions.approve',
  })
  const { data: canVoid } = await supabase.rpc('has_platform_permission', {
    p_user_id: user.id,
    p_permission_key: 'commissions.void',
  })
  const { data: canEarlyRelease } = await supabase.rpc('has_platform_permission', {
    p_user_id: user.id,
    p_permission_key: 'commissions.early_release',
  })

  // Page is reachable if the staff member holds ANY of the three commission
  // permissions — button-level gating inside CommissionQueue then decides
  // exactly which actions they're allowed to actually use.
  if (!canApprove && !canVoid && !canEarlyRelease) redirect('/dashboard')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Commissions</h1>
        <p className="text-sm text-ink-muted mt-1">Approve, reject, and record commission payouts</p>
      </div>
      <CommissionQueue
        canApprove={!!canApprove}
        canVoid={!!canVoid}
        canEarlyRelease={!!canEarlyRelease}
      />
    </div>
  )
}