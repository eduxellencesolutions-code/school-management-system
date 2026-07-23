import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ parentId: string }> }
) {
  const { parentId } = await params;
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

  if (userRow.organization_id === null || userRow.role !== 'admin') {
    return NextResponse.json({ error: 'Only school admins can change parent access' }, { status: 403 });
  }

  const body = await request.json();
  const { active } = body as { active: boolean };

  const admin = createAdminClient();

  const { data: parentLearner } = await admin
    .from('parent_learner_links')
    .select('learner_id')
    .eq('parent_id', parentId)
    .limit(1)
    .maybeSingle();

  if (!parentLearner) {
    return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
  }

  const { data: learner } = await admin
    .from('learners')
    .select('organization_id')
    .eq('id', parentLearner.learner_id)
    .single();

  if (!learner || learner.organization_id !== userRow.organization_id) {
    return NextResponse.json({ error: 'Parent does not belong to your organization' }, { status: 403 });
  }

  const { error: updateError } = await admin
    .from('parent_accounts')
    .update({ access_code_active: active })
    .eq('id', parentId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, active });
}