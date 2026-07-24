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
    return NextResponse.json({ fees: [], featureDisabled: true });
  }

  const { data: fees, error: feesError } = await supabase
    .from('fee_records')
    .select('term_id, total_expected, total_paid, due_date, updated_at')
    .eq('learner_id', learnerId)
    .order('updated_at', { ascending: false });

  if (feesError) {
    return NextResponse.json({ error: feesError.message }, { status: 500 });
  }

  if (!fees || fees.length === 0) {
    return NextResponse.json({ fees: [] });
  }

  const termIds = [...new Set(fees.map((f) => f.term_id))];
  const { data: terms } = await supabase
    .from('terms')
    .select('id, name')
    .in('id', termIds.length > 0 ? termIds : ['00000000-0000-0000-0000-000000000000']);

  const termMap = new Map((terms ?? []).map((t) => [t.id, t.name]));

  const enriched = fees.map((f) => ({
    termName: termMap.get(f.term_id) ?? null,
    totalExpected: f.total_expected,
    totalPaid: f.total_paid,
    outstanding: f.total_expected - f.total_paid,
    dueDate: f.due_date,
    updatedAt: f.updated_at,
  }));

  return NextResponse.json({ fees: enriched });
}