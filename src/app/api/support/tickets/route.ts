import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function GET(request: Request) {
  const supabase = await createClient();
  const { user } = await getAuthenticatedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get('scope'); // 'mine' or 'all' (staff only)

  const { data: canViewAll } = await supabase.rpc('has_platform_permission', { p_user_id: user.id, p_permission_key: 'support.view' });

  let query = supabase
    .from('support_tickets')
    .select('id, subject, status, priority, organization_id, submitted_by_user_id, assigned_to, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (scope !== 'all' || !canViewAll) {
    query = query.eq('submitted_by_user_id', user.id);
  }

  const { data: tickets, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Resolve submitter names for staff view
  const submitterIds = [...new Set((tickets ?? []).map(t => t.submitted_by_user_id).filter(Boolean))];
  const { data: submitters } = submitterIds.length > 0
    ? await supabase.from('users').select('id, name, email').in('id', submitterIds)
    : { data: [] };
  const submitterMap = new Map((submitters ?? []).map(s => [s.id, s]));

  return NextResponse.json({
    tickets: (tickets ?? []).map(t => ({
      ...t,
      submitterName: submitterMap.get(t.submitted_by_user_id)?.name ?? null,
      submitterEmail: submitterMap.get(t.submitted_by_user_id)?.email ?? null,
    })),
    canViewAll,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user } = await getAuthenticatedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { subject, message, priority } = body;

  if (!subject || !message) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
  }

  const { data: userRow } = await supabase.from('users').select('organization_id').eq('id', user.id).single();

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .insert({
      organization_id: userRow?.organization_id ?? null,
      submitted_by_user_id: user.id,
      subject,
      priority: priority ?? 'normal',
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('support_ticket_messages').insert({
    ticket_id: ticket.id,
    sender_user_id: user.id,
    is_internal_note: false,
    body: message,
  });

  return NextResponse.json({ success: true, ticketId: ticket.id });
}