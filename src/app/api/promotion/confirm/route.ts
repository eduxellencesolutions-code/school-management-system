import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/promotion/confirm
// Body: { fromGroupId, toGroupId, sessionId, termId, reportId, decisions: [{ learnerId, status: 'promoted'|'repeated' }] }
// This is the irreversible-feeling step: moves real students between real classes, in one
// atomic transaction. Only ever called after the admin has reviewed the preview and confirmed.
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  if (userError || !userRow) {
    return NextResponse.json({ error: 'Could not resolve user profile' }, { status: 500 });
  }

  if (userRow.organization_id === null) {
    return NextResponse.json({ error: 'Promotion is not available for solo teacher accounts' }, { status: 403 });
  }

  if (userRow.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can confirm promotion' }, { status: 403 });
  }

  const { data: hasFeature, error: featureError } = await supabase
    .rpc('org_has_feature', { p_org_id: userRow.organization_id, p_feature_key: 'promotion_wizard' });

  if (featureError) {
    return NextResponse.json({ error: 'Could not verify plan entitlement' }, { status: 500 });
  }
  if (!hasFeature) {
    return NextResponse.json({ error: 'Promotion wizard is not available on your current plan' }, { status: 403 });
  }

  const body = await request.json();
  const { fromGroupId, toGroupId, sessionId, reportId, decisions } = body;

  if (!fromGroupId || !toGroupId || !sessionId || !reportId || !Array.isArray(decisions) || decisions.length === 0) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Confirm both groups belong to this org and are real classes
  const { data: groups, error: groupsError } = await supabase
    .from('groups')
    .select('id, organization_id, type')
    .in('id', [fromGroupId, toGroupId]);

  if (groupsError || !groups || groups.length !== 2) {
    return NextResponse.json({ error: 'Source or destination class not found' }, { status: 404 });
  }

  const invalidGroup = groups.find(
    (g) => g.organization_id !== userRow.organization_id || g.type !== 'class'
  );
  if (invalidGroup) {
    return NextResponse.json(
      { error: 'Source and destination must both be class-type groups belonging to your organization' },
      { status: 400 }
    );
  }

  // Fetch the report again to pull each learner's average for the history record
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('id, report_data, locked')
    .eq('id', reportId)
    .single();

  if (reportError || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }
  if (!report.locked) {
    return NextResponse.json({ error: 'Report is not locked. Lock results before confirming promotion.' }, { status: 400 });
  }

  const reportData = report.report_data as { learners: Array<{ learner_id: string; average: number }> };
  const averageMap = new Map((reportData?.learners ?? []).map((l) => [l.learner_id, l.average]));

  const confirmedMoves = decisions.map((d: { learnerId: string; status: 'promoted' | 'repeated' }) => ({
    learner_id: d.learnerId,
    status: d.status,
    average: averageMap.get(d.learnerId) ?? null,
  }));

  const { data: result, error: promotionError } = await supabase.rpc('run_promotion', {
    p_org_id: userRow.organization_id,
    p_session_id: sessionId,
    p_from_group_id: fromGroupId,
    p_to_group_id: toGroupId,
    p_report_id: reportId,
    p_confirmed_moves: confirmedMoves,
  });

  if (promotionError) {
    return NextResponse.json({ error: promotionError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, result });
}
