import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

async function snapshotForTerm(supabase: Awaited<ReturnType<typeof createClient>>, orgId: string, termId: string) {
  const { data: accounts } = await supabase
    .from('student_fee_accounts')
    .select('id')
    .eq('organization_id', orgId)
    .eq('term_id', termId)

  const accountIds = (accounts ?? []).map(a => a.id)
  if (accountIds.length === 0) return { expected: 0, collected: 0, collectionRate: 0 }

  const [{ data: charges }, { data: adjustments }, { data: payments }] = await Promise.all([
    supabase.from('fee_charges').select('amount').in('account_id', accountIds),
    supabase.from('fee_adjustments').select('amount').in('account_id', accountIds).eq('voided', false),
    supabase.from('fee_payments').select('amount').in('account_id', accountIds).eq('status', 'confirmed').eq('voided', false),
  ])

  const totalCharged = (charges ?? []).reduce((s, c) => s + Number(c.amount), 0)
  const totalAdjusted = (adjustments ?? []).reduce((s, a) => s + Number(a.amount), 0)
  const totalPaid = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const expected = totalCharged - totalAdjusted

  return {
    expected,
    collected: totalPaid,
    collectionRate: expected > 0 ? Math.round((totalPaid / expected) * 1000) / 10 : 0,
  }
}

export async function GET() {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
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

  const { data: hasAdvanced } = await supabase.rpc('org_has_feature', { p_org_id: orgId, p_feature_key: 'advanced_finance_analytics' })
  if (!hasAdvanced) {
    return NextResponse.json({ error: 'Advanced Finance Analytics is a Premium feature' }, { status: 403 })
  }

  // ── Termly trend: every term this org has ever had, in chronological order ──
  const { data: terms } = await supabase
    .from('terms')
    .select('id, name, start_date, session_id, academic_sessions(name)')
    .eq('organization_id', orgId)
    .order('start_date', { ascending: true })

  const termlyTrend = await Promise.all(
    (terms ?? []).map(async (t: any) => {
      const stats = await snapshotForTerm(supabase, orgId, t.id)
      return {
        termId: t.id,
        termName: t.name,
        sessionName: t.academic_sessions?.name ?? null,
        startDate: t.start_date,
        ...stats,
      }
    })
  )

  // ── Monthly collected trend: last 12 months, based on actual payment dates.
  // Note: "expected" has no reliable monthly bucket since fee_charges has no
  // due_date — only collected amounts are shown monthly; expected/collection
  // rate stays at the termly level above. ──
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

  const { data: accounts } = await supabase
    .from('student_fee_accounts')
    .select('id')
    .eq('organization_id', orgId)

  const accountIds = (accounts ?? []).map(a => a.id)

  const { data: recentPayments } = accountIds.length > 0
    ? await supabase
        .from('fee_payments')
        .select('amount, paid_date')
        .in('account_id', accountIds)
        .eq('status', 'confirmed')
        .eq('voided', false)
        .gte('paid_date', twelveMonthsAgo.toISOString().slice(0, 10))
    : { data: [] as any[] }

  const monthlyMap = new Map<string, number>()
  ;(recentPayments ?? []).forEach(p => {
    const monthKey = p.paid_date.slice(0, 7) // YYYY-MM
    monthlyMap.set(monthKey, (monthlyMap.get(monthKey) ?? 0) + Number(p.amount))
  })

  const monthlyTrend = Array.from(monthlyMap.entries())
    .map(([month, collected]) => ({ month, collected }))
    .sort((a, b) => a.month.localeCompare(b.month))

  return NextResponse.json({ termlyTrend, monthlyTrend })
}