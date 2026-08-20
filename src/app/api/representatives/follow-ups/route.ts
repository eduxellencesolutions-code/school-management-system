// src/app/api/representatives/follow-ups/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const {
    organizationId, contactDate, contactMethod, reason, schoolReported,
    challengeIssue, actionTaken, followUpRequired, nextFollowUpDate, notes,
  } = body;

  if (!organizationId || !contactMethod) {
    return NextResponse.json({ error: 'organizationId and contactMethod are required' }, { status: 400 });
  }

  const { data: followUpId, error } = await supabase.rpc('log_representative_follow_up', {
    p_organization_id: organizationId,
    p_contact_date: contactDate ?? new Date().toISOString().split('T')[0],
    p_contact_method: contactMethod,
    p_reason: reason ?? null,
    p_school_reported: schoolReported ?? null,
    p_challenge_issue: challengeIssue ?? null,
    p_action_taken: actionTaken ?? null,
    p_follow_up_required: !!followUpRequired,
    p_next_follow_up_date: nextFollowUpDate || null,
    p_notes: notes ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  return NextResponse.json({ success: true, followUpId });
}