// src/app/api/representatives/leaderboard/summary/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const [{ data: summary, error: summaryError }, { data: liveCounts, error: liveError }] = await Promise.all([
    supabase.rpc('get_my_leaderboard_summary'),
    supabase.rpc('get_my_representative_portfolio_summary'),
  ]);

  if (summaryError) return NextResponse.json({ error: summaryError.message }, { status: 422 });
  return NextResponse.json({ leaderboard: summary, live: liveError ? null : liveCounts });
}