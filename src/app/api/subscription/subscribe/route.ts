import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPortOneConfig } from '@/lib/portone-config';
import {
  getTierChangeType,
  calculateUpgradeProration,
  formatKRW,
} from '@/lib/proration';

export async function POST(request: NextRequest) {
  try {
    // Check for Authorization header first (for client-side calls)
    const authHeader = request.headers.get('authorization');
    let supabase;
    let user = null;
    let authError = null;

    if (authHeader?.startsWith('Bearer ')) {
      // Use the token from Authorization header - create a client with this token
      const token = authHeader.substring(7);
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
      supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      );
      const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser();
      user = tokenUser;
      authError = tokenError;
    } else {
      // Fall back to cookies (for SSR)
      supabase = await createClient();
      const { data: { user: cookieUser }, error: cookieError } = await supabase.auth.getUser();
      user = cookieUser;
      authError = cookieError;
    }

    console.log('[SUBSCRIBE API] Auth check:', {
      hasUser: !!user,
      userId: user?.id,
      authError: authError?.message,
      hasAuthHeader: !!authHeader,
      cookies: request.cookies.getAll().map(c => ({ name: c.name, hasValue: !!c.value }))
    });

    if (authError || !user) {
      console.error('[SUBSCRIBE API] Unauthorized:', authError);
      return NextResponse.json(
        { success: false, message: 'Unauthorized', debug: { authError: authError?.message } },
        { status: 401 }
      );
    }

    // Get manager's academy and phone (use limit(1) to handle multiple records)
    const { data: managers, error: managerError } = await supabase
      .from('managers')
      .select('academy_id, phone')
      .eq('user_id', user.id)
      .limit(1);

    const manager = managers?.[0];

    // Get user's name from users table
    const { data: userData } = await supabase
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single();

    console.log('[SUBSCRIBE API] Manager lookup:', {
      userId: user.id,
      hasManager: !!manager,
      managerCount: managers?.length || 0,
      managerError: managerError?.message,
      managerData: manager,
      userEmail: user.email,
      userPhone: manager?.phone,
      userName: userData?.name
    });

    if (managerError || !manager) {
      console.error('[SUBSCRIBE API] Manager not found:', { userId: user.id, error: managerError });
      return NextResponse.json(
        { success: false, message: 'Manager not found', debug: { userId: user.id, error: managerError?.message, managerCount: managers?.length || 0 } },
        { status: 403 }
      );
    }

    const academyId = manager.academy_id;
    const userEmail = user.email || 'no-email@example.com';
    const userPhone = manager.phone || '010-0000-0000';
    const userName = userData?.name || 'Academy Manager';

    // Parse request body
    const body = await request.json();
    const { billingKey, planTier, billingCycle, makeInitialPayment } = body;

    if (!billingKey || !planTier || !billingCycle) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate plan tier
    const validTiers = ['individual', 'basic', 'pro', 'enterprise'];
    if (!validTiers.includes(planTier)) {
      return NextResponse.json(
        { success: false, message: 'Invalid plan tier' },
        { status: 400 }
      );
    }

    // Get plan details
    const { SUBSCRIPTION_PLANS } = await import('@/types/subscription');
    const plan = SUBSCRIPTION_PLANS[planTier as keyof typeof SUBSCRIPTION_PLANS];

    const monthlyAmount = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;

    // Calculate subscription period
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    const nextBillingDate = new Date(periodEnd);

    // Check if subscription already exists
    const { data: existingSub, error: checkError } = await supabase
      .from('academy_subscriptions')
      .select('*')
      .eq('academy_id', academyId)
      .maybeSingle();

    let subscriptionId: string | null = null;
    let proratedCharge: number | null = null;
    let isUpgrade = false;
    const isDowngrade = false;
    let shouldCreateSubscriptionAfterPayment = false;

    if (existingSub) {
      // Existing subscription - detect if this is an upgrade or downgrade
      const changeType = getTierChangeType(existingSub.plan_tier, planTier);

      if (changeType === 'downgrade') {
        // For downgrades, redirect to the downgrade endpoint
        return NextResponse.json(
          {
            success: false,
            message: 'Please use the downgrade endpoint for plan downgrades',
            redirectTo: '/api/subscription/downgrade',
            isDowngrade: true,
          },
          { status: 400 }
        );
      }

      if (changeType === 'upgrade') {
        // Calculate prorated amount for upgrade
        isUpgrade = true;
        const prorationDetails = calculateUpgradeProration(
          existingSub.monthly_amount,
          monthlyAmount,
          existingSub.current_period_start,
          existingSub.current_period_end
        );

        proratedCharge = prorationDetails.proratedAmount;

        console.log(`[SUBSCRIBE] Upgrade detected: ${existingSub.plan_tier} → ${planTier}`);
        console.log(`[SUBSCRIBE] Prorated charge: ${formatKRW(proratedCharge)} for ${prorationDetails.daysRemaining} days`);

        // For upgrades: Update immediately but KEEP existing billing dates
        const { error: updateError } = await supabase
          .from('academy_subscriptions')
          .update({
            billing_key: billingKey,
            billing_key_issued_at: now.toISOString(),
            plan_tier: planTier,
            status: 'active',
            // IMPORTANT: Keep existing billing dates for fair proration
            // current_period_start: existingSub.current_period_start (unchanged)
            // current_period_end: existingSub.current_period_end (unchanged)
            // next_billing_date: existingSub.next_billing_date (unchanged)
            monthly_amount: monthlyAmount,
            billing_cycle: billingCycle,
            auto_renew: true,
            total_user_limit: plan.limits.totalUserLimit,
            storage_limit_gb: plan.limits.storageGb,
            features_enabled: plan.features,
            // Clear any pending downgrades
            pending_tier: null,
            pending_monthly_amount: null,
            pending_change_effective_date: null,
            updated_at: now.toISOString(),
          })
          .eq('academy_id', academyId);

        if (updateError) {
          console.error('Error updating subscription:', updateError);
          return NextResponse.json(
            { success: false, message: 'Failed to update subscription' },
            { status: 500 }
          );
        }

        subscriptionId = existingSub.id;
      } else {
        // Same tier - just update billing key and settings
        const { error: updateError } = await supabase
          .from('academy_subscriptions')
          .update({
            billing_key: billingKey,
            billing_key_issued_at: now.toISOString(),
            status: 'active',
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            next_billing_date: nextBillingDate.toISOString(),
            monthly_amount: monthlyAmount,
            billing_cycle: billingCycle,
            auto_renew: true,
            updated_at: now.toISOString(),
          })
          .eq('academy_id', academyId);

        if (updateError) {
          console.error('Error updating subscription:', updateError);
          return NextResponse.json(
            { success: false, message: 'Failed to update subscription' },
            { status: 500 }
          );
        }

        subscriptionId = existingSub.id;
      }
    } else {
      // New subscription - if payment is required, create AFTER payment succeeds
      if (makeInitialPayment) {
        console.log('[SUBSCRIBE] New subscription with payment - will create after payment succeeds');
        shouldCreateSubscriptionAfterPayment = true;
        // Don't create subscription yet - wait for payment to succeed
      } else {
        // Create new subscription immediately (no payment required)
        const { data: newSub, error: insertError } = await supabase
          .from('academy_subscriptions')
          .insert({
            academy_id: academyId,
            billing_key: billingKey,
            billing_key_issued_at: now.toISOString(),
            plan_tier: planTier,
            status: 'active',
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            next_billing_date: nextBillingDate.toISOString(),
            monthly_amount: monthlyAmount,
            billing_cycle: billingCycle,
            auto_renew: true,
            total_user_limit: plan.limits.totalUserLimit,
            storage_limit_gb: plan.limits.storageGb,
            features_enabled: plan.features,
          })
          .select('id')
          .single();

        if (insertError || !newSub) {
          console.error('Error creating subscription:', insertError);
          return NextResponse.json(
            { success: false, message: 'Failed to create subscription' },
            { status: 500 }
          );
        }

        subscriptionId = newSub.id;
      }
    }

    // Make initial payment if requested (do this BEFORE creating subscription for new subs)
    let initialPaymentResult = null;
    if (makeInitialPayment) {
      const config = getPortOneConfig();
      console.log('[SUBSCRIBE] DEBUG - Raw env value:', process.env.PORTONE_API_SECRET?.substring(0, 30));
      console.log('[SUBSCRIBE] DEBUG - Config value:', config.apiSecret?.substring(0, 30));

      // Generate payment ID (remove "temp" prefix - use academy ID for merchant transaction ID)
      const shortAcademyId = academyId.slice(0, 8);
      const timestamp = Date.now();
      const paymentId = subscriptionId
        ? `sub_${subscriptionId.slice(0, 8)}_${isUpgrade ? 'up' : 'new'}_${timestamp}`
        : `acad_${shortAcademyId}_${isUpgrade ? 'up' : 'new'}_${timestamp}`;

      // For upgrades, charge the prorated amount. For new subscriptions, charge full amount
      const amountToCharge = isUpgrade && proratedCharge !== null ? proratedCharge : monthlyAmount;
      const orderName = isUpgrade
        ? `${plan.name} 플랜 업그레이드 (차액)`
        : `${plan.name} 구독 - ${billingCycle === 'monthly' ? '월간' : '연간'}`;

      console.log('[SUBSCRIBE] Making billing key payment:', {
        paymentId,
        billingKey: billingKey ? billingKey.substring(0, 20) + '...' : 'NONE',
        amount: amountToCharge,
        orderName,
        isNewSubscription: shouldCreateSubscriptionAfterPayment
      });

      try {
        const requestBody = {
          billingKey,
          orderName,
          customer: {
            id: `academy_${academyId}`,
            name: {
              full: userName,
            },
            email: userEmail,
            phoneNumber: userPhone,
          },
          amount: {
            total: amountToCharge,
          },
          currency: 'KRW',
        };

        console.log('[SUBSCRIBE] Payment request:', {
          url: `https://api.portone.io/payments/${encodeURIComponent(paymentId)}/billing-key`,
          authHeader: `PortOne ${config.apiSecret.substring(0, 20)}...`,
          body: requestBody,
        });

        const paymentResponse = await fetch(
          `https://api.portone.io/payments/${encodeURIComponent(paymentId)}/billing-key`,
          {
            method: 'POST',
            headers: {
              'Authorization': `PortOne ${config.apiSecret}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          }
        );

        console.log('[SUBSCRIBE] Payment response status:', paymentResponse.status);
        const responseText = await paymentResponse.text();
        console.log('[SUBSCRIBE] Payment response body:', responseText);

        if (paymentResponse.ok) {
          const paymentData = JSON.parse(responseText);
          console.log('[SUBSCRIBE] ✅ Payment successful:', paymentData);

          // Now create the subscription if we were waiting for payment
          if (shouldCreateSubscriptionAfterPayment) {
            console.log('[SUBSCRIBE] Creating subscription after successful payment');
            const { data: newSub, error: insertError } = await supabase
              .from('academy_subscriptions')
              .insert({
                academy_id: academyId,
                billing_key: billingKey,
                billing_key_issued_at: now.toISOString(),
                plan_tier: planTier,
                status: 'active',
                current_period_start: now.toISOString(),
                current_period_end: periodEnd.toISOString(),
                next_billing_date: nextBillingDate.toISOString(),
                monthly_amount: monthlyAmount,
                billing_cycle: billingCycle,
                auto_renew: true,
                total_user_limit: plan.limits.totalUserLimit,
                storage_limit_gb: plan.limits.storageGb,
                features_enabled: plan.features,
                last_payment_date: now.toISOString(),
              })
              .select('id')
              .single();

            if (insertError || !newSub) {
              console.error('[SUBSCRIBE] Error creating subscription after payment:', insertError);
              return NextResponse.json(
                { success: false, message: 'Payment succeeded but subscription creation failed. Please contact support.' },
                { status: 500 }
              );
            }

            subscriptionId = newSub.id;
            console.log('[SUBSCRIBE] ✅ Subscription created:', subscriptionId);
          }

          // Get billing period dates (for upgrades, use existing period)
          let billingPeriodStart: string;
          let billingPeriodEnd: string;

          if (isUpgrade && existingSub) {
            billingPeriodStart = existingSub.current_period_start;
            billingPeriodEnd = existingSub.current_period_end;
          } else {
            billingPeriodStart = now.toISOString();
            billingPeriodEnd = periodEnd.toISOString();
          }

          // Create subscription invoice (subscriptionId now guaranteed to exist)
          await supabase
            .from('subscription_invoices')
            .insert({
              academy_id: academyId,
              subscription_id: subscriptionId!,
              amount: amountToCharge,
              currency: 'KRW',
              status: 'paid',
              paid_at: now.toISOString(),
              billing_period_start: billingPeriodStart,
              billing_period_end: billingPeriodEnd,
              plan_tier: planTier,
              billing_cycle: billingCycle,
              kg_transaction_id: paymentId,
              metadata: isUpgrade ? {
                is_upgrade: true,
                prorated_amount: proratedCharge,
                full_monthly_amount: monthlyAmount,
              } : undefined,
            });

          // Update subscription with payment info (only if not newly created with last_payment_date)
          if (!shouldCreateSubscriptionAfterPayment) {
            await supabase
              .from('academy_subscriptions')
              .update({
                last_payment_date: now.toISOString(),
                kg_subscription_id: subscriptionId!, // Using our subscription ID
              })
              .eq('id', subscriptionId!);
          }

          initialPaymentResult = {
            success: true,
            paymentId,
            amountCharged: amountToCharge,
            isProrated: isUpgrade && proratedCharge !== null,
          };
        } else {
          const errorData = JSON.parse(responseText);
          console.error('[SUBSCRIBE] ❌ Payment failed:', {
            status: paymentResponse.status,
            statusText: paymentResponse.statusText,
            errorData
          });
          initialPaymentResult = { success: false, error: errorData };

          // If this was a new subscription, payment failure means no subscription created - return error
          if (shouldCreateSubscriptionAfterPayment) {
            return NextResponse.json({
              success: false,
              message: 'Payment failed. Subscription not created.',
              error: errorData,
            }, { status: 400 });
          }
        }
      } catch (paymentError) {
        console.error('Error making initial payment:', paymentError);
        initialPaymentResult = {
          success: false,
          error: paymentError instanceof Error ? paymentError.message : 'Unknown error'
        };

        // If this was a new subscription, payment failure means no subscription created - return error
        if (shouldCreateSubscriptionAfterPayment) {
          return NextResponse.json({
            success: false,
            message: 'Payment error. Subscription not created.',
            error: paymentError instanceof Error ? paymentError.message : 'Unknown error',
          }, { status: 500 });
        }
      }
    }

    // Update academy tier (only if subscription was created)
    if (subscriptionId) {
      const { error: academyUpdateError } = await supabase
        .from('academies')
        .update({
          subscription_tier: planTier,
          updated_at: now.toISOString(),
        })
        .eq('id', academyId);

      if (academyUpdateError) {
        console.error('Error updating academy tier:', academyUpdateError);
      }
    }

    // Get the next billing date (for upgrades, use existing date)
    const responseNextBillingDate = isUpgrade && existingSub
      ? existingSub.next_billing_date
      : nextBillingDate.toISOString();

    return NextResponse.json({
      success: true,
      data: {
        subscriptionId,
        planTier,
        billingCycle,
        monthlyAmount,
        nextBillingDate: responseNextBillingDate,
        initialPayment: initialPaymentResult,
        isUpgrade,
        proratedAmount: proratedCharge,
        keptExistingBillingDate: isUpgrade,
      },
    });

  } catch (error) {
    console.error('Subscribe API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: '구독 처리 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
