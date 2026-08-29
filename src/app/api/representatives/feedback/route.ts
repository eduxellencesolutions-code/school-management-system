import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user } = await getAuthenticatedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { organizationId, category, subtype, satisfaction, biggestChallenge, notes } = body;

  if (!organizationId || !category) {
    return NextResponse.json({ error: 'organizationId and category are required' }, { status: 400 });
  }
  if (category === 'customer' && !satisfaction) {
    return NextResponse.json({ error: 'satisfaction is required for customer feedback' }, { status: 400 });
  }

  const { data: feedbackId, error } = await supabase.rpc('submit_school_feedback', {
    p_organization_id: organizationId,
    p_category: category,
    p_subtype: subtype ?? null,
    p_satisfaction: satisfaction ?? null,
    p_biggest_challenge: biggestChallenge ?? null,
    p_notes: notes ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  return NextResponse.json({ success: true, feedbackId });
}