import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/promotion/correct
// Body: { learnerId, newStatus: 'promoted'|'repeated', toGroupId, note }
// Admin-only. Corrects a previously committed promotion decision for a single student.
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  if (userError || !userRow) {
    return NextResponse.json({ error: 'Could not resolve user profile' }, { status: 500 });
  }

  if (userRow.organization_id === null) {
    return NextResponse.json({ error: 'This feature is not available for solo teacher accounts' }, { status: 403 });
  }

  // ✅ FIX: Check permission instead of hard role check
  const { data: hasPerm } = await supabase.rpc('has_permission', { 
    p_user_id: user.id, 
    p_permission_key: 'promotion.confirm' 
  });
  if (userRow.role !== 'admin' && !hasPerm) {
    return NextResponse.json({ error: 'You do not have permission to correct promotion decisions' }, { status: 403 });
  }

  const body = await request.json();
  const { learnerId, newStatus, toGroupId, note } = body;

  if (!learnerId || !newStatus) {
    return NextResponse.json({ error: 'Missing learnerId or newStatus' }, { status: 400 });
  }

  if (newStatus === 'promoted' && !toGroupId) {
    return NextResponse.json({ error: 'toGroupId is required when correcting to promoted' }, { status: 400 });
  }

  const { data: result, error: correctionError } = await supabase.rpc('correct_promotion_decision', {
    p_org_id: userRow.organization_id,
    p_learner_id: learnerId,
    p_new_status: newStatus,
    p_to_class_id: toGroupId ?? null,
    p_corrected_by: user.id,
    p_note: note ?? null,
  });

  if (correctionError) {
    return NextResponse.json({ error: correctionError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, result });
}