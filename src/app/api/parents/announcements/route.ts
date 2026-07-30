import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // ✅ Get parent account with organization_id
  const { data: parentAccount } = await supabase
    .from('parent_accounts')
    .select('id, organization_id')
    .eq('auth_user_id', user.id)
    .single();

  if (!parentAccount) {
    return NextResponse.json({ error: 'No parent account found' }, { status: 404 });
  }

  // ✅ Include both org-specific AND platform-wide announcements
  const { data: announcements, error } = await supabase
    .from('announcements')
    .select('id, title, body, created_at, expires_at, audience, organization_id')
    .or(`organization_id.eq.${parentAccount.organization_id},organization_id.is.null`)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ announcements: announcements ?? [] });
}