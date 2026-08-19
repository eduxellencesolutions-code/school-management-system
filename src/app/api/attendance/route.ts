import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/attendance
// Body: { groupId, termId, sessionId, date, records: [{ learnerId, status }] }
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // ✅ FIX: Check permission instead of hard role check
  const { data: userRow } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  const { data: hasPerm } = await supabase.rpc('has_permission', { 
    p_user_id: user.id, 
    p_permission_key: 'attendance.mark' 
  });
  if (userRow?.role !== 'admin' && !hasPerm) {
    return NextResponse.json({ error: 'You do not have permission to mark attendance' }, { status: 403 });
  }

  const body = await request.json();
  const { groupId, termId, sessionId, date, records } = body;

  if (!groupId || !termId || !sessionId || !date || !Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Resolve the caller's org (null org = solo teacher, always allowed)
  const { data: userRowOrg, error: userError } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (userError) {
    return NextResponse.json({ error: 'Could not resolve user profile' }, { status: 500 });
  }

  const isSolo = userRowOrg.organization_id === null;

  // Explicit app-layer gate check, in addition to RLS — belt and braces.
  if (!isSolo) {
    const { data: hasFeature, error: featureError } = await supabase
      .rpc('org_has_feature', {
        p_org_id: userRowOrg.organization_id,
        p_feature_key: 'basic_attendance',
      });

    if (featureError) {
      return NextResponse.json({ error: 'Could not verify plan entitlement' }, { status: 500 });
    }

    if (!hasFeature) {
      return NextResponse.json(
        { error: 'Attendance is not available on your current plan' },
        { status: 403 }
      );
    }
  }

  // A withdrawn/transferred/graduated/suspended/archived student must
  // not accumulate new attendance records — this is the exact contamination
  // risk called out for attendance specifically. Filter the incoming
  // learner IDs down to currently active ones before writing anything.
  const learnerIds = [...new Set(records.map((r: { learnerId: string }) => r.learnerId))];
  const { data: activeLearners, error: activeLearnersError } = await supabase
    .from('learners')
    .select('id')
    .in('id', learnerIds)
    .eq('is_active', true);
  if (activeLearnersError) {
    return NextResponse.json({ error: activeLearnersError.message }, { status: 500 });
  }
  const activeLearnerIds = new Set((activeLearners ?? []).map((l) => l.id));
  const skippedLearnerIds = learnerIds.filter((id) => !activeLearnerIds.has(id));

  // organization_id is stamped from resolved user context, never trusted from client input
  const rows = records
    .filter((r: { learnerId: string; status: string }) => activeLearnerIds.has(r.learnerId))
    .map((r: { learnerId: string; status: string }) => ({
      organization_id: userRowOrg.organization_id,
      group_id: groupId,
      learner_id: r.learnerId,
      term_id: termId,
      session_id: sessionId,
      date,
      status: r.status,
      recorded_by: user.id,
    }));

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No active students among the submitted records' }, { status: 400 });
  }

  const { error: insertError } = await supabase
    .from('attendance_records')
    .upsert(rows, { onConflict: 'learner_id,date' });
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, count: rows.length, skipped: skippedLearnerIds });
}

// GET /api/attendance?groupId=...&date=...
export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get('groupId');
  const date = searchParams.get('date');

  if (!groupId || !date) {
    return NextResponse.json({ error: 'Missing groupId or date' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('attendance_records')
    .select('learner_id, status')
    .eq('group_id', groupId)
    .eq('date', date);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ records: data });
}