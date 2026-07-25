import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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
    return NextResponse.json({ error: 'Only admins can assign roles' }, { status: 403 });
  }

  const body = await request.json();
  const { userId, roleId } = body;

  if (!userId || !roleId) {
    return NextResponse.json({ error: 'Missing userId or roleId' }, { status: 400 });
  }

  const { data: targetUser } = await supabase.from('users').select('organization_id').eq('id', userId).single();
  const { data: role } = await supabase.from('school_roles').select('organization_id').eq('id', roleId).single();

  if (!targetUser || targetUser.organization_id !== userRow.organization_id) {
    return NextResponse.json({ error: 'Staff member not found in your organization' }, { status: 404 });
  }
  if (!role || role.organization_id !== userRow.organization_id) {
    return NextResponse.json({ error: 'Role not found in your organization' }, { status: 404 });
  }

  const { error } = await supabase
    .from('staff_role_assignments')
    .upsert(
      { organization_id: userRow.organization_id, user_id: userId, role_id: roleId, assigned_by: user.id, is_active: true },
      { onConflict: 'user_id,role_id' }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── Notify the staff member of their new role ──
  // In-app notification always sent; email sent if Resend is configured.
  const { data: roleInfo } = await supabase
    .from('school_roles')
    .select('name')
    .eq('id', roleId)
    .single();

  const { data: targetUserInfo } = await supabase
    .from('users')
    .select('email, name')
    .eq('id', userId)
    .single();

  // Send in-app notification
  await supabase.rpc('create_notification', {
    p_org_id: userRow.organization_id,
    p_recipient_id: userId,
    p_title: 'New role assigned',
    p_body: `You have been assigned the role of ${roleInfo?.name ?? 'a new role'}.`,
    p_metadata: { category: 'role_assignment', link: '/dashboard' },
  });

  // Send email notification if Resend is configured
  if (targetUserInfo?.email && process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Eduxellence Results <notifications@eduxellence.org>',
        to: targetUserInfo.email,
        subject: 'New role assigned',
        html: `<p>Hi ${targetUserInfo.name ?? ''},</p><p>You have been assigned the role of <strong>${roleInfo?.name ?? 'a new role'}</strong>.</p><p><a href="https://results.eduxellence.org/dashboard">View your dashboard</a></p>`,
      });
    } catch (err) {
      console.error('Email send failed:', err);
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
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
    return NextResponse.json({ error: 'Only admins can remove role assignments' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const assignmentId = searchParams.get('assignmentId');

  if (!assignmentId) {
    return NextResponse.json({ error: 'Missing assignmentId' }, { status: 400 });
  }

  const { error } = await supabase
    .from('staff_role_assignments')
    .update({ is_active: false })
    .eq('id', assignmentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}