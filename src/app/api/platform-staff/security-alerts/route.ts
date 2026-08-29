import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function GET() {
  const supabase = await createClient();
  const { user } = await getAuthenticatedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');
  if (!isSuperAdmin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const { data: alerts, error } = await supabase
    .from('security_alerts')
    .select('id, alert_type, severity, description, status, created_at')
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ alerts: alerts ?? [] });
}