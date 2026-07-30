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
    return NextResponse.json({ error: 'Only admins can view this' }, { status: 403 });
  }

  // ✅ Include both org-specific AND platform-wide announcements
  const { data: announcements, error } = await supabase
    .from('announcements')
    .select('id, title, body, audience, created_at, expires_at, organization_id')
    .or(`organization_id.eq.${userRow.organization_id},organization_id.is.null`)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ announcements: announcements ?? [] });
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
    return NextResponse.json({ error: 'Only admins can create announcements' }, { status: 403 });
  }

  const body = await request.json();
  const { title, body: content, audience, expiresAt, isPlatformWide } = body;

  if (!title || !content) {
    return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
  }

  // ✅ Check if user is Super Admin and wants to post platform-wide
  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');

  let organizationId = userRow.organization_id;
  if (isSuperAdmin && isPlatformWide === true) {
    organizationId = null;
  }

  const { error: insertError } = await supabase
    .from('announcements')
    .insert({
      organization_id: organizationId,
      title,
      body: content,
      audience: audience ?? 'all',
      created_by: user.id,
      expires_at: expiresAt || null,
    });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // ── Fan out in-app notification to relevant users ──
  const { createClient: createServiceClient } = await import('@supabase/supabase-js');
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Fetch target users (organization-specific OR all users for platform-wide)
  let targetUsersQuery = admin.from('users').select('id, organization_id');
  
  if (organizationId) {
    // School-specific announcement
    targetUsersQuery = targetUsersQuery.eq('organization_id', organizationId);
  }
  // If platform-wide (organizationId === null), fetch ALL users

  const { data: targetUsers } = await targetUsersQuery;

  if (targetUsers && targetUsers.length > 0) {
    const notificationRows = targetUsers.map(u => ({
      user_id: u.id,
      organization_id: u.organization_id,
      title: title,
      body: content,
      is_read: false,
      metadata: { type: organizationId === null ? 'platform_announcement' : 'announcement' },
    }));

    const { error: notifError } = await admin
      .from('notifications')
      .insert(notificationRows);

    if (notifError) {
      console.error('Failed to fan out notifications:', notifError);
      // Don't fail the request - announcement was created successfully
    }
  }

  return NextResponse.json({ success: true });
}