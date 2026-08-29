import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

// GET /api/parents/homework?learnerId=...
// Returns every homework assignment issued to this child's current class, along with
// this specific child's submission status for each one.
export async function GET(request: Request) {
  const supabase = await createClient();

  const { user } = await getAuthenticatedUser(supabase);
  if (!user) {
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
    .select('id, group_id, organization_id')
    .eq('id', learnerId)
    .single();

  if (learnerError || !learner) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  if (!learner.group_id) {
    return NextResponse.json({ assignments: [] });
  }

  const { data: hasFeature } = await supabase.rpc('org_has_feature', {
    p_org_id: learner.organization_id,
    p_feature_key: 'homework',
  });

  if (!hasFeature) {
    return NextResponse.json({ assignments: [], featureDisabled: true });
  }

  const { data: assignments, error: assignmentsError } = await supabase
    .from('homework_assignments')
    .select('id, subject_id, title, issued_date, due_date')
    .eq('group_id', learner.group_id)
    .order('due_date', { ascending: false });

  if (assignmentsError) {
    return NextResponse.json({ error: assignmentsError.message }, { status: 500 });
  }

  if (!assignments || assignments.length === 0) {
    return NextResponse.json({ assignments: [] });
  }

  const assignmentIds = assignments.map((a) => a.id);
  const subjectIds = [...new Set(assignments.map((a) => a.subject_id))];

  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name')
    .in('id', subjectIds.length > 0 ? subjectIds : ['00000000-0000-0000-0000-000000000000']);

  const subjectMap = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  const { data: submissions } = await supabase
    .from('homework_submissions')
    .select('assignment_id, status')
    .eq('learner_id', learnerId)
    .in('assignment_id', assignmentIds);

  const submissionMap = new Map((submissions ?? []).map((s) => [s.assignment_id, s.status]));

  const enriched = assignments.map((a) => ({
    id: a.id,
    subjectName: subjectMap.get(a.subject_id) ?? null,
    title: a.title,
    issuedDate: a.issued_date,
    dueDate: a.due_date,
    status: submissionMap.get(a.id) ?? 'not_submitted',
  }));

  const summary = {
    total: enriched.length,
    submitted: enriched.filter((e) => e.status === 'submitted').length,
    late: enriched.filter((e) => e.status === 'late').length,
    missed: enriched.filter((e) => e.status === 'not_submitted').length,
  };

  return NextResponse.json({ assignments: enriched, summary });
}