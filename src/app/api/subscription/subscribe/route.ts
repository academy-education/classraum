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
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get manager's academy
    const { data: manager, error: managerError } = await supabase
      .from('managers')
      .select('academy_id')
      .eq('user_id', user.id)
      .single();

    if (managerError || !manager) {
      return NextResponse.json(
        { success: false, message: 'Manager not found' },
        { status: 403 }
      );
    }

    const academyId = manager.academy_id;

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
    const validTiers = ['basic', 'pro', 'enterprise'];
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

    let subscriptionId: string;
    let proratedCharge: number | null = null;
    let isUpgrade = false;
    const isDowngrade = false;

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
      // Create new subscription
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

    // Update academy tier
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

    // Make initial payment if requested
    let initialPaymentResult = null;
    if (makeInitialPayment) {
      const config = getPortOneConfig();
      const paymentId = `subscription_${subscriptionId}_${isUpgrade ? 'upgrade' : 'initial'}_${Date.now()}`;

      // For upgrades, charge the prorated amount. For new subscriptions, charge full amount
      const amountToCharge = isUpgrade && proratedCharge !== null ? proratedCharge : monthlyAmount;
      const orderName = isUpgrade
        ? `${plan.name} 플랜 업그레이드 (차액)`
        : `${plan.name} 구독 - ${billingCycle === 'monthly' ? '월간' : '연간'}`;

      try {
        const paymentResponse = await fetch(
          `https://api.portone.io/payments/${encodeURIComponent(paymentId)}/billing-key`,
          {
            method: 'POST',
            headers: {
              'Authorization': `PortOne ${config.apiSecret}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              billingKey,
              orderName,
              customer: {
                name: {
                  full: 'Academy Manager',
                },
              },
              amount: {
                total: amountToCharge,
              },
              currency: 'KRW',
            }),
          }
        );

        if (paymentResponse.ok) {
          const paymentData = await paymentResponse.json();

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

          // Create subscription invoice
          await supabase
            .from('subscription_invoices')
            .insert({
              academy_id: academyId,
              subscription_id: subscriptionId,
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

          // Update subscription with payment info
          await supabase
            .from('academy_subscriptions')
            .update({
              last_payment_date: now.toISOString(),
              kg_subscription_id: subscriptionId, // Using our subscription ID
            })
            .eq('id', subscriptionId);

          initialPaymentResult = {
            success: true,
            paymentId,
            amountCharged: amountToCharge,
            isProrated: isUpgrade && proratedCharge !== null,
          };
        } else {
          const errorData = await paymentResponse.json();
          console.error('Initial payment failed:', errorData);
          initialPaymentResult = { success: false, error: errorData };
        }
      } catch (paymentError) {
        console.error('Error making initial payment:', paymentError);
        initialPaymentResult = {
          success: false,
          error: paymentError instanceof Error ? paymentError.message : 'Unknown error'
        };
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
