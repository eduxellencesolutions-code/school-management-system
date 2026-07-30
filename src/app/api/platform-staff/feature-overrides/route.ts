import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');
  if (!isSuperAdmin) return NextResponse.json({ error: 'Only Super Admins can manage feature overrides' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId');
  if (!orgId) return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });

  const { data: overrides, error } = await supabase.from('feature_overrides').select('*').eq('organization_id', orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ overrides: overrides ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');
  if (!isSuperAdmin) return NextResponse.json({ error: 'Only Super Admins can manage feature overrides' }, { status: 403 });

  const body = await request.json();
  const { orgId, featureKey, enabled, reason, expiresAt } = body;

  const { error } = await supabase.from('feature_overrides').upsert(
    { organization_id: orgId, feature_key: featureKey, enabled, reason: reason ?? null, expires_at: expiresAt ?? null, created_by: user.id },
    { onConflict: 'organization_id,feature_key' }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.rpc('log_platform_action', {
    p_actor_id: user.id, p_action: 'feature_override_set', p_target_type: 'organization', p_target_id: orgId,
    p_reason: reason ?? null, p_metadata: { featureKey, enabled },
  });

  return NextResponse.json({ success: true });
}