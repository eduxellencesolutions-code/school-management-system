// src/app/api/representatives/leaderboard/category/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

const VALID_CATEGORIES = ['top_onboarders', 'revenue_champions', 'customer_champions'];

export async function GET(request: Request) {
  const supabase = await createClient();
  const { user } = await getAuthenticatedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const period = searchParams.get('period') ?? 'month';

  if (!category || !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }

  const now = new Date();
  let start: string, end: string;
  if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  } else if (period === 'quarter') {
    const q = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), q * 3, 1).toISOString().split('T')[0];
    end = new Date(now.getFullYear(), q * 3 + 3, 0).toISOString().split('T')[0];
  } else if (period === 'year') {
    start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    end = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
  } else {
    start = '2020-01-01';
    end = now.toISOString().split('T')[0];
  }

  const { data, error } = await supabase.rpc('get_leaderboard_category', { p_category: category, p_start: start, p_end: end, p_limit: 20 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ results: data ?? [] });
}