// src/app/api/platform-staff/leaderboard/falling/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function GET() {
  const supabase = await createClient();
  const { user } = await getAuthenticatedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data, error } = await supabase.rpc('get_leaderboard_falling');
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ falling: data ?? [] });
}