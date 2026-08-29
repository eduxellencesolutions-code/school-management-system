// src/app/api/executive/notification-preferences/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function GET() {
  const supabase = await createClient();
  const { user } = await getAuthenticatedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data, error } = await supabase.from('notification_preferences').select('type, channel, enabled').eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ preferences: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user } = await getAuthenticatedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { type, channel, enabled } = body;
  if (!type || !channel || typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'type, channel and enabled are required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('notification_preferences')
    .upsert({ user_id: user.id, type, channel, enabled }, { onConflict: 'user_id,type' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}