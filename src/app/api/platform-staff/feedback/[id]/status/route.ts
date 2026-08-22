// src/app/api/platform-staff/feedback/[id]/status/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { status, response } = body;
  if (!status) return NextResponse.json({ error: 'status is required' }, { status: 400 });

  const { error } = await supabase.rpc('update_school_feedback_status', {
    p_feedback_id: id,
    p_status: status,
    p_response: response ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  return NextResponse.json({ success: true });
}