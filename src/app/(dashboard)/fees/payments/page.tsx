// src/app/(dashboard)/fees/payments/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PaymentRecorder from '@/components/fees/PaymentRecorder'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { user: authUser } = await getAuthenticatedUser(supabase)
  if (!authUser) redirect('/login')

  const { data: user } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', authUser.id)
    .single()

  if (!user?.organization_id) redirect('/dashboard')

  const { data: canRecord } = await supabase.rpc('has_permission', {
    p_user_id: authUser.id,
    p_permission_key: 'fees.record_payment',
  })
  if (user.role !== 'admin' && !canRecord) redirect('/dashboard')

  const { data: canVoid } = await supabase.rpc('has_permission', {
    p_user_id: authUser.id,
    p_permission_key: 'fees.void_payment',
  })

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
        <h1 className="page-title">Record Payments</h1>
        <p className="page-subtitle">Record payments and view balances per student.</p>
      </div>

      {!classes || classes.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-muted">No classes found.</div>
      ) : (
        <PaymentRecorder classes={classes} termId={org?.current_term_id ?? null} canVoid={user.role === 'admin' || !!canVoid} />
      )}
    </div>
  )
}