// src/app/api/admin/finance/fee-structures/[id]/items/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

async function requireFeesPermission(supabase: any) {
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  const { data: userRow } = await supabase.from('users').select('organization_id, role').eq('id', user.id).single()
  if (!userRow?.organization_id) return { error: NextResponse.json({ error: 'Not authorized' }, { status: 403 }) }
  if (userRow.role !== 'admin') {
    const { data: hasPerm } = await supabase.rpc('has_permission', { p_user_id: user.id, p_permission_key: 'fees.manage_structures' })
    if (!hasPerm) return { error: NextResponse.json({ error: 'Not authorized' }, { status: 403 }) }
  }
  return { user, orgId: userRow.organization_id }
}

async function getOwnedStructure(supabase: any, structureId: string, orgId: string) {
  const { data: structure } = await supabase.from('fee_structures').select('id, organization_id').eq('id', structureId).single()
  if (!structure || structure.organization_id !== orgId) return null
  return structure
}

async function structureAlreadyIssued(supabase: any, structureId: string) {
  const { count } = await supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('fee_structure_id', structureId)
  return !!count && count > 0
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: structureId } = await params
  const supabase = await createClient()
  const { user, orgId, error } = await requireFeesPermission(supabase)
  if (error) return error

  const structure = await getOwnedStructure(supabase, structureId, orgId!)
  if (!structure) return NextResponse.json({ error: 'Fee structure not found' }, { status: 404 })

  if (await structureAlreadyIssued(supabase, structureId)) {
    return NextResponse.json(
      { error: 'This fee structure has already been issued and can no longer be edited. Create a new structure instead.' },
      { status: 409 }
    )
  }

  const body = await request.json()
  const { categoryId, description, amount, dueDate, isMandatory } = body

  if (!categoryId || !description || amount == null) {
    return NextResponse.json({ error: 'Category, description, and amount are required' }, { status: 400 })
  }
  if (Number(amount) < 0) {
    return NextResponse.json({ error: 'Amount cannot be negative' }, { status: 400 })
  }

  const { data: category } = await supabase.from('finance_categories').select('id, organization_id').eq('id', categoryId).single()
  if (!category || (category.organization_id !== null && category.organization_id !== orgId)) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  const { data: item, error: insertError } = await supabase
    .from('fee_structure_items')
    .insert({
      fee_structure_id: structureId,
      category_id: categoryId,
      description,
      amount: Number(amount),
      due_date: dueDate || null,
      is_mandatory: isMandatory ?? true,
    })
    .select('id')
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  await supabase.rpc('log_finance_action', {
    p_org_id: orgId,
    p_actor_id: user!.id,
    p_is_system_generated: false,
    p_system_job_name: null,
    p_action: 'fee_structure_item_added',
    p_target_type: 'fee_structure_items',
    p_target_id: item.id,
    p_before_value: null,
    p_after_value: { structureId, description, amount },
    p_reason: null,
    p_ip_address: ip,
  })

  return NextResponse.json({ success: true, itemId: item.id })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: structureId } = await params
  const supabase = await createClient()
  const { user, orgId, error } = await requireFeesPermission(supabase)
  if (error) return error

  const structure = await getOwnedStructure(supabase, structureId, orgId!)
  if (!structure) return NextResponse.json({ error: 'Fee structure not found' }, { status: 404 })

  if (await structureAlreadyIssued(supabase, structureId)) {
    return NextResponse.json({ error: 'This fee structure has already been issued and can no longer be edited.' }, { status: 409 })
  }

  const { searchParams } = new URL(request.url)
  const itemId = searchParams.get('itemId')
  if (!itemId) return NextResponse.json({ error: 'itemId is required' }, { status: 400 })

  const { data: item } = await supabase
    .from('fee_structure_items')
    .select('id, fee_structure_id, description, amount')
    .eq('id', itemId)
    .single()

  if (!item || item.fee_structure_id !== structureId) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  const { error: deleteError } = await supabase.from('fee_structure_items').delete().eq('id', itemId)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null

  await supabase.rpc('log_finance_action', {
    p_org_id: orgId,
    p_actor_id: user!.id,
    p_is_system_generated: false,
    p_system_job_name: null,
    p_action: 'fee_structure_item_removed',
    p_target_type: 'fee_structure_items',
    p_target_id: itemId,
    p_before_value: { description: item.description, amount: item.amount },
    p_after_value: null,
    p_reason: null,
    p_ip_address: ip,
  })

  return NextResponse.json({ success: true })
}