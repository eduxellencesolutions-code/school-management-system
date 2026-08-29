import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

interface SubjectDetail {
  subject_id: string;
  subject_name: string;
  grade: string;
  remark: string;
  total: number;
  percentage: number;
  component_scores: Array<{
    name: string;
    score: number;
    max_score: number;
    percentage: number;
  }>;
}

interface ReportLearnerEntry {
  learner_id: string;
  first_name: string;
  last_name: string;
  average: number;
  percentage: number;
  position: number;
  grade: string;
  remark: string;
  subject_details: SubjectDetail[];
}

// GET /api/parents/report?learnerId=...
// Returns this child's full subject-by-subject report card from the most recent
// published broadsheet for their current class. Parent must be linked to this learner.
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

  // Confirm this parent is actually linked to this learner — never trust the client's learnerId alone
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
    .select('id, first_name, last_name, admission_number, group_id')
    .eq('id', learnerId)
    .single();

  if (learnerError || !learner) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  if (!learner.group_id) {
    return NextResponse.json({ error: 'This student is not currently assigned to a class' }, { status: 404 });
  }

  const { data: group } = await supabase
    .from('groups')
    .select('name')
    .eq('id', learner.group_id)
    .single();

  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('id, report_data, published_at')
    .eq('group_id', learner.group_id)
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
    return NextResponse.json({
      learner: { name: `${learner.first_name} ${learner.last_name}`, className: group?.name ?? null },
      report: null,
      message: 'No published result is available for this term yet.',
    });
  }

  const reportData = report.report_data as { learners: ReportLearnerEntry[] };
  const entry = (reportData.learners ?? []).find((rl) => rl.learner_id === learnerId);

  if (!entry) {
    return NextResponse.json({
      learner: { name: `${learner.first_name} ${learner.last_name}`, className: group?.name ?? null },
      report: null,
      message: 'This student was not found in the published result.',
    });
  }

  return NextResponse.json({
    learner: {
      name: `${learner.first_name} ${learner.last_name}`,
      admissionNumber: learner.admission_number,
      className: group?.name ?? null,
    },
    report: {
      average: entry.average,
      position: entry.position,
      grade: entry.grade,
      remark: entry.remark,
      publishedAt: report.published_at,
      subjects: entry.subject_details,
    },
  });
}
