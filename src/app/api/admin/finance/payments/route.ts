// src/app/api/admin/finance/payments/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: userRow } = await supabase.from('users').select('organization_id, role').eq('id', user.id).single()
  if (!userRow?.organization_id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  if (userRow.role !== 'admin') {
    const { data: hasPerm } = await supabase.rpc('has_permission', { p_user_id: user.id, p_permission_key: 'fees.record_payment' })
    if (!hasPerm) return NextResponse.json({ error: 'You do not have permission to record payments' }, { status: 403 })
  }

  const body = await request.json()
  const { accountId, amount, method, reference, paidDate } = body

  if (!accountId || amount == null || !method) {
    return NextResponse.json({ error: 'Missing accountId, amount, or method' }, { status: 400 })
  }
  if (Number(amount) <= 0) {
    return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 })
  }

  const { data: account } = await supabase
    .from('student_fee_accounts')
    .select('id, organization_id')
    .eq('id', accountId)
    .single()

  if (!account || account.organization_id !== userRow.organization_id) {
    return NextResponse.json({ error: 'Fee account not found' }, { status: 404 })
  }

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      student_fee_account_id: accountId,
      amount: Number(amount),
      method,
      reference: reference || null,
      status: 'confirmed',
      paid_date: paidDate || new Date().toISOString().split('T')[0],
      recorded_by: user.id,
      voided: false,
    })
    .select('id')
    .single()

  if (paymentError) return NextResponse.json({ error: paymentError.message }, { status: 500 })

  // FIFO allocation happens server-side in the database, same function the
  // migration uses -- keeps allocation logic in exactly one place.
  const { error: allocError } = await supabase.rpc('allocate_payment_fifo', { p_payment_id: payment.id })
  if (allocError) {
    // Payment is recorded but unallocated -- surfaced to the caller rather
    // than silently hidden, since staff need to know to allocate manually.
    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      warning: `Payment recorded, but automatic allocation failed: ${allocError.message}. You may need to allocate it manually.`,
    })
  }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  await supabase.rpc('log_finance_action', {
    p_org_id: userRow.organization_id, p_actor_id: user.id, p_is_system_generated: false, p_system_job_name: null,
    p_action: 'payment_recorded', p_target_type: 'payments', p_target_id: payment.id,
    p_before_value: null, p_after_value: { accountId, amount, method }, p_reason: null, p_ip_address: ip,
  })

  return NextResponse.json({ success: true, paymentId: payment.id })
}