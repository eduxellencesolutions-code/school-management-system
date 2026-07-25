import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roleId: string }> }
) {
  const { roleId } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  if (!userRow?.organization_id || userRow.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can edit role permissions' }, { status: 403 });
  }

  const { data: role } = await supabase
    .from('school_roles')
    .select('organization_id')
    .eq('id', roleId)
    .single();

  if (!role || role.organization_id !== userRow.organization_id) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 });
  }

  const body = await request.json();
  const { permissionKey, enabled } = body;

  if (!permissionKey) {
    return NextResponse.json({ error: 'Missing permissionKey' }, { status: 400 });
  }

  if (enabled) {
    const { error } = await supabase
      .from('role_permissions')
      .upsert({ role_id: roleId, permission_key: permissionKey, granted_by: user.id }, { onConflict: 'role_id,permission_key' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .eq('permission_key', permissionKey);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}