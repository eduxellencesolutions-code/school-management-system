// src/app/api/platform-staff/leaderboard/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const period = new URL(request.url).searchParams.get('period') ?? 'latest';
  const { data, error } = await supabase.rpc('get_leaderboard_admin', { p_period: period });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json(data);
}