import { supabase } from '../client'

export interface FeeAccount {
  termName: string | null
  balance: { totalCharged: number; totalAdjusted: number; totalPaid: number; outstanding: number }
  payments: { id: string; amount: number; method: string; paidDate: string; status: string }[]
}

export async function loadChildFees(learnerId: string): Promise<{ accounts: FeeAccount[]; featureDisabled: boolean }> {
  const { data: learner, error: learnerError } = await supabase
    .from('learners').select('organization_id').eq('id', learnerId).single()
  if (learnerError || !learner) throw new Error('Student not found.')

  const { data: hasFeature } = await supabase.rpc('org_has_feature', { p_org_id: learner.organization_id, p_feature_key: 'fees' })
  if (!hasFeature) return { accounts: [], featureDisabled: true }

  const { data: accounts, error } = await supabase
    .from('student_fee_accounts').select('id, term_id').eq('learner_id', learnerId).order('created_at', { ascending: false })
  if (error) throw new Error('Could not load fee accounts.')
  if (!accounts || accounts.length === 0) return { accounts: [], featureDisabled: false }

  const termIds = [...new Set(accounts.map((a) => a.term_id))]
  const { data: terms } = await supabase.from('terms').select('id, name').in('id', termIds)
  const termMap = new Map((terms ?? []).map((t) => [t.id, t.name]))

  const enriched = await Promise.all(accounts.map(async (acc) => {
    const { count: invoiceCount } = await supabase
      .from('invoices').select('id', { count: 'exact', head: true })
      .eq('student_fee_account_id', acc.id).eq('status', 'issued')

    if (invoiceCount && invoiceCount > 0) {
      const [{ data: lineItems }, { data: payments }, { data: adjustments }] = await Promise.all([
        supabase.from('invoice_line_items').select('amount, invoices!inner(student_fee_account_id, status)')
          .eq('invoices.student_fee_account_id', acc.id).eq('invoices.status', 'issued'),
        supabase.from('payments').select('id, amount, method, paid_date, status')
          .eq('student_fee_account_id', acc.id).eq('voided', false).order('paid_date', { ascending: false }),
        supabase.from('fee_adjustments_v2').select('amount')
          .eq('student_fee_account_id', acc.id).in('status', ['approved', 'auto_approved']),
      ])

      const totalCharged = (lineItems ?? []).reduce((sum: number, i: any) => sum + Number(i.amount), 0)
      const { data: allocations } = await supabase
        .from('payment_allocations').select('amount_allocated, payments!inner(student_fee_account_id, voided)')
        .eq('payments.student_fee_account_id', acc.id).eq('payments.voided', false)
      const totalPaid = (allocations ?? []).reduce((sum: number, a: any) => sum + Number(a.amount_allocated), 0)
      const totalAdjusted = (adjustments ?? []).reduce((sum: number, a: any) => sum - Number(a.amount), 0)

      return {
        termName: termMap.get(acc.term_id) ?? null,
        balance: { totalCharged, totalAdjusted, totalPaid, outstanding: totalCharged - totalPaid - totalAdjusted },
        payments: (payments ?? []).map((p: any) => ({ id: p.id, amount: p.amount, method: p.method, paidDate: p.paid_date, status: p.status })),
      }
    }

    const [{ data: balance }, { data: payments }] = await Promise.all([
      supabase.rpc('calculate_fee_balance', { p_account_id: acc.id }),
      supabase.from('fee_payments').select('id, amount, method, paid_date, status')
        .eq('account_id', acc.id).eq('voided', false).order('paid_date', { ascending: false }),
    ])
    return {
      termName: termMap.get(acc.term_id) ?? null,
      balance: balance ?? { totalCharged: 0, totalAdjusted: 0, totalPaid: 0, outstanding: 0 },
      payments: (payments ?? []).map((p: any) => ({ id: p.id, amount: p.amount, method: p.method, paidDate: p.paid_date, status: p.status })),
    }
  }))

  return { accounts: enriched, featureDisabled: false }
}