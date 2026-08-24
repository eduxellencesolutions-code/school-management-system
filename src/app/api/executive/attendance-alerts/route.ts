// src/app/api/executive/attendance-alerts/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).single();
  if (!profile?.organization_id) return NextResponse.json({ error: 'No organization found' }, { status: 400 });

  const [{ data: alerts, error }, { data: followups }] = await Promise.all([
    supabase.rpc('get_attendance_alerts', { p_org_id: profile.organization_id }),
    supabase.from('attendance_alert_followups').select('learner_id, alert_type, followed_up_at').eq('organization_id', profile.organization_id),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ ...alerts, followups: followups ?? [] });
}