import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPortOneConfig } from '@/lib/portone-config';

// Create admin client with service role key for cron operations
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

export async function GET(req: NextRequest) {
  try {
    // Verify this is actually a Vercel cron job
    const userAgent = req.headers.get('user-agent');
    if (process.env.NODE_ENV === 'production' && userAgent !== 'vercel-cron/1.0') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];
    console.log(`[SUBSCRIPTION-BILLING] Starting billing cycle for ${today}`);

    // Get all active subscriptions that need to be billed today or are overdue
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('academy_subscriptions')
      .select('*')
      .eq('status', 'active')
      .eq('auto_renew', true)
      .lte('next_billing_date', today);

    if (subError) {
      console.error('[SUBSCRIPTION-BILLING] Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`[SUBSCRIPTION-BILLING] No subscriptions due today (${today}). Skipping processing.`);
      return NextResponse.json({
        success: true,
        date: today,
        subscriptionsFound: 0,
        subscriptionsProcessed: 0,
        totalPayments: 0,
        skipped: true,
        message: 'No subscriptions due today'
      });
    }

    console.log(`[SUBSCRIPTION-BILLING] Found ${subscriptions.length} subscriptions due for billing`);

    const config = getPortOneConfig();
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const subscription of subscriptions) {
      try {
        console.log(`[SUBSCRIPTION-BILLING] Processing subscription: ${subscription.id} for academy: ${subscription.academy_id}`);

        // Check if billing key exists
        if (!subscription.billing_key) {
          console.error(`[SUBSCRIPTION-BILLING] No billing key for subscription: ${subscription.id}`);
          errors.push(`Subscription ${subscription.id}: No billing key`);
          continue;
        }

        // Generate payment ID
        const paymentId = `subscription_${subscription.id}_${Date.now()}`;

        // Get academy info
        const { data: academy } = await supabaseAdmin
          .from('academies')
          .select('name')
          .eq('id', subscription.academy_id)
          .single();

        // Calculate next billing date
        const nextBillingDate = new Date(subscription.next_billing_date);
        if (subscription.billing_cycle === 'monthly') {
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        } else {
          nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
        }

        // Call PortOne billing key payment API
        console.log(`[SUBSCRIPTION-BILLING] Charging billing key for subscription: ${subscription.id}, amount: ${subscription.monthly_amount}`);

        const paymentResponse = await fetch(
          `https://api.portone.io/payments/${encodeURIComponent(paymentId)}/billing-key`,
          {
            method: 'POST',
            headers: {
              'Authorization': `PortOne ${config.apiSecret}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              billingKey: subscription.billing_key,
              orderName: `${academy?.name || 'Academy'} - ${subscription.plan_tier} 구독`,
              customer: {
                name: {
                  full: academy?.name || 'Academy',
                },
              },
              amount: {
                total: subscription.monthly_amount,
              },
              currency: 'KRW',
            }),
          }
        );

        if (paymentResponse.ok) {
          const paymentData = await paymentResponse.json();
          console.log(`[SUBSCRIPTION-BILLING] Payment successful for subscription: ${subscription.id}`);

          // Calculate billing period
          const billingPeriodStart = new Date(subscription.next_billing_date);
          const billingPeriodEnd = new Date(nextBillingDate);

          // Create subscription invoice
          const { error: invoiceError } = await supabaseAdmin
            .from('subscription_invoices')
            .insert({
              academy_id: subscription.academy_id,
              subscription_id: subscription.id,
              kg_transaction_id: paymentId,
              amount: subscription.monthly_amount,
              currency: 'KRW',
              status: 'paid',
              paid_at: new Date().toISOString(),
              billing_period_start: billingPeriodStart.toISOString(),
              billing_period_end: billingPeriodEnd.toISOString(),
              plan_tier: subscription.plan_tier,
              billing_cycle: subscription.billing_cycle,
              metadata: {
                payment_method: paymentData.method?.type || 'CARD',
                cron_triggered: true,
              },
            });

          if (invoiceError) {
            console.error(`[SUBSCRIPTION-BILLING] Error creating invoice for subscription ${subscription.id}:`, invoiceError);
            errors.push(`Subscription ${subscription.id}: Failed to create invoice`);
          }

          // Check if there's a pending plan change scheduled for this billing cycle
          const hasPendingChange = subscription.pending_tier && subscription.pending_change_effective_date;
          const hasPendingAddons = subscription.pending_addons_effective_date !== null;

          let updateData: any = {
            last_payment_date: new Date().toISOString(),
            next_billing_date: nextBillingDate.toISOString(),
            current_period_start: billingPeriodStart.toISOString(),
            current_period_end: billingPeriodEnd.toISOString(),
            status: 'active',
            updated_at: new Date().toISOString(),
          };

          // If there's a pending change and today is on or after the effective date, apply it
          if (hasPendingChange) {
            const effectiveDate = new Date(subscription.pending_change_effective_date);
            const today = new Date();

            if (today >= effectiveDate) {
              console.log(`[SUBSCRIPTION-BILLING] Applying scheduled plan change for subscription ${subscription.id}: ${subscription.plan_tier} → ${subscription.pending_tier}`);

              // Get the pending plan details
              const { SUBSCRIPTION_PLANS } = await import('@/types/subscription');
              const pendingPlan = SUBSCRIPTION_PLANS[subscription.pending_tier as keyof typeof SUBSCRIPTION_PLANS];

              if (pendingPlan) {
                // Apply the pending plan change
                updateData = {
                  ...updateData,
                  plan_tier: subscription.pending_tier,
                  monthly_amount: subscription.pending_monthly_amount,
                  student_limit: pendingPlan.limits.studentLimit,
                  teacher_limit: pendingPlan.limits.teacherLimit,
                  storage_limit_gb: pendingPlan.limits.storageGb,
                  features_enabled: pendingPlan.features,
                  // Clear pending fields
                  pending_tier: null,
                  pending_monthly_amount: null,
                  pending_change_effective_date: null,
                };

                console.log(`[SUBSCRIPTION-BILLING] Plan change applied successfully for subscription ${subscription.id}`);

                // Update academy tier as well
                await supabaseAdmin
                  .from('academies')
                  .update({
                    subscription_tier: subscription.pending_tier,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', subscription.academy_id);
              }
            }
          }

          // Check if there are pending add-ons to apply
          if (hasPendingAddons) {
            const effectiveDate = new Date(subscription.pending_addons_effective_date);
            const today = new Date();

            if (today >= effectiveDate) {
              console.log(`[SUBSCRIPTION-BILLING] Applying scheduled add-ons for subscription ${subscription.id}`);

              // Import add-on calculation utilities
              const { calculateAddonCost } = await import('@/lib/addon-config');
              const { SUBSCRIPTION_PLANS } = await import('@/types/subscription');

              // Get current plan (or use updated plan if tier change was also applied)
              const currentPlanTier = updateData.plan_tier || subscription.plan_tier;
              const currentPlan = SUBSCRIPTION_PLANS[currentPlanTier as keyof typeof SUBSCRIPTION_PLANS];

              // Calculate new add-on cost
              const addonCost = calculateAddonCost(
                currentPlanTier,
                subscription.pending_additional_students || 0,
                subscription.pending_additional_teachers || 0,
                subscription.pending_additional_storage_gb || 0
              );

              // Calculate new total monthly amount
              const basePlanPrice = currentPlan.monthlyPrice;
              const newMonthlyAmount = basePlanPrice + addonCost;

              // Calculate new limits (base limits + add-ons)
              const baseStudentLimit = currentPlan.limits.studentLimit;
              const baseTeacherLimit = currentPlan.limits.teacherLimit;
              const baseStorageLimit = currentPlan.limits.storageGb;

              const newStudentLimit = baseStudentLimit === -1 ? -1 : baseStudentLimit + (subscription.pending_additional_students || 0);
              const newTeacherLimit = baseTeacherLimit === -1 ? -1 : baseTeacherLimit + (subscription.pending_additional_teachers || 0);
              const newStorageLimit = baseStorageLimit === -1 ? -1 : baseStorageLimit + (subscription.pending_additional_storage_gb || 0);

              // Apply the add-ons
              updateData = {
                ...updateData,
                monthly_amount: newMonthlyAmount,
                student_limit: newStudentLimit,
                teacher_limit: newTeacherLimit,
                storage_limit_gb: newStorageLimit,
                // Move pending add-ons to active
                additional_students: subscription.pending_additional_students || 0,
                additional_teachers: subscription.pending_additional_teachers || 0,
                additional_storage_gb: subscription.pending_additional_storage_gb || 0,
                // Clear pending add-on fields
                pending_additional_students: null,
                pending_additional_teachers: null,
                pending_additional_storage_gb: null,
                pending_addons_effective_date: null,
              };

              console.log(`[SUBSCRIPTION-BILLING] Add-ons applied successfully for subscription ${subscription.id}. New monthly amount: ${newMonthlyAmount}`);
            }
          }

          // Update subscription with new billing date (and possibly new plan)
          const { error: updateError } = await supabaseAdmin
            .from('academy_subscriptions')
            .update(updateData)
            .eq('id', subscription.id);

          if (updateError) {
            console.error(`[SUBSCRIPTION-BILLING] Error updating subscription ${subscription.id}:`, updateError);
            errors.push(`Subscription ${subscription.id}: Failed to update subscription`);
          } else {
            console.log(`[SUBSCRIPTION-BILLING] Updated subscription ${subscription.id} next_billing_date to: ${nextBillingDate.toISOString()}`);
          }

          successCount++;

        } else {
          // Payment failed
          const errorData = await paymentResponse.json();
          console.error(`[SUBSCRIPTION-BILLING] Payment failed for subscription ${subscription.id}:`, errorData);

          // Mark subscription as past_due
          await supabaseAdmin
            .from('academy_subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('id', subscription.id);

          // Create failed invoice record
          await supabaseAdmin
            .from('subscription_invoices')
            .insert({
              academy_id: subscription.academy_id,
              subscription_id: subscription.id,
              kg_transaction_id: paymentId,
              amount: subscription.monthly_amount,
              currency: 'KRW',
              status: 'failed',
              failed_at: new Date().toISOString(),
              failure_reason: errorData.message || 'Payment processing failed',
              billing_period_start: subscription.next_billing_date,
              billing_period_end: nextBillingDate.toISOString(),
              plan_tier: subscription.plan_tier,
              billing_cycle: subscription.billing_cycle,
            });

          failCount++;
          errors.push(`Subscription ${subscription.id}: Payment failed - ${errorData.message}`);
        }

      } catch (subError) {
        console.error(`[SUBSCRIPTION-BILLING] Error processing subscription ${subscription.id}:`, subError);
        failCount++;
        errors.push(`Subscription ${subscription.id}: ${(subError as Error).message}`);
      }
    }

    const result = {
      success: true,
      date: today,
      subscriptionsFound: subscriptions.length,
      subscriptionsProcessed: successCount + failCount,
      successfulPayments: successCount,
      failedPayments: failCount,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log(`[SUBSCRIPTION-BILLING] Completed processing:`, result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('[SUBSCRIPTION-BILLING] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: (error as Error).message
      },
      { status: 500 }
    );
  }
}

// POST endpoint for testing/monitoring
export async function POST(req: NextRequest) {
  return GET(req);
}
