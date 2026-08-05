// src/app/api/admin/finance/invoices/bulk-issue/route.ts
// Real bulk issuance to an entire class, delegated to bulk_issue_invoices()
// so the whole operation runs as one guarded database transaction with
// per-student savepoint handling. This file previously held individual-issue
// logic under the wrong name -- that logic now lives at
// invoices/issue/route.ts, matching what it actually does.
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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
  const { groupId, feeStructureId, override } = body

  if (!groupId || !feeStructureId) {
    return NextResponse.json({ error: 'groupId and feeStructureId are required' }, { status: 400 })
  }

  if (override) {
    const { data: canOverride } = await supabase.rpc('has_permission', {
      p_user_id: user!.id, p_permission_key: 'finance.override_duplicate_invoice',
    })
    if (!canOverride) return NextResponse.json({ error: 'You cannot override duplicate invoice protection' }, { status: 403 })
  }

  // Ownership check up front, so a bad org's group/structure never reaches the function.
  const { data: group } = await supabase.from('groups').select('id, organization_id').eq('id', groupId).single()
  if (!group || group.organization_id !== orgId) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 })
  }

  const { data: result, error: rpcError } = await supabase.rpc('bulk_issue_invoices', {
    p_org_id: orgId,
    p_group_id: groupId,
    p_fee_structure_id: feeStructureId,
    p_actor_id: user!.id,
    p_override: !!override,
  })

  if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 500 })

  const row = Array.isArray(result) ? result[0] : result

  return NextResponse.json({
    success: true,
    invoicesCreated: row?.invoices_created ?? 0,
    skipped: row?.skipped ?? 0,
    failed: row?.failed ?? 0,
    failedDetails: row?.failed_details ?? [],
  })
}