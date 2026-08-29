// src/app/api/platform-staff/schools/[id]/reassign/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { user } = await getAuthenticatedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { newRepresentativeId, reason } = body;

  if (!reason || !reason.trim()) {
    return NextResponse.json({ error: 'A reason is required' }, { status: 400 });
  }

  // newRepresentativeId absent/null = pure unassignment
  const { data, error } = newRepresentativeId
    ? await supabase.rpc('reassign_school_portfolio', {
        p_organization_id: id,
        p_new_representative_id: newRepresentativeId,
        p_reason: reason,
      })
    : await supabase.rpc('unassign_school_portfolio', {
        p_organization_id: id,
        p_reason: reason,
      });

  if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  return NextResponse.json({ success: true, assignmentId: data ?? null });
}