import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface ReportLearner {
  learner_id: string;
  average: number;
  position: number;
}

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: parentAccount, error: parentError } = await supabase
    .from('parent_accounts')
    .select('id, full_name')
    .eq('auth_user_id', user.id)
    .single();

  if (parentError || !parentAccount) {
    return NextResponse.json({ error: 'No parent account found for this user' }, { status: 404 });
  }

  const { data: links, error: linksError } = await supabase
    .from('parent_learner_links')
    .select('learner_id, relationship')
    .eq('parent_id', parentAccount.id);

  if (linksError) {
    return NextResponse.json({ error: linksError.message }, { status: 500 });
  }

  if (!links || links.length === 0) {
    return NextResponse.json({ parent: parentAccount, children: [] });
  }

  const learnerIds = links.map((l) => l.learner_id);

  const { data: learners, error: learnersError } = await supabase
    .from('learners')
    .select('id, first_name, last_name, admission_number, group_id, organization_id')
    .in('id', learnerIds);

  if (learnersError) {
    return NextResponse.json({ error: learnersError.message }, { status: 500 });
  }

  const groupIds = [...new Set((learners ?? []).map((l) => l.group_id).filter(Boolean))];

  const { data: groups } = await supabase
    .from('groups')
    .select('id, name')
    .in('id', groupIds.length > 0 ? groupIds : ['00000000-0000-0000-0000-000000000000']);

  const groupMap = new Map((groups ?? []).map((g) => [g.id, g.name]));

  const { data: attendance } = await supabase
    .from('attendance_summary')
    .select('learner_id, rate')
    .in('learner_id', learnerIds);

  const attendanceMap = new Map((attendance ?? []).map((a) => [a.learner_id, a.rate]));

  // ✅ FIX: Search every published broadsheet in this org, most recent first,
  // and use whichever one actually contains this learner — not just the report
  // for their CURRENT class. A promoted/repeated student's most recent result
  // often lives in a class they've since left.
  const childrenWithAverages = await Promise.all(
    (learners ?? []).map(async (learner) => {
      let average: number | null = null;

      const { data: candidateReports } = await supabase
        .from('reports')
        .select('report_data')
        .eq('type', 'broadsheet')
        .eq('report_status', 'published')
        .eq('deleted', false)
        .eq('organization_id', learner.organization_id)
        .order('published_at', { ascending: false });

      const report = (candidateReports ?? []).find((r) => {
        const data = r.report_data as { learners?: Array<{ learner_id: string }> };
        return (data?.learners ?? []).some((l) => l.learner_id === learner.id);
      });

      if (report?.report_data) {
        const reportData = report.report_data as { learners: ReportLearner[] };
        const entry = (reportData.learners ?? []).find((rl) => rl.learner_id === learner.id);
        if (entry) average = entry.average;
      }

      return {
        id: learner.id,
        name: `${learner.first_name} ${learner.last_name}`,
        admissionNumber: learner.admission_number,
        className: learner.group_id ? groupMap.get(learner.group_id) ?? null : null,
        average,
        attendanceRate: attendanceMap.get(learner.id) ?? null,
      };
    })
  );

  return NextResponse.json({ parent: parentAccount, children: childrenWithAverages });
}
