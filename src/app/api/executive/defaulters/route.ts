// src/app/api/executive/defaulters/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const groupId = new URL(request.url).searchParams.get('groupId');
  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).single();
  if (!profile?.organization_id) return NextResponse.json({ error: 'No organization found' }, { status: 400 });

  if (groupId) {
    const { data, error } = await supabase.rpc('get_defaulters_in_class', { p_group_id: groupId });
    if (error) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ students: data ?? [] });
  }

  const { data, error } = await supabase.rpc('get_defaulters_by_class', { p_org_id: profile.organization_id });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ classes: data ?? [] });
}