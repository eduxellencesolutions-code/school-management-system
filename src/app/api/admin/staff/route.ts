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
    return NextResponse.json({ error: 'Only admins can view staff' }, { status: 403 });
  }

  const { data: staff, error } = await supabase
    .from('users')
    .select('id, name, email, role')
    .eq('organization_id', userRow.organization_id)
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: assignments } = await supabase
    .from('staff_role_assignments')
    .select('user_id, role_id, id')
    .eq('organization_id', userRow.organization_id)
    .eq('is_active', true);

  const { data: roles } = await supabase
    .from('school_roles')
    .select('id, name')
    .eq('organization_id', userRow.organization_id);

  const roleMap = new Map((roles ?? []).map((r) => [r.id, r.name]));

  const rolesByUser = new Map<string, Array<{ assignmentId: string; roleId: string; roleName: string }>>();
  (assignments ?? []).forEach((a) => {
    if (!rolesByUser.has(a.user_id)) rolesByUser.set(a.user_id, []);
    rolesByUser.get(a.user_id)!.push({
      assignmentId: a.id,
      roleId: a.role_id,
      roleName: roleMap.get(a.role_id) ?? 'Unknown role',
    });
  });

  const enriched = (staff ?? []).map((s) => ({
    ...s,
    assignedRoles: rolesByUser.get(s.id) ?? [],
  }));

  return NextResponse.json({ staff: enriched });
}