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

  const { data: existingTicket } = await supabase
    .from('support_tickets')
    .select('submitted_by_user_id, subject, status, representative_id, organization_id')
    .eq('id', id)
    .single();

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

  // Notify the customer the moment a ticket is marked resolved — this is
  // also the point the 7-day auto-close timer starts (via resolved_at).
  if (status === 'resolved' && existingTicket?.status !== 'resolved' && existingTicket?.submitted_by_user_id) {
    const { error: notifError } = await supabase.from('notifications').insert({
      user_id: existingTicket.submitted_by_user_id,
      title: 'Your support ticket was resolved',
      body: `"${existingTicket.subject}" has been marked as resolved. If your issue isn't fully fixed, just reply to the ticket to reopen it.`,
      is_read: false,
      created_at: new Date().toISOString(),
    });
    if (notifError) console.error('Failed to send resolution notification:', notifError);
  }

  // Separately notify the representative who escalated this, if any —
  // on ANY status change, not just resolved, since "Under Review" /
  // "In Progress" updates matter to a rep tracking a school's issue too.
  if (status && status !== existingTicket?.status && existingTicket?.representative_id) {
    const { data: repRow } = await supabase
      .from('representatives')
      .select('user_id')
      .eq('id', existingTicket.representative_id)
      .single();

    if (repRow?.user_id) {
      const { error: repNotifError } = await supabase.from('notifications').insert({
        user_id: repRow.user_id,
        organization_id: existingTicket.organization_id ?? null,
        title: 'Escalation status updated',
        body: `Your reported issue "${existingTicket.subject}" is now: ${status}.`,
        is_read: false,
        metadata: { type: 'escalation_status_changed', ticket_id: id, link: `/rep/schools/${existingTicket.organization_id}` },
        created_at: new Date().toISOString(),
      });
      if (repNotifError) console.error('Failed to send rep escalation notification:', repNotifError);
    }
  }

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