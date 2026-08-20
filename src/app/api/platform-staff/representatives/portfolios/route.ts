// src/app/api/platform-staff/representatives/portfolios/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data, error } = await supabase.rpc('get_all_representative_portfolios_overview');
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ portfolios: data ?? [] });
}