import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');
  if (!isSuperAdmin) return NextResponse.json({ error: 'Only Super Admins can manage platform staff' }, { status: 403 });

  const { data: staff, error } = await supabase
    .from('platform_staff')
    .select('id, email, full_name, status, role_id, invited_at, activated_at')
    .order('invited_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: roles } = await supabase.from('platform_roles').select('id, name');
  const roleMap = new Map((roles ?? []).map(r => [r.id, r.name]));

  return NextResponse.json({
    staff: (staff ?? []).map(s => ({ ...s, roleName: roleMap.get(s.role_id) ?? 'Unknown' })),
    roles: roles ?? [],
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');
  if (!isSuperAdmin) return NextResponse.json({ error: 'Only Super Admins can invite platform staff' }, { status: 403 });

  const body = await request.json();
  const { email, fullName, roleId } = body;

  if (!email || !fullName || !roleId) {
    return NextResponse.json({ error: 'Missing email, fullName, or roleId' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Reuse existing auth user if this email already has an account; otherwise create one
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  let targetUserId = existingUsers?.users.find(u => u.email === email)?.id;

  if (!targetUserId) {
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { name: fullName },
    });
    if (createError || !newUser?.user) {
      return NextResponse.json({ error: `Failed to create staff account: ${createError?.message}` }, { status: 500 });
    }
    targetUserId = newUser.user.id;
  }

  const { error: insertError } = await admin
    .from('platform_staff')
    .insert({ user_id: targetUserId, email, full_name: fullName, role_id: roleId, invited_by: user.id, activated_at: new Date().toISOString() });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await admin.rpc('log_platform_action', {
    p_actor_id: user.id,
    p_action: 'invited_platform_staff',
    p_target_type: 'platform_staff',
    p_target_id: targetUserId,
    p_reason: null,
    p_metadata: { email, roleId },
  });

  return NextResponse.json({ success: true });
}