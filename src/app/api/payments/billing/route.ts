import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { billingKey, amount, planName, userId } = body;

    // Debug logging
    console.log('Billing API - Received amount:', amount, 'for plan:', planName);

    if (!billingKey || !amount || !planName || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Generate unique payment ID for subscription payment
    const paymentId = `subscription_${userId}_${Date.now()}`;

    // Debug logging before PortOne API call
    console.log('Sending to PortOne - Amount:', amount, 'PaymentId:', paymentId);

    // Make payment using billing key
    const paymentResponse = await fetch('https://api.portone.io/v2/payments/billing-key', {
      method: 'POST',
      headers: {
        'Authorization': `PortOne ${process.env.PORTONE_API_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storeId: process.env.PORTONE_STORE_ID,
        billingKey: billingKey,
        paymentId: paymentId,
        orderName: `${planName} 구독`,
        amount: {
          total: amount,
          currency: 'KRW'
        },
        customer: {
          id: userId
        },
        customData: {
          userId: userId,
          planName: planName,
          subscriptionPayment: true
        }
      })
    });

    const paymentResult = await paymentResponse.json();

    if (!paymentResponse.ok || paymentResult.status !== 'PAID') {
      return NextResponse.json(
        { error: 'Payment failed', details: paymentResult },
        { status: 400 }
      );
    }

    // Save payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        payment_id: paymentId,
        user_id: userId,
        amount: amount,
        currency: 'KRW',
        status: 'paid',
        payment_method: 'subscription',
        order_name: `${planName} 구독`,
        created_at: new Date().toISOString()
      });

    if (paymentError) {
      console.error('Failed to save payment:', paymentError);
      return NextResponse.json(
        { error: 'Failed to save payment record' },
        { status: 500 }
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