// src/app/api/admin/finance/fee-structures/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

async function requireFeesPermission(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  const { data: userRow } = await supabase.from('users').select('organization_id, role').eq('id', user.id).single()
  if (!userRow?.organization_id) return { error: NextResponse.json({ error: 'Not authorized' }, { status: 403 }) }
  if (userRow.role !== 'admin') {
    const { data: hasPerm } = await supabase.rpc('has_permission', { p_user_id: user.id, p_permission_key: 'fees.manage_structures' })
    if (!hasPerm) return { error: NextResponse.json({ error: 'Not authorized' }, { status: 403 }) }
  }
  return { user, orgId: userRow.organization_id }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { orgId, error } = await requireFeesPermission(supabase)
  if (error) return error

  const { data: structures, error: fetchError } = await supabase
    .from('fee_structures')
    .select(`
      id, name, group_id, term_id, session_id, created_at,
      groups(name),
      terms(name),
      academic_sessions(name),
      fee_structure_items(id, description, amount, due_date, is_mandatory, category_id, finance_categories(name))
    `)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })

  const structureIds = (structures ?? []).map((s: any) => s.id)
  const { data: invoicedRows } = structureIds.length
    ? await supabase.from('invoices').select('fee_structure_id').in('fee_structure_id', structureIds)
    : { data: [] as any[] }

  const issuedSet = new Set((invoicedRows ?? []).map((r: any) => r.fee_structure_id))

  const result = (structures ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    groupId: s.group_id,
    groupName: s.groups?.name ?? 'All Classes',
    termId: s.term_id,
    termName: s.terms?.name ?? null,
    sessionName: s.academic_sessions?.name ?? null,
    createdAt: s.created_at,
    items: (s.fee_structure_items ?? []).map((i: any) => ({
      id: i.id,
      description: i.description,
      amount: i.amount,
      dueDate: i.due_date,
      isMandatory: i.is_mandatory,
      categoryId: i.category_id,
      categoryName: i.finance_categories?.name ?? 'Uncategorized',
    })),
    totalAmount: (s.fee_structure_items ?? []).reduce((sum: number, i: any) => sum + Number(i.amount), 0),
    hasBeenIssued: issuedSet.has(s.id),
  }))

  return NextResponse.json({ structures: result })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { user, orgId, error } = await requireFeesPermission(supabase)
  if (error) return error

  const body = await request.json()
  const { name, termId, groupId } = body

  if (!name || !termId) {
    return NextResponse.json({ error: 'Name and term are required' }, { status: 400 })
  }

  const { data: term } = await supabase.from('terms').select('id, session_id, organization_id').eq('id', termId).single()
  if (!term || term.organization_id !== orgId) {
    return NextResponse.json({ error: 'Term not found' }, { status: 404 })
  }

  if (groupId) {
    const { data: group } = await supabase.from('groups').select('id, organization_id').eq('id', groupId).single()
    if (!group || group.organization_id !== orgId) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }
  }

  const { data: structure, error: insertError } = await supabase
    .from('fee_structures')
    .insert({
      organization_id: orgId,
      group_id: groupId || null,
      session_id: term.session_id,
      term_id: termId,
      name,
      created_by: user!.id,
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
    p_action: 'fee_structure_created',
    p_target_type: 'fee_structures',
    p_target_id: structure.id,
    p_before_value: null,
    p_after_value: { name, termId, groupId },
    p_reason: null,
    p_ip_address: ip,
  })

  return NextResponse.json({ success: true, structureId: structure.id })
}