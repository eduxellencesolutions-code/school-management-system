// src/app/api/admin/finance/payments/[id]/void/route.ts
// Voiding just flips the flag -- payment_allocations rows are left intact
// (matching how the migration preserved voided payments' history), since
// every balance calculation already filters on payments.voided = false.
// No allocation rows need to be touched or deleted.
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: paymentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: userRow } = await supabase.from('users').select('organization_id, role').eq('id', user.id).single()
  if (!userRow?.organization_id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  if (userRow.role !== 'admin') {
    const { data: hasPerm } = await supabase.rpc('has_permission', { p_user_id: user.id, p_permission_key: 'fees.void_payment' })
    if (!hasPerm) return NextResponse.json({ error: 'You do not have permission to void payments' }, { status: 403 })
  }

  const body = await request.json()
  const reason = (body.reason ?? '').toString().trim()
  if (!reason) return NextResponse.json({ error: 'A reason is required to void a payment' }, { status: 400 })

  const { data: payment } = await supabase
    .from('payments')
    .select('id, student_fee_account_id, amount, voided, student_fee_accounts!inner(organization_id)')
    .eq('id', paymentId)
    .single()

  if (!payment || (payment as any).student_fee_accounts.organization_id !== userRow.organization_id) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  }
  if (payment.voided) {
    return NextResponse.json({ error: 'This payment is already voided' }, { status: 409 })
  }

  const { error: updateError } = await supabase
    .from('payments')
    .update({ voided: true, voided_by: user.id, voided_at: new Date().toISOString(), void_reason: reason })
    .eq('id', paymentId)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  await supabase.rpc('log_finance_action', {
    p_org_id: userRow.organization_id, p_actor_id: user.id, p_is_system_generated: false, p_system_job_name: null,
    p_action: 'payment_voided', p_target_type: 'payments', p_target_id: paymentId,
    p_before_value: { amount: payment.amount }, p_after_value: null, p_reason: reason, p_ip_address: ip,
  })

  return NextResponse.json({ success: true })
}