// src/app/api/platform-staff/follow-ups/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const representativeId = searchParams.get('representativeId');
  const overdueOnly = searchParams.get('overdue') === 'true';
  const dueOnly = searchParams.get('due') === 'true';

  let query = supabase
    .from('representative_follow_ups')
    .select('*, representatives(id, full_name, referral_code), organizations(id, name)')
    .order('contact_date', { ascending: false });

  if (representativeId) query = query.eq('representative_id', representativeId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const today = new Date().toISOString().split('T')[0];
  const weekOut = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  let result = data ?? [];
  if (overdueOnly) result = result.filter(f => f.follow_up_required && f.next_follow_up_date && f.next_follow_up_date < today);
  if (dueOnly) result = result.filter(f => f.follow_up_required && f.next_follow_up_date && f.next_follow_up_date >= today && f.next_follow_up_date <= weekOut);

  return NextResponse.json({ followUps: result });
}