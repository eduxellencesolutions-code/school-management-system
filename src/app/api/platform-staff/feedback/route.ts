// src/app/api/platform-staff/feedback/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const representativeId = searchParams.get('representativeId');
  const category = searchParams.get('category');

  let query = supabase
    .from('school_feedback')
    .select('*, representatives(id, full_name, referral_code), organizations(id, name)')
    .order('created_at', { ascending: false });

  if (representativeId) query = query.eq('representative_id', representativeId);
  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ feedback: data ?? [] });
}