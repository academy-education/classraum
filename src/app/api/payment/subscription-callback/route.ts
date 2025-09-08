import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { KGPaymentRequest, SubscriptionTier, BillingCycle } from '@/types/subscription';
import crypto from 'crypto';

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// KG Payment configuration
const KG_MID = process.env.KG_MID || '';
const KG_MERCHANT_KEY = process.env.KG_MERCHANT_KEY || '';

/**
 * Verify KG payment hash
 */
function verifyKGPaymentHash(params: KGPaymentRequest): boolean {
  if (!params.P_HASH) return false;

  // KG Payment hash verification logic
  // This should match KG's documentation for hash verification
  const hashString = `${KG_MID}${params.P_OID}${params.P_AMT}${KG_MERCHANT_KEY}`;
  const expectedHash = crypto
    .createHash('sha256')
    .update(hashString)
    .digest('hex')
    .toUpperCase();

  return params.P_HASH === expectedHash;
}

/**
 * Parse plan details from payment order ID
 * Format: SUB_[academyId]_[tier]_[cycle]_[timestamp]
 */
function parseOrderId(orderId: string) {
  const parts = orderId.split('_');
  if (parts[0] !== 'SUB' || parts.length < 4) {
    throw new Error('Invalid order ID format');
  }

  return {
    academyId: parts[1],
    tier: parts[2] as SubscriptionTier,
    cycle: parts[3] as BillingCycle,
  };
}

/**
 * Calculate subscription period dates
 */
function calculateSubscriptionPeriod(billingCycle: BillingCycle) {
  const now = new Date();
  const periodStart = new Date(now);
  const periodEnd = new Date(now);

  if (billingCycle === 'monthly') {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  }

  return { periodStart, periodEnd };
}

export async function POST(request: NextRequest) {
  try {
    // Parse KG payment callback data
    const params: KGPaymentRequest = await request.json();
    
    console.log('KG Payment Callback received:', {
      status: params.P_STATUS,
      orderId: params.P_OID,
      amount: params.P_AMT,
      transactionId: params.P_TID,
    });

    // Verify payment hash (security check)
    if (!verifyKGPaymentHash(params)) {
      console.error('Invalid payment hash');
      return NextResponse.json(
        { success: false, message: 'Invalid payment hash' },
        { status: 400 }
      );
    }

    // Check payment status
    if (params.P_STATUS !== '00') {
      console.error('Payment failed:', params.P_RMESG1);
      
      // Update invoice as failed
      await supabaseAdmin
        .from('subscription_invoices')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          failure_reason: params.P_RMESG1 || 'Payment failed',
        })
        .eq('kg_order_id', params.P_OID);

      return NextResponse.json(
        { success: false, message: params.P_RMESG1 || 'Payment failed' },
        { status: 200 } // Return 200 to acknowledge receipt
      );
    }

    // Parse order details
    const { academyId, tier, cycle } = parseOrderId(params.P_OID);
    
    // Get subscription plan details
    const { periodStart, periodEnd } = calculateSubscriptionPeriod(cycle);
    const amount = parseInt(params.P_AMT);

    // Start a transaction-like operation
    // 1. Check if academy exists
    const { data: academy, error: academyError } = await supabaseAdmin
      .from('academies')
      .select('id, name, subscription_tier')
      .eq('id', academyId)
      .single();

    if (academyError || !academy) {
      console.error('Academy not found:', academyId);
      return NextResponse.json(
        { success: false, message: 'Academy not found' },
        { status: 404 }
      );
    }

    // 2. Create or update subscription
    const subscriptionData = {
      academy_id: academyId,
      plan_tier: tier,
      status: 'active' as const,
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      kg_subscription_id: params.P_TID,
      kg_customer_id: params.P_CARD_MEMBER_NUM || params.P_MID,
      last_payment_date: new Date().toISOString(),
      next_billing_date: periodEnd.toISOString(),
      monthly_amount: amount,
      billing_cycle: cycle,
      auto_renew: true,
      // Set limits based on tier (you can import SUBSCRIPTION_PLANS for this)
      student_limit: tier === 'basic' ? 100 : tier === 'pro' ? 500 : tier === 'enterprise' ? -1 : 20,
      teacher_limit: tier === 'basic' ? 10 : tier === 'pro' ? 50 : tier === 'enterprise' ? -1 : 2,
      storage_limit_gb: tier === 'basic' ? 10 : tier === 'pro' ? 50 : tier === 'enterprise' ? -1 : 1,
      features_enabled: {
        tier: tier,
        activatedAt: new Date().toISOString(),
      },
    };

    const { data: subscription, error: subError } = await supabaseAdmin
      .from('academy_subscriptions')
      .upsert(subscriptionData, {
        onConflict: 'academy_id',
      })
      .select()
      .single();

    if (subError) {
      console.error('Failed to create/update subscription:', subError);
      return NextResponse.json(
        { success: false, message: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    // 3. Create subscription invoice record
    const invoiceData = {
      academy_id: academyId,
      subscription_id: subscription.id,
      kg_transaction_id: params.P_TID,
      kg_payment_key: params.P_AUTH_NO,
      kg_order_id: params.P_OID,
      kg_auth_date: params.P_AUTH_DT,
      amount: amount,
      currency: 'KRW',
      status: 'paid' as const,
      paid_at: new Date().toISOString(),
      billing_period_start: periodStart.toISOString(),
      billing_period_end: periodEnd.toISOString(),
      plan_tier: tier,
      billing_cycle: cycle,
      metadata: {
        cardIssuer: params.P_CARD_ISSUER,
        cardNum: params.P_CARD_NUM,
        paymentType: params.P_TYPE,
      },
    };

    const { error: invoiceError } = await supabaseAdmin
      .from('subscription_invoices')
      .insert(invoiceData);

    if (invoiceError) {
      console.error('Failed to create invoice:', invoiceError);
      // Don't fail the whole transaction, invoice can be retried
    }

    // 4. Update academy subscription tier
    const { error: updateError } = await supabaseAdmin
      .from('academies')
      .update({
        subscription_tier: tier,
        is_suspended: false,
        suspended_at: null,
        suspension_reason: null,
      })
      .eq('id', academyId);

    if (updateError) {
      console.error('Failed to update academy tier:', updateError);
    }

    // 5. Initialize or update usage tracking
    const usageData = {
      academy_id: academyId,
      calculated_at: new Date().toISOString(),
    };

    await supabaseAdmin
      .from('subscription_usage')
      .upsert(usageData, {
        onConflict: 'academy_id',
      });

    // 6. Create notification for academy manager
    const { data: managers } = await supabaseAdmin
      .from('managers')
      .select('user_id')
      .eq('academy_id', academyId)
      .eq('active', true);

    if (managers && managers.length > 0) {
      const notifications = managers.map(manager => ({
        user_id: manager.user_id,
        title: '구독이 활성화되었습니다',
        message: `${tier === 'basic' ? '베이직' : tier === 'pro' ? '프로' : '엔터프라이즈'} 플랜이 성공적으로 활성화되었습니다.`,
        type: 'billing',
        title_key: 'notifications.subscription.activated.title',
        message_key: 'notifications.subscription.activated.message',
        title_params: {},
        message_params: { tier },
        navigation_data: {
          page: 'settings',
          section: 'subscription',
        },
      }));

      await supabaseAdmin
        .from('notifications')
        .insert(notifications);
    }

    console.log('Subscription activated successfully:', {
      academyId,
      tier,
      cycle,
      subscriptionId: subscription.id,
    });

    // Return success response to KG
    return NextResponse.json({
      success: true,
      message: 'Subscription activated successfully',
      transactionId: params.P_TID,
      receiptUrl: `/api/payment/receipt/${params.P_TID}`,
    });

  } catch (error) {
    console.error('Subscription callback error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}