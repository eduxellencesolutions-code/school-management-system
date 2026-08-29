import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function GET(request: Request) {
  const supabase = await createClient();

  const { user } = await getAuthenticatedUser(supabase);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  // ✅ FIX: Replace admin role check with permission check
  const { data: hasPerm } = await supabase.rpc('has_permission', { 
    p_user_id: user.id, 
    p_permission_key: 'fees.view' 
  });

  if (!userRow?.organization_id || (userRow.role !== 'admin' && !hasPerm)) {
    return NextResponse.json({ error: 'You do not have permission to view fee accounts' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const learnerId = searchParams.get('learnerId');
  const termId = searchParams.get('termId');

  if (!learnerId || !termId) {
    return NextResponse.json({ error: 'Missing learnerId or termId' }, { status: 400 });
  }

  const { data: learner } = await supabase
    .from('learners')
    .select('organization_id')
    .eq('id', learnerId)
    .single();

  if (!learner || learner.organization_id !== userRow.organization_id) {
    return NextResponse.json({ error: 'Student not found in your organization' }, { status: 404 });
  }

  // Get or create the account
  let { data: account } = await supabase
    .from('student_fee_accounts')
    .select('id')
    .eq('learner_id', learnerId)
    .eq('term_id', termId)
    .maybeSingle();

  if (!account) {
    const { data: newAccount, error: createError } = await supabase
      .from('student_fee_accounts')
      .insert({ organization_id: userRow.organization_id, learner_id: learnerId, term_id: termId })
      .select('id')
      .single();

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }
    account = newAccount;
  }

  const [{ data: charges }, { data: adjustments }, { data: payments }, { data: balance }] = await Promise.all([
    supabase.from('fee_charges').select('id, description, amount, created_at').eq('account_id', account.id).order('created_at'),
    supabase.from('fee_adjustments').select('id, description, amount, reason, voided, created_at').eq('account_id', account.id).order('created_at'),
    supabase.from('fee_payments').select('id, amount, method, reference, status, paid_date, voided, created_at').eq('account_id', account.id).order('paid_date', { ascending: false }),
    supabase.rpc('calculate_fee_balance', { p_account_id: account.id }),
  ]);

  return NextResponse.json({
    accountId: account.id,
    charges: charges ?? [],
    adjustments: adjustments ?? [],
    payments: payments ?? [],
    balance: balance ?? { totalCharged: 0, totalAdjusted: 0, totalPaid: 0, outstanding: 0 },
  });
}