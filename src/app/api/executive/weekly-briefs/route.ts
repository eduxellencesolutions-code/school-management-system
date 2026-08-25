// src/app/api/executive/weekly-briefs/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).single();
  if (!profile?.organization_id) return NextResponse.json({ error: 'No organization found' }, { status: 400 });

  const { data, error } = await supabase
    .from('weekly_school_briefs')
    .select('week_ending, brief_data')
    .eq('organization_id', profile.organization_id)
    .order('week_ending', { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ briefs: data ?? [] });
}