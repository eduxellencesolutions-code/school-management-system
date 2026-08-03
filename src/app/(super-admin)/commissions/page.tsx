import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CommissionQueue from '@/components/super-admin/CommissionQueue'

export const dynamic = 'force-dynamic'

export default async function CommissionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: canApprove } = await supabase.rpc('has_platform_permission', { 
    p_user_id: user.id, 
    p_permission_key: 'commissions.approve' 
  })
  if (!canApprove) redirect('/dashboard')

  const { data: canEarlyRelease } = await supabase.rpc('has_platform_permission', { 
    p_user_id: user.id, 
    p_permission_key: 'commissions.early_release' 
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Commissions</h1>
        <p className="text-sm text-ink-muted mt-1">Approve, reject, and record commission payouts</p>
      </div>
      <CommissionQueue canEarlyRelease={!!canEarlyRelease} />
    </div>
  )
}