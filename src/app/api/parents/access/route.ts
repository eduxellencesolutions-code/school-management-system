import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

// POST /api/parents/access
// Body: { code }
// Public endpoint — no auth required to call this, since this IS the login mechanism.
// Resolves an access code to a parent, then issues a one-time sign-in link for their
// real (never-seen) auth identity.
export async function POST(request: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const body = await request.json();
  const code = (body.code ?? '').toString().trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ error: 'Please enter an access code' }, { status: 400 });
  }

  const { data: parent, error: parentError } = await supabase
    .from('parent_accounts')
    .select('id, full_name, auth_user_id, access_code_active')
    .eq('access_code', code)
    .maybeSingle();

  if (parentError || !parent) {
    return NextResponse.json({ error: 'Invalid access code' }, { status: 404 });
  }

  if (!parent.access_code_active) {
    return NextResponse.json(
      { error: 'This access code has been disabled. Please contact your school for a new one.' },
      { status: 403 }
    );
  }

  if (!parent.auth_user_id) {
    return NextResponse.json(
      { error: 'This parent account is not fully set up yet. Please contact your school.' },
      { status: 500 }
    );
  }

  // Look up the ghost email tied to this auth identity, so we can generate a sign-in link for it
  const { data: authUser, error: authLookupError } = await admin.auth.admin.getUserById(parent.auth_user_id);

  if (authLookupError || !authUser?.user?.email) {
    return NextResponse.json({ error: 'Could not resolve parent identity' }, { status: 500 });
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: authUser.user.email,
  });

  if (linkError || !linkData?.properties?.action_link) {
    return NextResponse.json({ error: 'Could not generate sign-in session' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    actionLink: linkData.properties.action_link,
    parentName: parent.full_name,
  });
}
