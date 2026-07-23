import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface ComponentScore {
  name: string;
  score: number;
  max_score: number;
}

interface SubjectDetail {
  subject_id: string;
  subject_name: string;
  grade: string;
  remark: string;
  total: number;
  max_score: number;
  percentage: number;
  component_scores: ComponentScore[];
}

interface ReportLearnerEntry {
  learner_id: string;
  first_name: string;
  last_name: string;
  average: number;
  overall_total: number;
  percentage: number;
  position: number;
  grade: string;
  remark: string;
  subject_details: SubjectDetail[];
}

interface StudentRemarkEntry {
  teacher_remark?: string;
  principal_remark?: string;
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
    .select('id, first_name, last_name, admission_number, gender, group_id, organization_id')
    .eq('id', learnerId)
    .single();

  if (learnerError || !learner) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  const { data: currentGroup } = learner.group_id
    ? await supabase.from('groups').select('name').eq('id', learner.group_id).single()
    : { data: null };

  const { data: candidateReports, error: reportError } = await supabase
    .from('reports')
    .select('id, group_id, term_id, session_id, report_data, student_remarks, published_at')
    .eq('type', 'broadsheet')
    .eq('report_status', 'published')
    .eq('deleted', false)
    .eq('organization_id', learner.organization_id)
    .order('published_at', { ascending: false });

  if (reportError) {
    return NextResponse.json({ error: reportError.message }, { status: 500 });
  }

  const report = (candidateReports ?? []).find((r) => {
    const data = r.report_data as { learners?: Array<{ learner_id: string }> };
    return (data?.learners ?? []).some((l) => l.learner_id === learnerId);
  });

  if (!report) {
    return NextResponse.json({
      learner: { name: `${learner.first_name} ${learner.last_name}`, className: currentGroup?.name ?? null },
      report: null,
      message: 'No published result is available for this student yet.',
    });
  }

  const reportData = report.report_data as { learners: ReportLearnerEntry[] };
  const entry = (reportData.learners ?? []).find((rl) => rl.learner_id === learnerId);

  if (!entry) {
    return NextResponse.json({
      learner: { name: `${learner.first_name} ${learner.last_name}`, className: currentGroup?.name ?? null },
      report: null,
      message: 'This student was not found in the published result.',
    });
  }

  const { data: reportGroup } = await supabase
    .from('groups')
    .select('name, instructor_id')
    .eq('id', report.group_id)
    .single();

  const { data: teacher } = reportGroup?.instructor_id
    ? await supabase.from('users').select('name').eq('id', reportGroup.instructor_id).single()
    : { data: null };

  // ✅ FIX: Fetch term name and session separately
  const { data: term } = await supabase
    .from('terms')
    .select('name, session_id')
    .eq('id', report.term_id)
    .single();

  const { data: session } = term?.session_id
    ? await supabase.from('academic_sessions').select('name').eq('id', term.session_id).single()
    : { data: null };

  const { data: org } = await supabase
    .from('organizations')
    .select('name, motto, address, logo_url, principal_name, principal_title, principal_signature_url, teacher_signature_url')
    .eq('id', learner.organization_id)
    .single();

  const remarksMap = (report.student_remarks ?? {}) as Record<string, StudentRemarkEntry>;
  const studentRemarks = remarksMap[learnerId] ?? null;

  const classSize = (reportData.learners ?? []).length;
  const classAverageTotal =
    classSize > 0
      ? (reportData.learners ?? []).reduce((sum, l) => sum + (l.overall_total ?? 0), 0) / classSize
      : null;

  return NextResponse.json({
    school: {
      name: org?.name ?? null,
      motto: org?.motto ?? null,
      address: org?.address ?? null,
      logoUrl: org?.logo_url ?? null,
    },
    learner: {
      name: `${learner.first_name} ${learner.last_name}`,
      admissionNumber: learner.admission_number,
      gender: learner.gender,
      className: reportGroup?.name ?? currentGroup?.name ?? null,
    },
    // ✅ FIX: Updated term object with sessionName from separate query
    term: {
      name: term?.name ?? null,
      sessionName: session?.name ?? null,
    },
    report: {
      average: entry.average,
      grandTotal: entry.overall_total,
      position: entry.position,
      classSize,
      classAverageTotal,
      grade: entry.grade,
      remark: entry.remark,
      publishedAt: report.published_at,
      subjects: entry.subject_details,
    },
    remarks: {
      teacher: studentRemarks?.teacher_remark ?? null,
      principal: studentRemarks?.principal_remark ?? null,
    },
    signatories: {
      teacherName: teacher?.name ?? null,
      teacherSignatureUrl: org?.teacher_signature_url ?? null,
      principalName: org?.principal_name ?? null,
      principalTitle: org?.principal_title ?? 'Head Teacher',
      principalSignatureUrl: org?.principal_signature_url ?? null,
    },
    reportId: report.id,
  });
}