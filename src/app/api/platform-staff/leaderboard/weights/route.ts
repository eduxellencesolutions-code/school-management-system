// src/app/api/platform-staff/leaderboard/weights/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data, error } = await supabase.from('platform_settings').select('value').eq('key', 'leaderboard.weights').maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ weights: data?.value ?? null });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { error } = await supabase.rpc('set_leaderboard_weights', { p_weights: body });
  if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  return NextResponse.json({ success: true });
}