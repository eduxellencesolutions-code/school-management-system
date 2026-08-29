// src/app/api/attendance/report/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function GET(request: Request) {
  const supabase = await createClient();
  const { user } = await getAuthenticatedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get('groupId');
  const termId = searchParams.get('termId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const learnerId = searchParams.get('learnerId');

  if (!groupId || !termId || !startDate || !endDate) {
    return NextResponse.json({ error: 'groupId, termId, startDate and endDate are required' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('get_attendance_report_data', {
    p_group_id: groupId,
    p_term_id: termId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_learner_id: learnerId || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  return NextResponse.json(data);
}