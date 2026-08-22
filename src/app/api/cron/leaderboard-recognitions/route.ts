// src/app/api/cron/leaderboard-recognitions/route.ts
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse(null, { status: 401 });
  }
  try {
    const { data, error } = await supabase.rpc('compute_monthly_representative_recognitions');
    if (error) {
      console.error('Leaderboard recognitions cron error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.log(`Monthly recognitions computed: ${JSON.stringify(data)}`);
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    console.error('Leaderboard recognitions cron error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}