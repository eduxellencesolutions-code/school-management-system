import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

// POST /api/reports/lock
// Body: { groupId, sessionId, termId, dryRun }
// Admin-only. Validates completeness, then locks the broadsheet for this class/term —
// making it the official, promotion-eligible academic record.
export async function POST(request: Request) {
  const supabase = await createClient();

  const { user } = await getAuthenticatedUser(supabase);
  if (!user) {
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
    return NextResponse.json({ error: 'This feature is not available for solo teacher accounts' }, { status: 403 });
  }

  // ✅ FIX: Check permission instead of hard role check
  const { data: hasPerm } = await supabase.rpc('has_permission', { 
    p_user_id: user.id, 
    p_permission_key: 'results.lock' 
  });
  if (userRow.role !== 'admin' && !hasPerm) {
    return NextResponse.json({ error: 'You do not have permission to lock results' }, { status: 403 });
  }

  const body = await request.json();
  const { groupId, sessionId, termId, dryRun } = body;

  if (!groupId || !sessionId || !termId) {
    return NextResponse.json({ error: 'Missing groupId, sessionId, or termId' }, { status: 400 });
  }

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id, name, organization_id, type')
    .eq('id', groupId)
    .single();

  if (groupError || !group) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  }
  if (group.organization_id !== userRow.organization_id) {
    return NextResponse.json({ error: 'Class does not belong to your organization' }, { status: 403 });
  }
  if (group.type !== 'class') {
    return NextResponse.json({ error: 'Only class-type groups can be locked' }, { status: 400 });
  }

  // ✅ FIX: Explicit filter on report_status = 'published'
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('id, report_data, report_status, locked')
    .eq('group_id', groupId)
    .eq('session_id', sessionId)
    .eq('term_id', termId)
    .eq('type', 'broadsheet')
    .eq('report_status', 'published')
    .eq('deleted', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (reportError) {
    return NextResponse.json({ error: reportError.message }, { status: 500 });
  }
  if (!report) {
    return NextResponse.json({ error: 'No published broadsheet found for this class and term' }, { status: 404 });
  }
  if (report.locked) {
    return NextResponse.json({ error: 'This report is already locked' }, { status: 400 });
  }

  const reportData = report.report_data as { learners: Array<{ learner_id: string }> };
  const reportLearners = reportData?.learners ?? [];
  const learnerIds = reportLearners.map((l) => l.learner_id);

  const problems: string[] = [];

  const { data: activeLearners } = await supabase
    .from('learners')
    .select('id, first_name, last_name')
    .eq('group_id', groupId)
    .eq('is_active', true);

  const activeIds = new Set((activeLearners ?? []).map((l) => l.id));
  const missingFromBroadsheet = (activeLearners ?? []).filter((l) => !learnerIds.includes(l.id));
  if (missingFromBroadsheet.length > 0) {
    problems.push(
      `${missingFromBroadsheet.length} active student(s) in this class are missing from the broadsheet: ${missingFromBroadsheet
        .map((l) => `${l.first_name} ${l.last_name}`)
        .join(', ')}`
    );
  }

  const { data: attendance } = await supabase
    .from('attendance_summary')
    .select('learner_id')
    .in('learner_id', [...activeIds])
    .eq('term_id', termId);

  const attendanceIds = new Set((attendance ?? []).map((a) => a.learner_id));
  const missingAttendance = [...activeIds].filter((id) => !attendanceIds.has(id));
  if (missingAttendance.length > 0) {
    problems.push(`${missingAttendance.length} student(s) have no attendance record for this term`);
  }

  const { data: hasAffectiveFeature } = await supabase.rpc('org_has_feature', {
    p_org_id: userRow.organization_id,
    p_feature_key: 'affective_psychomotor',
  });

  if (hasAffectiveFeature) {
    const { data: ratings } = await supabase
      .from('domain_ratings')
      .select('learner_id, domain_type')
      .in('learner_id', [...activeIds])
      .eq('term_id', termId);

    const learnersWithAffective = new Set(
      (ratings ?? []).filter((r) => r.domain_type === 'affective').map((r) => r.learner_id)
    );
    const learnersWithPsychomotor = new Set(
      (ratings ?? []).filter((r) => r.domain_type === 'psychomotor').map((r) => r.learner_id)
    );

    const missingAffective = [...activeIds].filter((id) => !learnersWithAffective.has(id));
    const missingPsychomotor = [...activeIds].filter((id) => !learnersWithPsychomotor.has(id));

    if (missingAffective.length > 0) {
      problems.push(`${missingAffective.length} student(s) have no affective domain rating for this term`);
    }
    if (missingPsychomotor.length > 0) {
      problems.push(`${missingPsychomotor.length} student(s) have no psychomotor domain rating for this term`);
    }
  }

  // ✅ Updated: Include ready: false in problem response
  if (problems.length > 0) {
    return NextResponse.json(
      { ready: false, error: 'Cannot lock results — required data is incomplete', problems },
      { status: 422 }
    );
  }

  // ✅ Dry-run: admin is just checking readiness, not committing to lock
  if (dryRun) {
    return NextResponse.json({ ready: true, reportId: report.id });
  }

  const { error: lockError } = await supabase
    .from('reports')
    .update({
      locked: true,
      locked_by: user.id,
      locked_at: new Date().toISOString(),
    })
    .eq('id', report.id);

  if (lockError) {
    return NextResponse.json({ error: lockError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, reportId: report.id, lockedAt: new Date().toISOString() });
}