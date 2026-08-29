import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .select('id, subject, category, status, priority, created_at, submitted_by_user_id')
    .eq('id', id)
    .single()

  if (ticketError || !ticket || ticket.submitted_by_user_id !== user.id) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  const { data: messages, error: messagesError } = await supabase
    .from('support_ticket_messages')
    .select('id, sender_user_id, is_internal_note, body, created_at')
    .eq('ticket_id', id)
    .eq('is_internal_note', false) // customers never see internal staff notes
    .order('created_at', { ascending: true })

  if (messagesError) return NextResponse.json({ error: messagesError.message }, { status: 500 })

  return NextResponse.json({ ticket, messages: messages ?? [] })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('submitted_by_user_id, status')
    .eq('id', id)
    .single()

  if (!ticket || ticket.submitted_by_user_id !== user.id) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  // ✅ Closed tickets - return with previous ticket ID so UI can offer "Open New Ticket"
  if (ticket.status === 'closed') {
    return NextResponse.json({
      error: 'This ticket is closed and cannot receive new replies.',
      ticketClosed: true,
      previousTicketId: id,
    }, { status: 409 })
  }

  const { message } = await request.json()
  if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 })

  const { error: messageError } = await supabase
    .from('support_ticket_messages')
    .insert({ ticket_id: id, sender_user_id: user.id, is_internal_note: false, body: message })

  if (messageError) return NextResponse.json({ error: messageError.message }, { status: 500 })

  // ✅ A reply on a resolved or waiting-for-customer ticket automatically
  // brings it back into the active queue AND resets the auto-close timer.
  const statusesThatReopen = ['resolved', 'waiting_customer']
  if (statusesThatReopen.includes(ticket.status)) {
    const { error: statusError } = await supabase
      .from('support_tickets')
      .update({
        status: 'in_progress',
        resolved_at: null, // ✅ reset the auto-close timer
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (statusError) console.error('Failed to auto-reopen ticket:', statusError)

    await supabase.rpc('log_platform_action', {
      p_actor_id: user.id,
      p_action: 'ticket_status_auto_changed',
      p_target_type: 'support_tickets',
      p_target_id: id,
      p_reason: `Status changed automatically due to customer reply (was: ${ticket.status})`,
      p_metadata: { from: ticket.status, to: 'in_progress' },
    })
  }

  return NextResponse.json({ success: true })
}