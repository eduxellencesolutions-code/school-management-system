import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Get the user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the plan from the request
    const { planKey } = await request.json();
    
    // Define available plans
    const PLANS: Record<string, { amount: number; label: string; durationDays: number }> = {
      teacher_term: { amount: 1000, label: 'Teacher (per term)', durationDays: 90 },
      small_school_year: { amount: 10000, label: 'Small School (per year)', durationDays: 365 },
      standard_school_year: { amount: 20000, label: 'Standard School (per year)', durationDays: 365 },
      premium_school_year: { amount: 50000, label: 'Premium School (per year)', durationDays: 365 },
    };

    const plan = PLANS[planKey];
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Initialize Flutterwave
    const Flutterwave = require('flutterwave-node-v3');
    const flw = new Flutterwave(
      process.env.FLW_PUBLIC_KEY,
      process.env.FLW_SECRET_KEY
    );

    // Generate a unique transaction reference
    const tx_ref = `edux-${user.id}-${Date.now()}`;

    // Prepare the payment payload
    const payload = {
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
    };

    // Initiate payment
    const response = await flw.Payment.initiate(payload);

    // Return the payment link to the frontend
    return NextResponse.json({
      paymentLink: response.data.link,
      tx_ref,
    });

  } catch (error) {
    console.error('Payment initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate payment' },
      { status: 500 }
    );
  }
}