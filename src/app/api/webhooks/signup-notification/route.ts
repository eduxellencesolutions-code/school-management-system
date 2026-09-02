import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

const SUPER_ADMIN_BASE = 'https://admin.eduxellence.org';
const MAX_ATTEMPTS = 5;

function nextBackoff(attemptCount: number): string | null {
  // attemptCount is the count AFTER this failed attempt
  const minutes = [2, 10, 30, 60, 120][attemptCount - 1];
  if (minutes === undefined) return null; // exhausted
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function buildAdminLink(signupType: string, payload: Record<string, any>) {
  switch (signupType) {
    case 'institution': return `${SUPER_ADMIN_BASE}/schools/${payload.organization_id}`;
    case 'solo_teacher': return `${SUPER_ADMIN_BASE}/solo-teachers/${payload.user_id}`;
    case 'representative': return `${SUPER_ADMIN_BASE}/representatives/${payload.representative_id}`;
    default: return SUPER_ADMIN_BASE;
  }
}

function labelFor(signupType: string) {
  return { institution: 'Institution', solo_teacher: 'Solo Teacher', representative: 'Representative' }[signupType] ?? signupType;
}

function buildEmail(signupType: string, payload: Record<string, any>) {
  const label = labelFor(signupType);
  const link = buildAdminLink(signupType, payload);
  const when = payload.created_at
    ? new Date(payload.created_at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' })
    : '';

  const rows: [string, string | undefined][] = [
    ['Name', payload.name],
    ['Email', payload.email],
    ['Signup type', label],
    ['Organization / school', payload.organization_name],
    ['Institution type', payload.organization_type],
    ['State / territory', payload.territory_state],
    ['Phone', payload.phone],
    ['Referral / representative code', payload.referral_code],
    ['Registered at', when],
  ];

  const rowsHtml = rows.filter(([, v]) => v).map(([k, v]) => `<tr>
    <td style="padding:4px 16px 4px 0;color:#64748B;font-size:13px;white-space:nowrap;">${k}</td>
    <td style="padding:4px 0;color:#0B1829;font-size:13px;font-weight:600;">${v}</td>
  </tr>`).join('');

  return {
    subject: `New signup: ${label} — ${payload.name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;border:1px solid #E2E8F0;border-radius:8px;">
        <h2 style="color:#0B1829;margin-top:0;">New ${label} signup</h2>
        <table style="border-collapse:collapse;">${rowsHtml}</table>
        <div style="margin-top:24px;">
          <a href="${link}" style="background:#1E6BFF;color:#FFFFFF;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">
            View in Super Admin →
          </a>
        </div>
      </div>
    `,
  };
}

export async function POST(request: Request) {
  const secret = request.headers.get('x-signup-notification-secret');
  if (!secret || secret !== process.env.SIGNUP_NOTIFICATION_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let outboxId: string | undefined;
  try {
    ({ outboxId } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!outboxId) return NextResponse.json({ error: 'Missing outboxId' }, { status: 400 });

  const admin = createAdminClient();

  const { data: row, error: fetchError } = await admin
    .from('signup_notification_outbox')
    .select('*')
    .eq('id', outboxId)
    .maybeSingle();

  if (fetchError || !row) {
    return NextResponse.json({ error: 'Outbox row not found' }, { status: 404 });
  }

  // Idempotent guards — never re-send a completed or permanently
  // exhausted notification, no matter how this route got invoked.
  if (row.status === 'sent' || row.status === 'exhausted') {
    return NextResponse.json({ success: true, skipped: row.status });
  }

  const { subject, html } = buildEmail(row.signup_type, row.payload);
  const attemptCount = (row.attempt_count ?? 0) + 1;

  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'Eduxellence Results <notifications@eduxellence.org>',
      to: process.env.ADMIN_NOTIFICATION_EMAIL || 'j.sylvester@eduxellence.org',
      subject,
      html,
    });

    await admin
      .from('signup_notification_outbox')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        attempt_count: attemptCount,
        last_attempt_at: new Date().toISOString(),
      })
      .eq('id', outboxId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('signup-notification dispatch failed:', err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    const backoff = nextBackoff(attemptCount);

    await admin
      .from('signup_notification_outbox')
      .update({
        status: backoff ? 'failed' : 'exhausted',
        attempt_count: attemptCount,
        last_attempt_at: new Date().toISOString(),
        next_attempt_at: backoff,
        last_error: errorMessage,
      })
      .eq('id', outboxId);

    // 200, not 5xx: the failure is durably recorded for retry/investigation;
    // we don't want the caller (pg_net or the cron retry loop) treating
    // this as a transport error and doing its own separate retries.
    return NextResponse.json({ success: false, error: 'Email send failed, logged for retry' }, { status: 200 });
  }
}