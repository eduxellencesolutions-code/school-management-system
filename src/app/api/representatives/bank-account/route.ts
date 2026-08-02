import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: rep, error: repError } = await supabase
    .from('representatives')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (repError || !rep) return NextResponse.json({ error: 'You do not have representative access' }, { status: 403 });

  const body = await request.json();
  const { bankName, bankCode, accountNumber, accountName } = body;

  if (!bankName || !accountNumber || !accountName) {
    return NextResponse.json({ error: 'bankName, accountNumber, and accountName are required' }, { status: 400 });
  }

  // Only one primary account per rep — unset any existing primary first
  // (the partial unique index from Step 1 enforces this at the DB level too)
  await supabase
    .from('bank_accounts')
    .update({ is_primary: false })
    .eq('representative_id', rep.id);

  const { data: bankAccount, error } = await supabase
    .from('bank_accounts')
    .insert({
      representative_id: rep.id,
      bank_name: bankName,
      bank_code: bankCode ?? null,
      account_number: accountNumber,
      account_name: accountName,
      is_primary: true,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, bankAccountId: bankAccount.id });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: rep } = await supabase
    .from('representatives')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!rep) return NextResponse.json({ error: 'You do not have representative access' }, { status: 403 });

  const { data: bankAccounts } = await supabase
    .from('bank_accounts')
    .select('id, bank_name, account_number, account_name, is_primary, is_verified')
    .eq('representative_id', rep.id)
    .order('created_at', { ascending: false });

  return NextResponse.json({ bankAccounts: bankAccounts ?? [] });
}