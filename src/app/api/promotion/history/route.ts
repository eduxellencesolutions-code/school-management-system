import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/promotion/history?groupId=...
// Lists recent promotion decisions for a class, including correction status.
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
    return NextResponse.json({ error: 'This feature is not available for solo teacher accounts' }, { status: 403 });
  }

  if (userRow.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can view promotion history' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get('groupId');

  if (!groupId) {
    return NextResponse.json({ error: 'Missing groupId' }, { status: 400 });
  }

  // Confirm class belongs to this org
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('organization_id')
    .eq('id', groupId)
    .single();

  if (groupError || !group || group.organization_id !== userRow.organization_id) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  }

  const { data: history, error: historyError } = await supabase
    .from('student_academic_history')
    .select('id, learner_id, status, average, promoted_to_class_id, corrected_by, corrected_at, correction_note, created_at')
    .eq('class_id', groupId)
    .order('created_at', { ascending: false });

  if (historyError) {
    return NextResponse.json({ error: historyError.message }, { status: 500 });
  }

  const learnerIds = [...new Set((history ?? []).map((h) => h.learner_id))];

  const { data: learners } = await supabase
    .from('learners')
    .select('id, first_name, last_name, admission_number')
    .in('id', learnerIds.length > 0 ? learnerIds : ['00000000-0000-0000-0000-000000000000']);

  const learnerMap = new Map((learners ?? []).map((l) => [l.id, l]));

  const enriched = (history ?? []).map((h) => ({
    ...h,
    learner: learnerMap.get(h.learner_id) ?? null,
  }));

  return NextResponse.json({ history: enriched });
}
