// src/app/api/admin/finance/student-ledger/route.ts
// Read-only view of one student's fee account for the given term: balance
// summary, invoice line items (with due dates -- previously nowhere in the
// admin UI either, only ever computed for the FIFO allocation logic
// internally), and payment history including voided ones (shown, not
// hidden, so staff can see the full picture).
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: userRow } = await supabase.from('users').select('organization_id, role').eq('id', user.id).single()
  if (!userRow?.organization_id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  if (userRow.role !== 'admin') {
    const { data: hasPerm } = await supabase.rpc('has_permission', { p_user_id: user.id, p_permission_key: 'fees.view' })
    if (!hasPerm) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const learnerId = searchParams.get('learnerId')
  const termId = searchParams.get('termId')

  if (!learnerId || !termId) {
    return NextResponse.json({ error: 'learnerId and termId are required' }, { status: 400 })
  }

  const { data: learner } = await supabase.from('learners').select('id, organization_id').eq('id', learnerId).single()
  if (!learner || learner.organization_id !== userRow.organization_id) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  const { data: account } = await supabase
    .from('student_fee_accounts')
    .select('id')
    .eq('learner_id', learnerId)
    .eq('term_id', termId)
    .maybeSingle()

  if (!account) {
    return NextResponse.json({ hasAccount: false });
  }

  const [{ data: invoices }, { data: payments }, { data: adjustments }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, status, issued_at, invoice_line_items(id, description, amount, due_date, category_id, finance_categories(name))')
      .eq('student_fee_account_id', account.id)
      .eq('status', 'issued')
      .order('issued_at', { ascending: true }),
    supabase
      .from('payments')
      .select('id, amount, method, reference, paid_date, status, voided, voided_at, void_reason, created_at')
      .eq('student_fee_account_id', account.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('fee_adjustments_v2')
      .select('amount, status')
      .eq('student_fee_account_id', account.id)
      .in('status', ['approved', 'auto_approved']),
  ])

  const lineItems = (invoices ?? []).flatMap((inv: any) =>
    (inv.invoice_line_items ?? []).map((li: any) => ({
      id: li.id,
      description: li.description,
      amount: li.amount,
      dueDate: li.due_date,
      categoryName: li.finance_categories?.name ?? 'Uncategorized',
    }))
  )

  const totalCharged = lineItems.reduce((sum, i) => sum + Number(i.amount), 0)
  const totalAdjusted = (adjustments ?? []).reduce((sum: number, a: any) => sum - Number(a.amount), 0)

  const nonVoidedPaymentIds = (payments ?? []).filter((p: any) => !p.voided).map((p: any) => p.id)
  let totalPaid = 0
  if (nonVoidedPaymentIds.length > 0) {
    const { data: allocations } = await supabase
      .from('payment_allocations')
      .select('amount_allocated')
      .in('payment_id', nonVoidedPaymentIds)
    totalPaid = (allocations ?? []).reduce((sum: number, a: any) => sum + Number(a.amount_allocated), 0)
  }

  const outstanding = totalCharged - totalPaid - totalAdjusted

  return NextResponse.json({
    hasAccount: true,
    accountId: account.id,
    lineItems,
    payments: payments ?? [],
    balance: { totalCharged, totalAdjusted, totalPaid, outstanding },
  })
}