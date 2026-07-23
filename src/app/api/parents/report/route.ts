import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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
    .select('id, first_name, last_name, admission_number, group_id, organization_id')
    .eq('id', learnerId)
    .single();

  if (learnerError || !learner) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  // ✅ FIX: Look up group name if learner has a group_id
  const { data: group } = learner.group_id
    ? await supabase.from('groups').select('name').eq('id', learner.group_id).single()
    : { data: null };

  // ✅ FIX: Search every published broadsheet that actually contains this learner,
  // not just the one for their CURRENT class. A promoted/repeated student's most
  // recent report often lives in a class they've since left.
  const { data: candidateReports, error: reportError } = await supabase
    .from('reports')
    .select('id, group_id, report_data, published_at')
    .eq('type', 'broadsheet')
    .eq('report_status', 'published')
    .eq('deleted', false)
    .eq('organization_id', learner.organization_id)
    .order('published_at', { ascending: false });

  if (reportError) {
    return NextResponse.json({ error: reportError.message }, { status: 500 });
  }

  // Find the first report that actually contains this learner
  const report = (candidateReports ?? []).find((r) => {
    const data = r.report_data as { learners?: Array<{ learner_id: string }> };
    return (data?.learners ?? []).some((l) => l.learner_id === learnerId);
  });

  if (!report) {
    return NextResponse.json({
      learner: { name: `${learner.first_name} ${learner.last_name}`, className: group?.name ?? null },
      report: null,
      message: 'No published result is available for this student yet.',
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

  // ✅ FIX: Show the class the report was actually generated for,
  // since that may differ from the student's current class if they've since been promoted.
  const { data: reportGroup } = await supabase
    .from('groups')
    .select('name')
    .eq('id', report.group_id)
    .single();

  return NextResponse.json({
    learner: {
      name: `${learner.first_name} ${learner.last_name}`,
      admissionNumber: learner.admission_number,
      className: reportGroup?.name ?? group?.name ?? null,
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