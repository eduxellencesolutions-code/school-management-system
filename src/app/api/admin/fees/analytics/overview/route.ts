import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RevenueSnapshot {
  expected: number
  collected: number
  outstanding: number
  collectionRate: number
}

interface TermStats {
  snapshot: RevenueSnapshot
  totalStudents: number
  payingStudents: number
  fullyPaidStudents: number
  studentsWithOutstanding: number
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

// Accepts one or more term ids so it can compute either a single term's
// stats or a whole session's stats (aggregated across all its terms).
async function snapshotForTerms(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  termIds: string[]
): Promise<TermStats> {
  if (termIds.length === 0) {
    return {
      snapshot: { expected: 0, collected: 0, outstanding: 0, collectionRate: 0 },
      totalStudents: 0,
      payingStudents: 0,
      fullyPaidStudents: 0,
      studentsWithOutstanding: 0,
    }
  }

  const { data: accounts } = await supabase
    .from('student_fee_accounts')
    .select('id, learner_id')
    .eq('organization_id', orgId)
    .in('term_id', termIds)

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

  const totalStudents = new Set((accounts ?? []).map(a => a.learner_id)).size

  return { snapshot, totalStudents, payingStudents, fullyPaidStudents, studentsWithOutstanding }
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

  const requestedTermId = request.nextUrl.searchParams.get('termId')

  const { data: currentOrg } = await supabase
    .from('organizations')
    .select('current_term_id')
    .eq('id', orgId)
    .single()

  const activeTermId = requestedTermId ?? currentOrg?.current_term_id
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

  const { data: currentSession } = await supabase
    .from('academic_sessions')
    .select('id, name, start_date')
    .eq('id', currentTerm.session_id)
    .single()

  const { data: previousTerm } = await supabase
    .from('terms')
    .select('id, name, session_id')
    .eq('organization_id', orgId)
    .lt('start_date', currentTerm.start_date)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: previousSession } = currentSession
    ? await supabase
        .from('academic_sessions')
        .select('id, name, start_date')
        .eq('organization_id', orgId)
        .lt('start_date', currentSession.start_date)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null }

  const { data: sameTermPreviousSession } = previousSession
    ? await supabase
        .from('terms')
        .select('id, name')
        .eq('organization_id', orgId)
        .eq('session_id', previousSession.id)
        .eq('name', currentTerm.name)
        .maybeSingle()
    : { data: null }

  const { data: currentSessionTerms } = currentSession
    ? await supabase.from('terms').select('id').eq('organization_id', orgId).eq('session_id', currentSession.id)
    : { data: [] }

  const { data: previousSessionTerms } = previousSession
    ? await supabase.from('terms').select('id').eq('organization_id', orgId).eq('session_id', previousSession.id)
    : { data: [] }

  const [
    currentTermStats,
    previousTermStats,
    currentSessionStats,
    previousSessionStats,
    sameTermPreviousSessionStats,
  ] = await Promise.all([
    snapshotForTerms(supabase, orgId, [currentTerm.id]),
    previousTerm ? snapshotForTerms(supabase, orgId, [previousTerm.id]) : Promise.resolve(null),
    snapshotForTerms(supabase, orgId, (currentSessionTerms ?? []).map(t => t.id)),
    previousSession ? snapshotForTerms(supabase, orgId, (previousSessionTerms ?? []).map(t => t.id)) : Promise.resolve(null),
    sameTermPreviousSession ? snapshotForTerms(supabase, orgId, [sameTermPreviousSession.id]) : Promise.resolve(null),
  ])

  return NextResponse.json({
    term: { id: currentTerm.id, name: currentTerm.name },
    session: currentSession ? { id: currentSession.id, name: currentSession.name } : null,

    termOverTerm: {
      current: currentTermStats,
      previous: previousTerm ? { term: { id: previousTerm.id, name: previousTerm.name }, stats: previousTermStats } : null,
    },

    sessionOverSession: {
      current: currentSessionStats,
      previous: previousSession ? { session: { id: previousSession.id, name: previousSession.name }, stats: previousSessionStats } : null,
    },

    sameTermAcrossSessions: sameTermPreviousSession
      ? { term: { id: sameTermPreviousSession.id, name: sameTermPreviousSession.name }, stats: sameTermPreviousSessionStats }
      : null,
  })
}