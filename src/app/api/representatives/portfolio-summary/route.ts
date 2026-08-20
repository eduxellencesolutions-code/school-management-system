// src/app/api/representatives/portfolio-summary/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data, error } = await supabase.rpc('get_my_representative_portfolio_summary');
  if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  return NextResponse.json(data);
}