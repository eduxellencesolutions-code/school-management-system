import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FeeLedgerManager from '@/components/fees/FeeLedgerManager'

export default async function FeeLedgerPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: user } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', authUser.id)
    .single()

  if (!user?.organization_id) redirect('/dashboard')

  // ✅ FIX: Check permission instead of hard role check
  const { data: canViewFees } = await supabase.rpc('has_permission', { 
    p_user_id: authUser.id, 
    p_permission_key: 'fees.view' 
  })
  if (user.role !== 'admin' && !canViewFees) redirect('/dashboard')

  const { data: classes } = await supabase
    .from('groups')
    .select('id, name')
    .eq('organization_id', user.organization_id)
    .eq('type', 'class')
    .eq('is_active', true)
    .order('name')

  const { data: org } = await supabase
    .from('organizations')
    .select('current_term_id')
    .eq('id', user.organization_id)
    .single()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Fee Ledger</h1>
        <p className="page-subtitle">Record charges, payments, and view balances per student.</p>
      </div>

      {!classes || classes.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-muted">No classes found.</div>
      ) : (
        <FeeLedgerManager classes={classes} termId={org?.current_term_id ?? null} />
      )}
    </div>
  )
}