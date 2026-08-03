// src/app/(super-admin)/withdrawals/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WithdrawalQueue from '@/components/super-admin/WithdrawalQueue'

export const dynamic = 'force-dynamic'

export default async function WithdrawalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: canApprove } = await supabase.rpc('has_platform_permission', { p_user_id: user.id, p_permission_key: 'commissions.approve' })
  if (!canApprove) redirect('/dashboard')
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Withdrawals</h1>
        <p className="text-sm text-ink-muted mt-1">Approve, reject, and record withdrawal payouts</p>
      </div>
      <WithdrawalQueue />
    </div>
  )
}