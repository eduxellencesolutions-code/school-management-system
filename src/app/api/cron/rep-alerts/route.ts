// src/app/api/cron/rep-alerts/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  // Protect this endpoint so random people can't trigger it
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse(null, { status: 401 });
  }

  try {
    const { data, error } = await supabase.rpc('run_representative_alert_checks');

    if (error) {
      console.error('Cron error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`Rep alerts run: ${JSON.stringify(data)}`);
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}