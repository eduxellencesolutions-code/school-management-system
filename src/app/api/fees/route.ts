import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/fees — create or update a fee record
// Body: { learnerId, termId, totalExpected, totalPaid, dueDate }
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // ✅ FIX: Check permission
  const { data: userRow } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  const { data: hasPerm } = await supabase.rpc('has_permission', { 
    p_user_id: user.id, 
    p_permission_key: 'fees.manage' 
  });
  if (userRow?.role !== 'admin' && !hasPerm) {
    return NextResponse.json({ error: 'You do not have permission to manage fees' }, { status: 403 });
  }

  const body = await request.json();
  const { learnerId, termId, totalExpected, totalPaid, dueDate } = body;

  if (!learnerId || !termId || totalExpected === undefined || totalPaid === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data: learner, error: learnerError } = await supabase
    .from('learners')
    .select('organization_id')
    .eq('id', learnerId)
    .single();

  if (learnerError || !learner) {
    return NextResponse.json({ error: 'Learner not found' }, { status: 404 });
  }

  const isSolo = learner.organization_id === null;

  if (!isSolo) {
    const { data: hasFeature, error: featureError } = await supabase
      .rpc('org_has_feature', {
        p_org_id: learner.organization_id,
        p_feature_key: 'fees',
      });

    if (featureError) {
      return NextResponse.json({ error: 'Could not verify plan entitlement' }, { status: 500 });
    }

    if (!hasFeature) {
      return NextResponse.json(
        { error: 'Fee tracking is not available on your current plan' },
        { status: 403 }
      );
    }
  }

  const { error: upsertError } = await supabase
    .from('fee_records')
    .upsert(
      {
        learner_id: learnerId,
        term_id: termId,
        total_expected: totalExpected,
        total_paid: totalPaid,
        due_date: dueDate ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'learner_id,term_id' }
    );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// GET /api/fees?learnerId=...&termId=...
export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const learnerId = searchParams.get('learnerId');
  const termId = searchParams.get('termId');

  if (!learnerId || !termId) {
    return NextResponse.json({ error: 'Missing learnerId or termId' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('fee_records')
    .select('total_expected, total_paid, due_date, updated_at')
    .eq('learner_id', learnerId)
    .eq('term_id', termId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ fee: data });
}