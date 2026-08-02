// src/app/api/admin/finance/invoices/issue/route.ts
// Individual issue — new admissions, mid-term transfers, special billing.
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

async function requireFinancePermission(supabase: any, permissionKey: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  const { data: userRow } = await supabase.from('users').select('organization_id, role').eq('id', user.id).single()
  if (!userRow?.organization_id) return { error: NextResponse.json({ error: 'Not authorized' }, { status: 403 }) }
  if (userRow.role !== 'admin') {
    const { data: hasPerm } = await supabase.rpc('has_permission', { p_user_id: user.id, p_permission_key: permissionKey })
    if (!hasPerm) return { error: NextResponse.json({ error: 'Not authorized' }, { status: 403 }) }
  }
  return { user, orgId: userRow.organization_id }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { user, orgId, error } = await requireFinancePermission(supabase, 'finance.issue_invoices')
  if (error) return error

  const body = await request.json()
  const { learnerId, feeStructureId, override } = body

  if (override) {
    const { data: canOverride } = await supabase.rpc('has_permission', {
      p_user_id: user!.id, p_permission_key: 'finance.override_duplicate_invoice',
    })
    if (!canOverride) return NextResponse.json({ error: 'You cannot override duplicate invoice protection' }, { status: 403 })
  }

  const { data: structure } = await supabase
    .from('fee_structures')
    .select('id, term_id, organization_id')
    .eq('id', feeStructureId)
    .single()

  if (!structure || structure.organization_id !== orgId) {
    return NextResponse.json({ error: 'Fee structure not found' }, { status: 404 })
  }

  const { data: existing } = await supabase
    .from('student_fee_accounts')
    .select('id')
    .eq('learner_id', learnerId)
    .eq('term_id', structure.term_id)
    .maybeSingle()

  const accountId = existing
    ? existing.id
    : (await supabase.from('student_fee_accounts').insert({ organization_id: orgId, learner_id: learnerId, term_id: structure.term_id }).select('id').single()).data?.id

  if (!accountId) return NextResponse.json({ error: 'Failed to resolve fee account' }, { status: 500 })

  const { data: existingInvoice } = await supabase
    .from('invoices')
    .select('id')
    .eq('student_fee_account_id', accountId)
    .eq('fee_structure_id', feeStructureId)
    .eq('status', 'issued')
    .maybeSingle()

  if (existingInvoice && !override) {
    return NextResponse.json({ error: 'This student already has an invoice from this fee structure', duplicate: true }, { status: 409 })
  }

  const { data: structureItems } = await supabase
    .from('fee_structure_items')
    .select('category_id, description, amount, due_date')
    .eq('fee_structure_id', feeStructureId)

  if (!structureItems || structureItems.length === 0) {
    return NextResponse.json({ error: 'Fee structure has no line items' }, { status: 400 })
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({ student_fee_account_id: accountId, fee_structure_id: feeStructureId, status: 'issued', issued_at: new Date().toISOString(), created_by: user!.id })
    .select('id')
    .single()

  if (invoiceError) return NextResponse.json({ error: invoiceError.message }, { status: 500 })

  const { error: lineItemsError } = await supabase.from('invoice_line_items').insert(
    structureItems.map((item: any) => ({ invoice_id: invoice.id, category_id: item.category_id, description: item.description, amount: item.amount, due_date: item.due_date }))
  )
  if (lineItemsError) return NextResponse.json({ error: lineItemsError.message }, { status: 500 })

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  await supabase.rpc('log_finance_action', {
    p_org_id: orgId, p_actor_id: user!.id, p_is_system_generated: false, p_system_job_name: null,
    p_action: existingInvoice ? 'invoice_issued_override_duplicate' : 'invoice_issued',
    p_target_type: 'invoices', p_target_id: invoice.id, p_before_value: null,
    p_after_value: { feeStructureId, accountId }, p_reason: existingInvoice ? 'Individual override' : null, p_ip_address: ip,
  })

  return NextResponse.json({ success: true, invoiceId: invoice.id })
}