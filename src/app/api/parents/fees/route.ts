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