import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

// POST /api/attendance
// Body: { groupId, termId, sessionId, date, records: [{ learnerId, status }] }
export async function POST(request: Request) {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json()
  const { groupId, termId, sessionId, date, records } = body
  if (!groupId || !termId || !sessionId || !date || !Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: canMark } = await supabase.rpc('can_mark_attendance', { p_group_id: groupId })
  if (!canMark) return NextResponse.json({ error: 'You do not have permission to mark attendance for this class' }, { status: 403 })

  const { data: userRow } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
  const orgId = userRow?.organization_id ?? null

  const learnerIds = [...new Set(records.map((r: { learnerId: string }) => r.learnerId))]
  const { data: activeLearners, error: lerr } = await supabase
    .from('learners').select('id').in('id', learnerIds).eq('group_id', groupId).eq('is_active', true).eq('status', 'active')
  if (lerr) return NextResponse.json({ error: lerr.message }, { status: 500 })
  const active = new Set((activeLearners ?? []).map(l => l.id))
  const skipped = learnerIds.filter(id => !active.has(id))

  const rows = records
    .filter((r: { learnerId: string; status: string }) => active.has(r.learnerId) && ['present', 'absent', 'late'].includes(r.status))
    .map((r: { learnerId: string; status: string }) => ({
      organization_id: orgId, group_id: groupId, learner_id: r.learnerId,
      term_id: termId, session_id: sessionId, date, status: r.status, recorded_by: user.id,
    }))
  if (rows.length === 0) return NextResponse.json({ error: 'No active students among the submitted records' }, { status: 400 })

  const { error } = await supabase.from('attendance_records').upsert(rows, { onConflict: 'learner_id,date' })
  if (error) return NextResponse.json({ error: error.message }, { status: error.code === '42501' ? 403 : 500 })
  return NextResponse.json({ success: true, count: rows.length, skipped })
}

// GET /api/attendance?groupId=...&date=...
export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get('groupId');
  const date = searchParams.get('date');

  if (!groupId || !date) {
    return NextResponse.json({ error: 'Missing groupId or date' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('attendance_records')
    .select('learner_id, status')
    .eq('group_id', groupId)
    .eq('date', date);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ records: data });
}