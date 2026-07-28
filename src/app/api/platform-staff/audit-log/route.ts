import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');
  if (!isSuperAdmin) return NextResponse.json({ error: 'Only Super Admins can view the audit log' }, { status: 403 });

  const { data: logs, error } = await supabase
    .from('platform_audit_log')
    .select('id, actor_id, action, target_type, target_id, reason, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const actorIds = [...new Set((logs ?? []).map(l => l.actor_id).filter(Boolean))];
  const { data: actors } = actorIds.length > 0
    ? await supabase.from('users').select('id, name').in('id', actorIds)
    : { data: [] };
  const actorMap = new Map((actors ?? []).map(a => [a.id, a.name]));

  return NextResponse.json({
    logs: (logs ?? []).map(l => ({ ...l, actorName: actorMap.get(l.actor_id) ?? 'System' })),
  });
}