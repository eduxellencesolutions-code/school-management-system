import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');
  if (!isSuperAdmin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const admin = createAdminClient();
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 86400000).toISOString();

  const [{ data: expiring }, { data: criticalTickets }, { data: pendingCommissions }, { data: unassignedTickets }] = await Promise.all([
    admin.from('organizations').select('id, name, subscription_expires_at').not('subscription_expires_at', 'is', null).lte('subscription_expires_at', in7Days).gte('subscription_expires_at', now.toISOString()),
    admin.from('support_tickets').select('id, subject').eq('priority', 'critical').not('status', 'in', '(resolved,closed)'),
    admin.from('commissions').select('id, amount').eq('status', 'pending'),
    admin.from('support_tickets').select('id, subject').is('assigned_to', null).not('status', 'in', '(resolved,closed)'),
  ]);

  const items = [
    ...(expiring ?? []).map(o => ({ severity: 'amber', label: `${o.name} expires ${new Date(o.subscription_expires_at).toLocaleDateString('en-NG')}`, href: `/schools/${o.id}` })),
    ...(criticalTickets ?? []).map(t => ({ severity: 'red', label: `Critical ticket: ${t.subject}`, href: `/support?ticket=${t.id}` })),
    ...(unassignedTickets ?? []).map(t => ({ severity: 'amber', label: `Unassigned: ${t.subject}`, href: `/support?ticket=${t.id}` })),
  ];

  return NextResponse.json({
    items,
    summary: {
      expiringSoon: (expiring ?? []).length,
      criticalTickets: (criticalTickets ?? []).length,
      unassignedTickets: (unassignedTickets ?? []).length,
      pendingCommissionsCount: (pendingCommissions ?? []).length,
      pendingCommissionsTotal: (pendingCommissions ?? []).reduce((s, c) => s + c.amount, 0),
    },
  });
}