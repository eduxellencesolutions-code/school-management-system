import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: canManage } = await supabase.rpc('has_platform_permission', { p_user_id: user.id, p_permission_key: 'support.manage' });
  if (!canManage) return NextResponse.json({ error: 'Only support staff can update tickets' }, { status: 403 });

  const body = await request.json();
  const { status, priority, assignedTo } = body;

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (status) {
    updates.status = status;
    if (status === 'resolved') updates.resolved_at = new Date().toISOString();
    if (status === 'closed') updates.closed_at = new Date().toISOString();
  }
  if (priority) updates.priority = priority;
  if (assignedTo !== undefined) updates.assigned_to = assignedTo;

  const { error } = await supabase.from('support_tickets').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.rpc('log_platform_action', {
    p_actor_id: user.id,
    p_action: 'ticket_updated',
    p_target_type: 'support_ticket',
    p_target_id: id,
    p_reason: null,
    p_metadata: { status, priority, assignedTo },
  });

  return NextResponse.json({ success: true });
}