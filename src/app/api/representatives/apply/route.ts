import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const admin = createAdminClient();
  const body = await request.json();
  const { fullName, email, phone, state } = body;

  if (!fullName || !email) {
    return NextResponse.json({ error: 'Full name and email are required' }, { status: 400 });
  }

  const { data: codeResult } = await admin.rpc('generate_referral_code', { p_name: fullName, p_state: state ?? '' });
  const referralCode = codeResult as string;

  const { data: rep, error } = await admin
    .from('representatives')
    .insert({ user_id: user.id, full_name: fullName, email, phone: phone ?? null, referral_code: referralCode, territory_state: state ?? null })
    .select('id, referral_code')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, referralCode: rep.referral_code });
}