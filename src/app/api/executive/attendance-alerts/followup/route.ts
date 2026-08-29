// src/app/api/executive/attendance-alerts/followup/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user } = await getAuthenticatedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).single();
  if (!profile?.organization_id) return NextResponse.json({ error: 'No organization found' }, { status: 400 });

  const body = await request.json();
  const { learnerId, alertType, notes } = body;
  if (!learnerId || !alertType) return NextResponse.json({ error: 'learnerId and alertType are required' }, { status: 400 });

  const { error } = await supabase.from('attendance_alert_followups').insert({
    organization_id: profile.organization_id,
    learner_id: learnerId,
    alert_type: alertType,
    followed_up_by: user.id,
    notes: notes ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}