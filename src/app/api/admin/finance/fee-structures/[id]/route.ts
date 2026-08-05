// src/app/api/admin/finance/fee-structures/[id]/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: structureId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: userRow } = await supabase.from('users').select('organization_id, role').eq('id', user.id).single()
  if (!userRow?.organization_id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  if (userRow.role !== 'admin') {
    const { data: hasPerm } = await supabase.rpc('has_permission', { p_user_id: user.id, p_permission_key: 'fees.manage_structures' })
    if (!hasPerm) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const { data: structure } = await supabase
    .from('fee_structures')
    .select('id, organization_id, name')
    .eq('id', structureId)
    .single()

  if (!structure || structure.organization_id !== userRow.organization_id) {
    return NextResponse.json({ error: 'Fee structure not found' }, { status: 404 })
  }

  const { count } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('fee_structure_id', structureId)

  if (count && count > 0) {
    return NextResponse.json(
      { error: 'This fee structure has already been used to issue invoices and cannot be deleted. Create a new structure instead.' },
      { status: 409 }
    )
  }

  const { error: deleteItemsError } = await supabase.from('fee_structure_items').delete().eq('fee_structure_id', structureId)
  if (deleteItemsError) return NextResponse.json({ error: deleteItemsError.message }, { status: 500 })

  const { error: deleteError } = await supabase.from('fee_structures').delete().eq('id', structureId)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  await supabase.rpc('log_finance_action', {
    p_org_id: userRow.organization_id,
    p_actor_id: user.id,
    p_is_system_generated: false,
    p_system_job_name: null,
    p_action: 'fee_structure_deleted',
    p_target_type: 'fee_structures',
    p_target_id: structureId,
    p_before_value: { name: structure.name },
    p_after_value: null,
    p_reason: null,
    p_ip_address: ip,
  })

  return NextResponse.json({ success: true })
}