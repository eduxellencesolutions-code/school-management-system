import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

// POST /api/homework/submissions — mark submission status
// Body: { assignmentId, learnerId, status: 'submitted'|'late'|'not_submitted' }
export async function POST(request: Request) {
  const supabase = await createClient();

  const { user } = await getAuthenticatedUser(supabase);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { assignmentId, learnerId, status } = body;

  if (!assignmentId || !learnerId || !status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!['submitted', 'late', 'not_submitted'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  // Step 1: get the assignment's group_id
  const { data: assignment, error: assignmentError } = await supabase
    .from('homework_assignments')
    .select('group_id')
    .eq('id', assignmentId)
    .single();

  if (assignmentError || !assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  // Step 2: get the group's organization_id separately — avoids nested-join FK ambiguity
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('organization_id')
    .eq('id', assignment.group_id)
    .single();

  if (groupError || !group) {
    return NextResponse.json({ error: 'Group not found for this assignment' }, { status: 404 });
  }

  const isSolo = group.organization_id === null;

  if (!isSolo) {
    const { data: hasFeature, error: featureError } = await supabase
      .rpc('org_has_feature', { p_org_id: group.organization_id, p_feature_key: 'homework' });

    if (featureError) {
      return NextResponse.json({ error: 'Could not verify plan entitlement' }, { status: 500 });
    }

    if (!hasFeature) {
      return NextResponse.json(
        { error: 'Homework tracking is not available on your current plan' },
        { status: 403 }
      );
    }
  }

  const { error: upsertError } = await supabase
    .from('homework_submissions')
    .upsert(
      { assignment_id: assignmentId, learner_id: learnerId, status },
      { onConflict: 'assignment_id,learner_id' }
    );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// GET /api/homework/submissions?assignmentId=...
export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const assignmentId = searchParams.get('assignmentId');

  if (!assignmentId) {
    return NextResponse.json({ error: 'Missing assignmentId' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('homework_submissions')
    .select('learner_id, status')
    .eq('assignment_id', assignmentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ submissions: data });
}
