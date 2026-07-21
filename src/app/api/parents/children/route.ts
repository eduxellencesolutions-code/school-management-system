import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/parents/children — list all learners linked to the logged-in parent
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: parentAccount, error: parentError } = await supabase
    .from('parent_accounts')
    .select('id, full_name')
    .eq('auth_user_id', user.id)
    .single();

  if (parentError || !parentAccount) {
    return NextResponse.json({ error: 'No parent account found for this user' }, { status: 404 });
  }

  const { data: links, error: linksError } = await supabase
    .from('parent_learner_links')
    .select('learner_id, relationship, learners(id, group_id, organization_id)')
    .eq('parent_id', parentAccount.id);

  if (linksError) {
    return NextResponse.json({ error: linksError.message }, { status: 500 });
  }

  return NextResponse.json({ parent: parentAccount, children: links });
}
