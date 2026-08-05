// src/app/api/admin/finance/invoices/bulk-issue/preview/route.ts
// Read-only -- no rows written. Lets the UI show student count, total value,
// and duplicate-skip count before the admin confirms the real bulk issue.
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: userRow } = await supabase.from('users').select('organization_id, role').eq('id', user.id).single()
  if (!userRow?.organization_id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  if (userRow.role !== 'admin') {
    const { data: hasPerm } = await supabase.rpc('has_permission', { p_user_id: user.id, p_permission_key: 'finance.issue_invoices' })
    if (!hasPerm) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const groupId = searchParams.get('groupId')
  const feeStructureId = searchParams.get('feeStructureId')
  const override = searchParams.get('override') === 'true'

  if (!groupId || !feeStructureId) {
    return NextResponse.json({ error: 'groupId and feeStructureId are required' }, { status: 400 })
  }

  const { data: structure } = await supabase
    .from('fee_structures')
    .select('id, organization_id, group_id, fee_structure_items(amount)')
    .eq('id', feeStructureId)
    .single()

  if (!structure || structure.organization_id !== userRow.organization_id) {
    return NextResponse.json({ error: 'Fee structure not found' }, { status: 404 })
  }

  if (structure.group_id && structure.group_id !== groupId) {
    return NextResponse.json({ error: 'This fee structure was built for a different class' }, { status: 400 })
  }

  const structureTotal = (structure.fee_structure_items ?? []).reduce((sum: number, i: any) => sum + Number(i.amount), 0)

  const { data: learners } = await supabase
    .from('learners')
    .select('id')
    .eq('group_id', groupId)
    .eq('is_active', true)

  const learnerIds = (learners ?? []).map((l: any) => l.id)
  const studentCount = learnerIds.length

  let alreadyInvoicedCount = 0
  if (learnerIds.length > 0) {
    const { data: accounts } = await supabase
      .from('student_fee_accounts')
      .select('id, learner_id')
      .in('learner_id', learnerIds)

    const accountIds = (accounts ?? []).map((a: any) => a.id)
    if (accountIds.length > 0) {
      const { data: existingInvoices } = await supabase
        .from('invoices')
        .select('student_fee_account_id')
        .in('student_fee_account_id', accountIds)
        .eq('fee_structure_id', feeStructureId)
        .eq('status', 'issued')

      alreadyInvoicedCount = new Set((existingInvoices ?? []).map((i: any) => i.student_fee_account_id)).size
    }
  }

  const willSkip = override ? 0 : alreadyInvoicedCount
  const eligibleCount = studentCount - willSkip

  return NextResponse.json({
    studentCount,
    alreadyInvoicedCount,
    willSkip,
    eligibleCount,
    structureTotal,
    totalValue: structureTotal * eligibleCount,
  })
}