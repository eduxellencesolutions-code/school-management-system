// src/app/api/parents/fees/route.ts
// Branches PER STUDENT FEE ACCOUNT (not per-org) between the old fee system
// and the new ledger, based on whether that specific account actually has
// any invoices. This correctly handles: orgs never migrated (old path),
// this pilot org (new path, since its accounts have real invoices), and
// future brand-new orgs that never had an old system at all (new path,
// since they'll only ever get invoices, never fee_charges). Org-level
// ledger_migrated_at is NOT used here on purpose -- it would misroute
// future new orgs, which never set that column, back to the empty old
// tables.
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: parentAccount, error: parentError } = await supabase
    .from('parent_accounts')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();
  if (parentError || !parentAccount) {
    return NextResponse.json({ error: 'No parent account found for this user' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const learnerId = searchParams.get('learnerId');
  if (!learnerId) {
    return NextResponse.json({ error: 'Missing learnerId' }, { status: 400 });
  }

  const { data: link, error: linkError } = await supabase
    .from('parent_learner_links')
    .select('learner_id')
    .eq('parent_id', parentAccount.id)
    .eq('learner_id', learnerId)
    .maybeSingle();
  if (linkError || !link) {
    return NextResponse.json({ error: 'This student is not linked to your account' }, { status: 403 });
  }

  const { data: learner, error: learnerError } = await supabase
    .from('learners')
    .select('organization_id')
    .eq('id', learnerId)
    .single();
  if (learnerError || !learner) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  const { data: hasFeature } = await supabase.rpc('org_has_feature', {
    p_org_id: learner.organization_id,
    p_feature_key: 'fees',
  });
  if (!hasFeature) {
    return NextResponse.json({ accounts: [], featureDisabled: true });
  }

  const { data: accounts, error: accountsError } = await supabase
    .from('student_fee_accounts')
    .select('id, term_id')
    .eq('learner_id', learnerId)
    .order('created_at', { ascending: false });
  if (accountsError) {
    return NextResponse.json({ error: accountsError.message }, { status: 500 });
  }
  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ accounts: [] });
  }

  const termIds = [...new Set(accounts.map((a) => a.term_id))];
  const { data: terms } = await supabase
    .from('terms')
    .select('id, name')
    .in('id', termIds);
  const termMap = new Map((terms ?? []).map((t) => [t.id, t.name]));

  const enriched = await Promise.all(
    accounts.map(async (acc) => {
      // Does this specific account have any real invoices? Determines
      // which system to read from -- independent of org-level migration
      // status, so it works correctly for every account regardless of
      // when/whether that org was migrated.
      const { count: invoiceCount } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('student_fee_account_id', acc.id)
        .eq('status', 'issued');

      if (invoiceCount && invoiceCount > 0) {
        // ── NEW LEDGER PATH ──
        const [{ data: lineItems }, { data: payments }, { data: adjustments }] = await Promise.all([
          supabase
            .from('invoice_line_items')
            .select('amount, invoices!inner(student_fee_account_id, status)')
            .eq('invoices.student_fee_account_id', acc.id)
            .eq('invoices.status', 'issued'),
          supabase
            .from('payments')
            .select('id, amount, method, paid_date, status')
            .eq('student_fee_account_id', acc.id)
            .eq('voided', false)
            .order('paid_date', { ascending: false }),
          supabase
            .from('fee_adjustments_v2')
            .select('amount')
            .eq('student_fee_account_id', acc.id)
            .in('status', ['approved', 'auto_approved']),
        ]);

        const totalCharged = (lineItems ?? []).reduce((sum: number, i: any) => sum + Number(i.amount), 0);
        // amount_allocated is what actually counts as "paid against this
        // account" -- an unallocated overpayment sits as credit, not as
        // paid against a specific charge, matching allocate_payment_fifo's
        // own accounting.
        const { data: allocations } = await supabase
          .from('payment_allocations')
          .select('amount_allocated, payments!inner(student_fee_account_id, voided)')
          .eq('payments.student_fee_account_id', acc.id)
          .eq('payments.voided', false);
        const totalPaid = (allocations ?? []).reduce((sum: number, a: any) => sum + Number(a.amount_allocated), 0);

        // Adjustments are stored negative-for-reduction (see migrate_org_to_new_ledger
        // and allocate_payment_fifo); negate back to a positive "amount reduced".
        const totalAdjusted = (adjustments ?? []).reduce((sum: number, a: any) => sum - Number(a.amount), 0);

        const outstanding = totalCharged - totalPaid - totalAdjusted;

        return {
          termName: termMap.get(acc.term_id) ?? null,
          balance: { totalCharged, totalAdjusted, totalPaid, outstanding },
          payments: (payments ?? []).map((p: any) => ({
            id: p.id, amount: p.amount, method: p.method, paid_date: p.paid_date, status: p.status,
          })),
        };
      }

      // ── OLD SYSTEM PATH (unchanged) ──
      const [{ data: balance }, { data: payments }] = await Promise.all([
        supabase.rpc('calculate_fee_balance', { p_account_id: acc.id }),
        supabase
          .from('fee_payments')
          .select('id, amount, method, paid_date, status, voided')
          .eq('account_id', acc.id)
          .eq('voided', false)
          .order('paid_date', { ascending: false }),
      ]);
      return {
        termName: termMap.get(acc.term_id) ?? null,
        balance: balance ?? { totalCharged: 0, totalAdjusted: 0, totalPaid: 0, outstanding: 0 },
        payments: payments ?? [],
      };
    })
  );

  return NextResponse.json({ accounts: enriched });
}