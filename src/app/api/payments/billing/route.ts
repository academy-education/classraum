import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';
import { chargeBillingKey } from '@/lib/portone-charge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { billingKey, amount, planName, userId } = body;

    if (!billingKey || !amount || !planName || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate that the amount matches a known plan price
    const validAmounts = Object.values(SUBSCRIPTION_PLANS).flatMap(plan => [
      plan.monthlyPrice,
      plan.yearlyPrice,
    ]).filter(price => price > 0);

    if (!validAmounts.includes(amount)) {
      console.error('[Billing] Invalid payment amount:', amount, 'Valid amounts:', validAmounts);
      return NextResponse.json(
        { error: 'Invalid payment amount' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify authenticated user matches the userId being charged
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized - user mismatch' },
        { status: 401 }
      );
    }

    // Generate unique payment ID for subscription payment
    const paymentId = `subscription_${userId}_${Date.now()}`;

    console.log('[Billing] Processing payment:', { paymentId, amount, planName });

    // Charge via the shared helper: it hits the correct V2 endpoint
    // (POST /payments/{id}/billing-key), pulls the buyer's name/email/phone
    // (Inicis REQUIRES them), and detects success from the HTTP status.
    const charge = await chargeBillingKey({
      billingKey,
      paymentId,
      amount,
      orderName: `${planName} 구독`,
      customerId: userId,
      customData: { userId, planName, subscriptionPayment: true },
    });

    if (!charge.ok) {
      return NextResponse.json(
        { error: 'Payment failed', details: charge.message ?? charge.code },
        { status: 400 }
      );
    }

    // Update subscription status to active
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        last_payment_at: new Date().toISOString(),
        next_payment_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      })
      .eq('billing_key', billingKey)
      .eq('user_id', userId);

    if (subscriptionError) {
      console.error('Failed to update subscription:', subscriptionError);
      return NextResponse.json(
        { error: 'Failed to update subscription status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentId: paymentId,
      status: 'paid'
    });

  } catch (error) {
    console.error('Billing payment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}