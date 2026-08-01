import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RevenueSnapshot {
  expected: number
  collected: number
  outstanding: number
  collectionRate: number
}

function computeSnapshot(
  charges: { amount: number }[],
  adjustments: { amount: number }[],
  payments: { amount: number }[]
): RevenueSnapshot {
  const totalCharged = charges.reduce((s, c) => s + Number(c.amount), 0)
  const totalAdjusted = adjustments.reduce((s, a) => s + Number(a.amount), 0)
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0)
  const expected = totalCharged - totalAdjusted
  const outstanding = expected - totalPaid
  return {
    expected,
    collected: totalPaid,
    outstanding,
    collectionRate: expected > 0 ? Math.round((totalPaid / expected) * 1000) / 10 : 0,
  }
}

async function snapshotForTerm(supabase: Awaited<ReturnType<typeof createClient>>, orgId: string, termId: string) {
  const { data: accounts } = await supabase
    .from('student_fee_accounts')
    .select('id, learner_id')
    .eq('organization_id', orgId)
    .eq('term_id', termId)

  const accountIds = (accounts ?? []).map(a => a.id)
  if (accountIds.length === 0) {
    return {
      snapshot: { expected: 0, collected: 0, outstanding: 0, collectionRate: 0 },
      totalStudents: 0,
      payingStudents: 0,
      fullyPaidStudents: 0,
      studentsWithOutstanding: 0,
    }
  }

  const [{ data: charges }, { data: adjustments }, { data: payments }] = await Promise.all([
    supabase.from('fee_charges').select('account_id, amount').in('account_id', accountIds),
    supabase.from('fee_adjustments').select('account_id, amount').in('account_id', accountIds).eq('voided', false),
    supabase.from('fee_payments').select('account_id, amount').in('account_id', accountIds).eq('status', 'confirmed').eq('voided', false),
  ])

  const snapshot = computeSnapshot(charges ?? [], adjustments ?? [], payments ?? [])

  // Per-account balance, to derive paying / fully-paid / outstanding student counts
  const chargedByAccount = new Map<string, number>()
  const adjustedByAccount = new Map<string, number>()
  const paidByAccount = new Map<string, number>()
  ;(charges ?? []).forEach(c => chargedByAccount.set(c.account_id, (chargedByAccount.get(c.account_id) ?? 0) + Number(c.amount)))
  ;(adjustments ?? []).forEach(a => adjustedByAccount.set(a.account_id, (adjustedByAccount.get(a.account_id) ?? 0) + Number(a.amount)))
  ;(payments ?? []).forEach(p => paidByAccount.set(p.account_id, (paidByAccount.get(p.account_id) ?? 0) + Number(p.amount)))

  let payingStudents = 0
  let fullyPaidStudents = 0
  let studentsWithOutstanding = 0

  for (const acc of accounts ?? []) {
    const charged = chargedByAccount.get(acc.id) ?? 0
    const adjusted = adjustedByAccount.get(acc.id) ?? 0
    const paid = paidByAccount.get(acc.id) ?? 0
    const expected = charged - adjusted
    const outstanding = expected - paid

    if (paid > 0) payingStudents++
    if (expected > 0 && outstanding <= 0) fullyPaidStudents++
    if (outstanding > 0) studentsWithOutstanding++
  }

  return {
    snapshot,
    totalStudents: (accounts ?? []).length,
    payingStudents,
    fullyPaidStudents,
    studentsWithOutstanding,
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: userRow } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userRow?.organization_id || userRow.role !== 'admin') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const orgId = userRow.organization_id

  const { data: hasFees } = await supabase.rpc('org_has_feature', { p_org_id: orgId, p_feature_key: 'fees' })
  if (!hasFees) {
    return NextResponse.json({ error: 'Fee management is not available on your current plan' }, { status: 403 })
  }

  const { data: hasAdvanced } = await supabase.rpc('org_has_feature', { p_org_id: orgId, p_feature_key: 'advanced_finance_analytics' })
  if (!hasAdvanced) {
    return NextResponse.json({ error: 'Advanced Finance Analytics is a Premium feature' }, { status: 403 })
  }

  const termId = request.nextUrl.searchParams.get('termId')

  const { data: currentOrg } = await supabase
    .from('organizations')
    .select('current_term_id')
    .eq('id', orgId)
    .single()

  const activeTermId = termId ?? currentOrg?.current_term_id
  if (!activeTermId) {
    return NextResponse.json({ error: 'No current term is set for this organization' }, { status: 400 })
  }

  const { data: currentTerm } = await supabase
    .from('terms')
    .select('id, name, session_id, start_date')
    .eq('id', activeTermId)
    .single()

  if (!currentTerm) {
    return NextResponse.json({ error: 'Term not found' }, { status: 404 })
  }

  // Find the previous term (by start_date) for term-over-term comparison —
  // could be in the same session or the prior one.
  const { data: previousTerm } = await supabase
    .from('terms')
    .select('id, name')
    .eq('organization_id', orgId)
    .lt('start_date', currentTerm.start_date)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const current = await snapshotForTerm(supabase, orgId, currentTerm.id)
  const previous = previousTerm ? await snapshotForTerm(supabase, orgId, previousTerm.id) : null

  return NextResponse.json({
    term: { id: currentTerm.id, name: currentTerm.name },
    previousTerm: previousTerm ? { id: previousTerm.id, name: previousTerm.name } : null,
    current,
    previous,
  })
}