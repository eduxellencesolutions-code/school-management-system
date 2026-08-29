import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { user } = await getAuthenticatedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');
  if (!isSuperAdmin) return NextResponse.json({ error: 'Only Super Admins can change staff status' }, { status: 403 });

  const body = await request.json();
  const { status, reason } = body;

  if (!['active', 'suspended', 'revoked'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { error } = await supabase.from('platform_staff').update({ status }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.rpc('log_platform_action', {
    p_actor_id: user.id,
    p_action: `staff_status_changed_to_${status}`,
    p_target_type: 'platform_staff',
    p_target_id: id,
    p_reason: reason ?? null,
    p_metadata: {},
  });

  return NextResponse.json({ success: true });
}