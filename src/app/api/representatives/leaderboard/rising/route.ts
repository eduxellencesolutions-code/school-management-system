// src/app/api/representatives/leaderboard/rising/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const days = Number(new URL(request.url).searchParams.get('days') ?? '30');
  const { data, error } = await supabase.rpc('get_leaderboard_rising', { p_days: days });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rising: data ?? [] });
}