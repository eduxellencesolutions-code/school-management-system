// src/app/api/support/tickets/[id]/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .select('id, subject, status, priority, submitted_by_user_id, assigned_to, representative_id, organization_id, created_at')
    .eq('id', id)
    .single();

  if (error || !ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  // NEW: log the view, but only for representative escalations — this is
  // the accountability chain doc 12 §11 asks for ("Super Admin viewed
  // escalation"), not a general audit of every support-ticket open event.
  if (ticket.representative_id) {
    const { error: logError } = await supabase.rpc('log_platform_action', {
      p_actor_id: user.id,
      p_action: 'escalation_viewed',
      p_target_type: 'support_tickets',
      p_target_id: id,
      p_reason: null,
      p_metadata: {},
    });
    if (logError) console.error('Failed to log escalation view:', logError);
  }

  const { data: messages } = await supabase
    .from('support_ticket_messages')
    .select('id, sender_user_id, is_internal_note, body, created_at')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true });

  const senderIds = [...new Set((messages ?? []).map(m => m.sender_user_id).filter(Boolean))];
  const { data: senders } = senderIds.length > 0
    ? await supabase.from('users').select('id, name').in('id', senderIds)
    : { data: [] };
  const senderMap = new Map((senders ?? []).map(s => [s.id, s.name]));

  return NextResponse.json({
    ticket,
    messages: (messages ?? []).map(m => ({ ...m, senderName: senderMap.get(m.sender_user_id) ?? 'Unknown' })),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { message, isInternalNote } = body;
  if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

  if (isInternalNote) {
    const { data: canManage } = await supabase.rpc('has_platform_permission', {
      p_user_id: user.id,
      p_permission_key: 'support.manage',
    });
    if (!canManage) return NextResponse.json({ error: 'Only support staff can add internal notes' }, { status: 403 });
  }

  const { error } = await supabase
    .from('support_ticket_messages')
    .insert({
      ticket_id: id,
      sender_user_id: user.id,
      is_internal_note: !!isInternalNote,
      body: message,
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from('support_tickets')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id);

  if (!isInternalNote) {
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('submitted_by_user_id, subject')
      .eq('id', id)
      .single();

    if (ticket && ticket.submitted_by_user_id !== user.id) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: ticket.submitted_by_user_id,
          title: 'New reply on your support ticket',
          body: `Support replied to "${ticket.subject}". Click to view.`,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      if (notifError) console.error('Failed to send reply notification:', notifError);
    }
  }

  return NextResponse.json({ success: true });
}