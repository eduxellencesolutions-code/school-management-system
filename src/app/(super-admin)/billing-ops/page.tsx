import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'
import BillingOpsClient from '@/components/super-admin/BillingOpsClient'

export const dynamic = 'force-dynamic'

export default async function BillingOpsPage() {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')
  const check = async (k: string) => (await supabase.rpc('has_platform_permission', { p_user_id: user.id, p_permission_key: k })).data === true
  if (!(await check('billing.view'))) redirect('/dashboard')
  const canResolve = await check('billing.reconcile.confirm')
  const canReview = canResolve || (await check('billing.reconcile.review'))
  const { data: isSuper } = await supabase.rpc('is_super_admin')
  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="text-xl font-bold text-ink">Billing operations</h1>
        <p className="text-sm text-ink-muted mt-1">Verified counts, quotes, payments, entitlements and reconciliation. Payment secrets are never shown.</p></div>
      <BillingOpsClient canReview={canReview} canResolve={canResolve} isSuperAdmin={isSuper === true} />
    </div>
  )
}