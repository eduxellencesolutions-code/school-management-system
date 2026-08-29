import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function GET() {
  const supabase = await createClient();

  const { user } = await getAuthenticatedUser(supabase);
  if (!user) {
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

  const { user } = await getAuthenticatedUser(supabase);
  if (!user) {
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

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');

  let organizationId: string | null = userRow.organization_id;
  if (isSuperAdmin && isPlatformWide === true) {
    organizationId = null;
  }

  const { error } = await supabase
    .from('announcements')
    .insert({
      organization_id: organizationId,
      title,
      body: content,
      audience: audience ?? 'all',
      created_by: user.id,
      expires_at: expiresAt ? `${expiresAt}T23:59:59` : null,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── Fan out an in-app notification to every relevant user ──
  const { createClient: createServiceClient } = await import('@supabase/supabase-js');
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  let targetUserIds: string[] = [];
  const scopedAudience = audience ?? 'all';

  if (organizationId === null) {
    // Platform-wide from within the school admin form (rare path) — same logic as the dedicated platform route
    if (scopedAudience === 'all') {
      const { data: allUsers } = await admin.from('users').select('id');
      targetUserIds = (allUsers ?? []).map(u => u.id);
    } else if (scopedAudience === 'parents') {
      const { data: parentUsers } = await admin.from('parent_accounts').select('auth_user_id');
      targetUserIds = (parentUsers ?? []).map(p => p.auth_user_id);
    }
  } else {
    // Org-scoped: only users within this organization
    let orgUsersQuery = admin.from('users').select('id').eq('organization_id', organizationId);
    const { data: orgUsers } = await orgUsersQuery;
    targetUserIds = (orgUsers ?? []).map(u => u.id);

    if (scopedAudience === 'parents') {
      // Parents don't have organization_id directly — find via linked learners in this org
      const { data: orgLearners } = await admin.from('learners').select('id').eq('organization_id', organizationId);
      const learnerIds = (orgLearners ?? []).map(l => l.id);
      if (learnerIds.length > 0) {
        // ✅ FIX: Use 'parent_id' not 'parent_account_id'
        const { data: links } = await admin
          .from('parent_learner_links')
          .select('parent_id')  // ← FIXED: was 'parent_account_id'
          .in('learner_id', learnerIds);
        const parentAccountIds = [...new Set((links ?? []).map(l => l.parent_id))];  // ← FIXED: was 'parent_account_id'
        if (parentAccountIds.length > 0) {
          const { data: parentUsers } = await admin
            .from('parent_accounts')
            .select('auth_user_id')
            .in('id', parentAccountIds);
          targetUserIds = (parentUsers ?? []).map(p => p.auth_user_id);
        } else {
          targetUserIds = [];
        }
      } else {
        targetUserIds = [];
      }
    }
  }

  if (targetUserIds.length > 0) {
    const notificationRows = targetUserIds.map(uid => ({
      user_id: uid,
      organization_id: organizationId,
      title,
      body: content,
      is_read: false,
      metadata: { type: 'announcement' },
    }));
    await admin.from('notifications').insert(notificationRows);
  }

  return NextResponse.json({ success: true });
}