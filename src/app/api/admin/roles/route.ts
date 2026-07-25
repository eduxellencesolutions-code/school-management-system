import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
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
    return NextResponse.json({ error: 'Only admins can manage roles' }, { status: 403 });
  }

  const { data: roles, error } = await supabase
    .from('school_roles')
    .select('id, name, description, is_system_default, created_at')
    .eq('organization_id', userRow.organization_id)
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const roleIds = (roles ?? []).map((r) => r.id);

  const { data: rolePerms } = await supabase
    .from('role_permissions')
    .select('role_id, permission_key')
    .in('role_id', roleIds.length > 0 ? roleIds : ['00000000-0000-0000-0000-000000000000']);

  const permsByRole = new Map<string, string[]>();
  (rolePerms ?? []).forEach((rp) => {
    if (!permsByRole.has(rp.role_id)) permsByRole.set(rp.role_id, []);
    permsByRole.get(rp.role_id)!.push(rp.permission_key);
  });

  const { data: assignments } = await supabase
    .from('staff_role_assignments')
    .select('role_id')
    .eq('organization_id', userRow.organization_id)
    .eq('is_active', true);

  const staffCountByRole = new Map<string, number>();
  (assignments ?? []).forEach((a) => {
    staffCountByRole.set(a.role_id, (staffCountByRole.get(a.role_id) ?? 0) + 1);
  });

  const enriched = (roles ?? []).map((r) => ({
    ...r,
    permissions: permsByRole.get(r.id) ?? [],
    staffCount: staffCountByRole.get(r.id) ?? 0,
  }));

  return NextResponse.json({ roles: enriched });
}

export async function POST(request: Request) {
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
    return NextResponse.json({ error: 'Only admins can create roles' }, { status: 403 });
  }

  const body = await request.json();
  const { name, description } = body;

  if (!name) {
    return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
  }

  const { data: role, error } = await supabase
    .from('school_roles')
    .insert({ organization_id: userRow.organization_id, name, description: description ?? null, created_by: user.id })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, roleId: role.id });
}