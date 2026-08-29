import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function GET() {
  const supabase = await createClient();

  const { user } = await getAuthenticatedUser(supabase);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: parentAccount } = await supabase
    .from('parent_accounts')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!parentAccount) {
    return NextResponse.json({ error: 'No parent account found' }, { status: 404 });
  }

  // RLS already scopes this correctly: platform-wide rows, plus rows
  // belonging to the organizations of this parent's linked children.
  const { data: rows, error } = await supabase
    .from('announcements')
    .select('id, title, body, created_at, expires_at, audience, organization_id')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = Date.now();
  const announcements = (rows ?? []).filter(a => !a.expires_at || new Date(a.expires_at).getTime() > now);

  return NextResponse.json({ announcements });
}