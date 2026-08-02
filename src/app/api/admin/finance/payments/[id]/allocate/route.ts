// src/app/api/admin/finance/payments/[id]/allocate/route.ts
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
    const { data: canManual } = await supabase.rpc('has_permission', { p_user_id: user.id, p_permission_key: 'finance.manual_allocation' })
    if (!canManual) return NextResponse.json({ error: 'You do not have manual allocation permission' }, { status: 403 })
  }

  const { data: payment } = await supabase
    .from('payments')
    .select('id, amount, student_fee_account_id, voided')
    .eq('id', paymentId)
    .single()

  if (!payment || payment.voided) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

  const { data: account } = await supabase
    .from('student_fee_accounts')
    .select('organization_id')
    .eq('id', payment.student_fee_account_id)
    .single()

  if (!account || account.organization_id !== userRow.organization_id) {
    return NextResponse.json({ error: 'Not authorized for this account' }, { status: 403 })
  }

  const { data: existingAllocations } = await supabase
    .from('payment_allocations')
    .select('amount_allocated')
    .eq('payment_id', paymentId)

  const alreadyAllocated = (existingAllocations ?? []).reduce((s, a) => s + Number(a.amount_allocated), 0)
  if (alreadyAllocated > 0) {
    return NextResponse.json({ error: 'This payment already has allocations. Void and re-record to reallocate.' }, { status: 409 })
  }

  const body = await request.json()
  const { allocations } = body as { allocations: { invoiceLineItemId: string; amount: number }[] }

  if (!allocations || allocations.length === 0) {
    return NextResponse.json({ error: 'At least one allocation is required' }, { status: 400 })
  }

  const totalRequested = allocations.reduce((s, a) => s + Number(a.amount), 0)
  if (totalRequested > Number(payment.amount)) {
    return NextResponse.json({ error: 'Allocation total exceeds payment amount' }, { status: 400 })
  }

  const lineItemIds = allocations.map(a => a.invoiceLineItemId)
  const { data: lineItems } = await supabase
    .from('invoice_line_items')
    .select('id, invoice_id, invoices!inner(student_fee_account_id)')
    .in('id', lineItemIds)

  const validIds = new Set((lineItems ?? []).filter((li: any) => li.invoices.student_fee_account_id === payment.student_fee_account_id).map((li: any) => li.id))

  for (const alloc of allocations) {
    if (!validIds.has(alloc.invoiceLineItemId)) {
      return NextResponse.json({ error: 'One or more line items do not belong to this student account' }, { status: 400 })
    }
  }

  const { error: insertError } = await supabase.from('payment_allocations').insert(
    allocations.map(a => ({ payment_id: paymentId, invoice_line_item_id: a.invoiceLineItemId, amount_allocated: a.amount, allocated_by: user.id }))
  )
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  await supabase.rpc('log_finance_action', {
    p_org_id: userRow.organization_id, p_actor_id: user.id, p_is_system_generated: false, p_system_job_name: null,
    p_action: 'payment_manually_allocated', p_target_type: 'payments', p_target_id: paymentId,
    p_before_value: null, p_after_value: { allocations }, p_reason: null, p_ip_address: ip,
  })

  return NextResponse.json({ success: true })
}