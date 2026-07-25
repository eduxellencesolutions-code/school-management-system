import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: userRow } = await supabase.from('users').select('organization_id, role').eq('id', user.id).single();
  if (!userRow?.organization_id || userRow.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can send notifications' }, { status: 403 });
  }

  const body = await request.json();
  const { recipientId, title, message, link, category } = body;

  if (!recipientId || !title || !message) {
    return NextResponse.json({ error: 'Missing recipientId, title, or message' }, { status: 400 });
  }

  const { data: notificationId, error } = await supabase.rpc('create_notification', {
    p_org_id: userRow.organization_id,
    p_recipient_id: recipientId,
    p_title: title,
    p_body: message,
    p_link: link ?? null,
    p_category: category ?? 'general',
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send email using service-role client, so we can read the recipient's real email regardless of RLS
  const admin = createAdminClient();
  const { data: recipient } = await admin.from('users').select('email, name').eq('id', recipientId).single();

  if (recipient?.email && process.env.RESEND_API_KEY) {
    try {
      await resend.emails.send({
        from: 'Eduxellence Results <notifications@eduxellence.org>',
        to: recipient.email,
        subject: title,
        html: `<p>Hi ${recipient.name ?? ''},</p><p>${message}</p>${link ? `<p><a href="https://results.eduxellence.org${link}">View details</a></p>` : ''}`,
      });
      await admin.from('notification_deliveries').update({ sent: true, sent_at: new Date().toISOString() })
        .eq('notification_id', notificationId).eq('channel', 'email');
    } catch (err) {
      await admin.from('notification_deliveries').update({ sent: false, error: String(err) })
        .eq('notification_id', notificationId).eq('channel', 'email');
    }
  }

  return NextResponse.json({ success: true });
}