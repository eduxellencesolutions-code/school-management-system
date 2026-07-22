import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const GLOBAL_FAIL_THRESHOLD = 40;

interface SubjectDetail {
  subject_id: string;
  subject_name: string;
  percentage: number;
}

interface ReportLearner {
  learner_id: string;
  average: number;
  subject_details: SubjectDetail[];
}

export async function GET(request: Request) {
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
    return NextResponse.json({ error: 'Only admins can preview promotion' }, { status: 403 });
  }

  const { data: hasFeature, error: featureError } = await supabase
    .rpc('org_has_feature', { p_org_id: userRow.organization_id, p_feature_key: 'promotion_wizard' });

  if (featureError) {
    return NextResponse.json({ error: 'Could not verify plan entitlement' }, { status: 500 });
  }
  if (!hasFeature) {
    return NextResponse.json({ error: 'Promotion wizard is not available on your current plan' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const fromGroupId = searchParams.get('fromGroupId');
  const sessionId = searchParams.get('sessionId');
  const termId = searchParams.get('termId');

  if (!fromGroupId || !sessionId || !termId) {
    return NextResponse.json({ error: 'Missing fromGroupId, sessionId, or termId' }, { status: 400 });
  }

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id, name, organization_id, type')
    .eq('id', fromGroupId)
    .single();

  if (groupError || !group) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  }
  if (group.organization_id !== userRow.organization_id) {
    return NextResponse.json({ error: 'Class does not belong to your organization' }, { status: 403 });
  }
  if (group.type !== 'class') {
    return NextResponse.json({ error: 'Only class-type groups can be promoted' }, { status: 400 });
  }

  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('id, report_data, report_status, locked')
    .eq('group_id', fromGroupId)
    .eq('session_id', sessionId)
    .eq('term_id', termId)
    .eq('type', 'broadsheet')
    .eq('locked', true)
    .eq('deleted', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (reportError) {
    return NextResponse.json({ error: reportError.message }, { status: 500 });
  }
  if (!report) {
    return NextResponse.json(
      { error: 'Results for this class and term must be locked before promotion can be previewed. Use "Lock Results" first.' },
      { status: 404 }
    );
  }

  const reportData = report.report_data as { learners: ReportLearner[] };
  const reportLearners = reportData?.learners ?? [];

  if (reportLearners.length === 0) {
    return NextResponse.json({ group, recommendations: [] });
  }

  const learnerIds = reportLearners.map((l) => l.learner_id);

  const { data: activeLearners, error: learnersError } = await supabase
    .from('learners')
    .select('id, first_name, last_name, admission_number')
    .in('id', learnerIds)
    .eq('group_id', fromGroupId)
    .eq('is_active', true);

  if (learnersError) {
    return NextResponse.json({ error: learnersError.message }, { status: 500 });
  }

  const activeLearnerMap = new Map((activeLearners ?? []).map((l) => [l.id, l]));

  const { data: attendance } = await supabase
    .from('attendance_summary')
    .select('learner_id, rate')
    .in('learner_id', learnerIds)
    .eq('term_id', termId);

  const attendanceMap = new Map((attendance ?? []).map((a) => [a.learner_id, a.rate]));

  const { data: rules } = await supabase
    .from('promotion_rules')
    .select('*')
    .eq('organization_id', userRow.organization_id)
    .maybeSingle();

  const minAverage = rules?.min_average ?? 50;
  const maxFailedSubjects = rules?.max_failed_subjects ?? 2;
  const minAttendance = rules?.min_attendance ?? 75;
  const autoPromoteAll = rules?.auto_promote_all ?? false;

  const recommendations = reportLearners
    .filter((rl) => activeLearnerMap.has(rl.learner_id))
    .map((rl) => {
      const learnerInfo = activeLearnerMap.get(rl.learner_id)!;
      const average = rl.average;
      const failedSubjects = (rl.subject_details ?? []).filter(
        (s) => s.percentage < GLOBAL_FAIL_THRESHOLD
      ).length;
      const attendanceRate = attendanceMap.get(rl.learner_id) ?? null;

      let recommended: 'promote' | 'repeat' | 'insufficient_data' = 'insufficient_data';
      let reason = 'Missing attendance data for this term';

      if (autoPromoteAll) {
        recommended = 'promote';
        reason = 'School policy: promote all students';
      } else if (attendanceRate !== null) {
        const meetsAverage = average >= minAverage;
        const meetsFailedSubjects = failedSubjects <= maxFailedSubjects;
        const meetsAttendance = attendanceRate >= minAttendance;

        if (meetsAverage && meetsFailedSubjects && meetsAttendance) {
          recommended = 'promote';
          reason = 'Meets all promotion criteria';
        } else {
          recommended = 'repeat';
          const reasons: string[] = [];
          if (!meetsAverage) reasons.push(`average ${average}% below minimum ${minAverage}%`);
          if (!meetsFailedSubjects) reasons.push(`${failedSubjects} failed subjects exceeds max ${maxFailedSubjects}`);
          if (!meetsAttendance) reasons.push(`attendance ${attendanceRate}% below minimum ${minAttendance}%`);
          reason = reasons.join('; ');
        }
      }

      return {
        learnerId: rl.learner_id,
        name: `${learnerInfo.first_name} ${learnerInfo.last_name}`,
        admissionNumber: learnerInfo.admission_number,
        average,
        failedSubjects,
        attendanceRate,
        recommended,
        reason,
      };
    });

  const summary = {
    total: recommendations.length,
    promote: recommendations.filter((r) => r.recommended === 'promote').length,
    repeat: recommendations.filter((r) => r.recommended === 'repeat').length,
    insufficientData: recommendations.filter((r) => r.recommended === 'insufficient_data').length,
  };

  return NextResponse.json({
    group,
    reportId: report.id,
    rules: { minAverage, maxFailedSubjects, minAttendance, autoPromoteAll },
    summary,
    recommendations,
  });
}
