// src/app/api/platform-staff/leaderboard/[id]/history/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data, error } = await supabase.rpc('get_representative_leaderboard_history', { p_representative_id: id, p_days: 90 });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ history: data ?? [] });
}