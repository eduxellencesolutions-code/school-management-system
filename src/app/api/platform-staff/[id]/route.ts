import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { user } = await getAuthenticatedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');
  if (!isSuperAdmin) return NextResponse.json({ error: 'Only Super Admins can delete platform staff' }, { status: 403 });

  // Get the staff member's info before deleting for audit log
  const { data: staffMember } = await supabase
    .from('platform_staff')
    .select('email, full_name')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('platform_staff')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.rpc('log_platform_action', {
    p_actor_id: user.id,
    p_action: 'deleted_platform_staff',
    p_target_type: 'platform_staff',
    p_target_id: id,
    p_reason: null,
    p_metadata: { email: staffMember?.email, full_name: staffMember?.full_name },
  });

  return NextResponse.json({ success: true });
}