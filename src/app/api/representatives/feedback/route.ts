// src/app/api/representatives/feedback/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { organizationId, satisfaction, biggestChallenge, notes } = body;

  if (!organizationId || !satisfaction) {
    return NextResponse.json({ error: 'organizationId and satisfaction are required' }, { status: 400 });
  }

  const { data: feedbackId, error } = await supabase.rpc('submit_school_feedback', {
    p_organization_id: organizationId,
    p_satisfaction: satisfaction,
    p_biggest_challenge: biggestChallenge ?? null,
    p_notes: notes ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  return NextResponse.json({ success: true, feedbackId });
}