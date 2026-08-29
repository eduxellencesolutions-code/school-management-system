import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

// GET /api/parents/history?learnerId=...
// Returns this child's full academic history — every past session/class/status/average,
// most recent first. Parent must be linked to this learner.
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

  const { data: history, error: historyError } = await supabase
    .from('student_academic_history')
    .select('id, session_id, class_id, status, average, position, promoted_to_class_id, created_at')
    .eq('learner_id', learnerId)
    .order('created_at', { ascending: false });

  if (historyError) {
    return NextResponse.json({ error: historyError.message }, { status: 500 });
  }

  if (!history || history.length === 0) {
    return NextResponse.json({ history: [] });
  }

  // Resolve session names and class names separately — avoids nested-join FK ambiguity
  const sessionIds = [...new Set(history.map((h) => h.session_id).filter(Boolean))];
  const classIds = [...new Set([
    ...history.map((h) => h.class_id).filter(Boolean),
    ...history.map((h) => h.promoted_to_class_id).filter(Boolean),
  ])];

  const { data: sessions } = await supabase
    .from('academic_sessions')
    .select('id, name')
    .in('id', sessionIds.length > 0 ? sessionIds : ['00000000-0000-0000-0000-000000000000']);

  const { data: classGroups } = await supabase
    .from('groups')
    .select('id, name')
    .in('id', classIds.length > 0 ? classIds : ['00000000-0000-0000-0000-000000000000']);

  const sessionMap = new Map((sessions ?? []).map((s) => [s.id, s.name]));
  const classMap = new Map((classGroups ?? []).map((g) => [g.id, g.name]));

  const enriched = history.map((h) => ({
    id: h.id,
    sessionName: sessionMap.get(h.session_id) ?? null,
    className: classMap.get(h.class_id) ?? null,
    status: h.status,
    average: h.average,
    position: h.position,
    promotedToClassName: h.promoted_to_class_id ? classMap.get(h.promoted_to_class_id) ?? null : null,
    date: h.created_at,
  }));

  return NextResponse.json({ history: enriched });
}