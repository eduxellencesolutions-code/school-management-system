// src/app/api/platform-staff/escalations/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const representativeId = searchParams.get('representativeId');
  const priority = searchParams.get('priority');
  const status = searchParams.get('status');

  let query = supabase
    .from('support_tickets')
    .select('*, representatives(id, full_name, referral_code), organizations(id, name)')
    .not('representative_id', 'is', null)
    .order('created_at', { ascending: false });

  if (representativeId) query = query.eq('representative_id', representativeId);
  if (priority) query = query.eq('priority', priority);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ escalations: data ?? [] });
}