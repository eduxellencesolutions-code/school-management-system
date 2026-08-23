// src/app/api/representatives/leaderboard/recognitions/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const repId = new URL(request.url).searchParams.get('representativeId');

  let query = supabase
    .from('representative_recognitions')
    .select('*, representatives(full_name, referral_code)')
    .order('period_start', { ascending: false })
    .limit(50);

  if (repId) query = query.eq('representative_id', repId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ recognitions: data ?? [] });
}