export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import Flutterwave from 'flutterwave-node-v3';
import { createClient } from '@/lib/supabase/server';

const flw = new Flutterwave(
  process.env.FLW_PUBLIC_KEY!,
  process.env.FLW_SECRET_KEY!
);

const PLANS: Record<string, { amount: number; label: string }> = {
  teacher_term: { amount: 1000, label: 'Teacher (per term)' },
  small_school_year: { amount: 10000, label: 'Small School (per year)' },
  standard_school_year: { amount: 20000, label: 'Standard School (per year)' },
  premium_school_year: { amount: 50000, label: 'Premium School (per year)' },
};

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { planKey } = await req.json();
    const plan = PLANS[planKey];

    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const tx_ref = `edux-${user.id}-${Date.now()}`;

    const response = await flw.Payment.initiate({
      tx_ref,
      amount: plan.amount,
      currency: 'NGN',
      redirect_url: 'https://results.eduxellence.org/billing/verify',
      customer: {
        email: user.email || 'customer@example.com',
        name: user.user_metadata?.name || 'Customer',
      },
      customizations: {
        title: 'Eduxellence Results',
        description: plan.label,
      },
      meta: {
        userId: user.id,
        planKey,
      },
    });

    return NextResponse.json({ paymentLink: response.data.link });
  } catch (error) {
    console.error('Payment initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate payment' },
      { status: 500 }
    );
  }
}
