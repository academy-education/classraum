import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPortOneConfig } from '@/lib/portone-config';
import { verifyCronAuth } from '@/lib/cron-auth';
import { recordHeartbeat } from '@/lib/ops/heartbeat';
import type { Database } from '@/lib/database.types';

// Create admin client with service role key for cron operations
const supabaseAdmin = createClient<Database>(
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
  // Auth first: a 401'd request never ran the job, so nothing below it —
  // including any heartbeat — may report. Otherwise an unauthorized caller
  // could keep a dead cron looking alive to the watchdog.
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();

  try {
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
      await recordHeartbeat(
        'subscription-billing',
        { ok: true, detail: { date: today, found: 0, skipped: true } },
        Date.now() - startedAt,
      );
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
    // Tracked separately from failCount: a declined card is a normal
    // business outcome and must not page anyone, but a rejected DB write
    // means the job did not do its job and the heartbeat has to say so.
    let writeFailures = 0;
    const errors: string[] = [];

    // Process subscriptions in parallel batches of 5 to avoid overwhelming the payment API
    const BATCH_SIZE = 5;
    for (let i = 0; i < subscriptions.length; i += BATCH_SIZE) {
      const batch = subscriptions.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(async (subscription) => {
          console.log(`[SUBSCRIPTION-BILLING] Processing subscription: ${subscription.id} for academy: ${subscription.academy_id}`);

          // Check if billing key exists
          if (!subscription.billing_key) {
            console.error(`[SUBSCRIPTION-BILLING] No billing key for subscription: ${subscription.id}`);
            errors.push(`Subscription ${subscription.id}: No billing key`);
            return;
          }

          // ── Idempotency: deterministic paymentId ──────────────────────
          // Previously: ${id}_${Date.now()}_${random} — every cron run
          // generated a new ID, defeating PortOne's own idempotency
          // (PortOne dedups by paymentId). Overlapping cron runs or
          // retries after a partial timeout would double-charge the
          // customer with different IDs but for the same billing period.
          //
          // Now: ${id}_${YYYY-MM-DD-of-billing-date}. Same period = same
          // ID = PortOne returns the existing charge result instead of
          // creating a new one. Combined with the pre-charge check below
          // (subscription_invoices unique on kg_transaction_id), this
          // makes the whole flow safely re-runnable.
          //
          // next_billing_date is nullable in the schema. The query above
          // filters on `.lte('next_billing_date', today)`, and Postgres
          // drops NULLs from that comparison, so a null can't reach here —
          // but assert it rather than letting `new Date(null)` silently
          // become 1970-01-01 and bill against a bogus period.
          if (!subscription.next_billing_date) {
            console.error(`[SUBSCRIPTION-BILLING] Subscription ${subscription.id} has no next_billing_date — skipping`);
            errors.push(`Subscription ${subscription.id}: No next_billing_date`);
            return;
          }
          const billingDate = subscription.next_billing_date;
          const billingDateKey = billingDate.slice(0, 10);
          const paymentId = `subscription_${subscription.id}_${billingDateKey}`;

          // Pre-charge guard: if we've already created an invoice for
          // this exact (subscription, billing period), the previous run
          // already finished — skip the PortOne call entirely instead
          // of relying on PortOne's dedup as the only defense.
          const { data: existingInvoice } = await supabaseAdmin
            .from('subscription_invoices')
            .select('id, status')
            .eq('kg_transaction_id', paymentId)
            .maybeSingle();
          if (existingInvoice) {
            console.log(`[SUBSCRIPTION-BILLING] Skipping ${subscription.id} — invoice ${existingInvoice.id} already exists for this period (${billingDateKey})`);
            return;
          }

          // Get academy info
          const { data: academy } = await supabaseAdmin
            .from('academies')
            .select('name')
            .eq('id', subscription.academy_id)
            .single();

          // PortOne (Inicis) REQUIRES the buyer's name/email/phone on every
          // billing-key charge. academy_subscriptions has no contact columns,
          // so source it from the academy's manager (managers.phone) + their
          // user record (users.name/email), mirroring the subscribe route.
          // Omitting these fails the charge with "customer.* violated REQUIRED".
          const { data: mgr } = await supabaseAdmin
            .from('managers')
            .select('user_id, phone')
            .eq('academy_id', subscription.academy_id)
            .limit(1)
            .maybeSingle();
          const { data: mgrUser } = mgr?.user_id
            ? await supabaseAdmin
                .from('users')
                .select('name, email, phone')
                .eq('id', mgr.user_id)
                .maybeSingle()
            : { data: null };
          const customerName = mgrUser?.name || academy?.name || 'Academy';
          const customerEmail = mgrUser?.email || 'no-email@example.com';
          const customerPhone = mgr?.phone || mgrUser?.phone || '010-0000-0000';

          // Calculate next billing date
          const nextBillingDate = new Date(billingDate);
          if (subscription.billing_cycle === 'monthly') {
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
          } else {
            nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
          }

          // Resolve which plan THIS cycle is billed at, before charging.
          //
          // Billing is in advance: this charge pays for billingDate →
          // nextBillingDate. So if a scheduled downgrade is due now, the
          // customer holds the new tier for the whole period being paid
          // for, and must be charged the new price. Applying the change
          // after the charge (as this did originally) billed them the old
          // higher amount for a month of the lower tier's limits — they
          // paid Pro and got Basic. Nobody hit that, because pending_tier
          // did not exist until migration 060 and no downgrade ever
          // applied, but the ordering was wrong the moment it worked.
          const changeDue =
            subscription.pending_tier !== null &&
            subscription.pending_change_effective_date !== null &&
            new Date() >= new Date(subscription.pending_change_effective_date);

          const { SUBSCRIPTION_PLANS } = await import('@/types/subscription');
          const pendingTier = subscription.pending_tier;
          const pendingPlan = changeDue && pendingTier
            ? SUBSCRIPTION_PLANS[pendingTier as keyof typeof SUBSCRIPTION_PLANS]
            : null;

          // Only apply — and only re-price — when the schedule is complete.
          // A partial schedule is reported and left in place rather than
          // half-applied; the cycle then bills at the current plan.
          let applyPendingChange = false;
          if (changeDue) {
            if (!pendingPlan) {
              // The CHECK on pending_tier makes this unreachable unless a
              // plan is deleted from the code while a change is booked.
              console.error(`[SUBSCRIPTION-BILLING] Unknown pending_tier "${pendingTier}" on subscription ${subscription.id}; leaving the change scheduled`);
              errors.push(`Subscription ${subscription.id}: Unknown pending_tier ${pendingTier}`);
            } else if (subscription.pending_monthly_amount === null) {
              console.error(`[SUBSCRIPTION-BILLING] Subscription ${subscription.id} has pending_tier "${pendingTier}" but no pending_monthly_amount; leaving the change scheduled`);
              errors.push(`Subscription ${subscription.id}: pending_tier without pending_monthly_amount`);
            } else {
              applyPendingChange = true;
            }
          }

          const effectiveTier = applyPendingChange && pendingTier ? pendingTier : subscription.plan_tier;
          const effectiveAmount = applyPendingChange && subscription.pending_monthly_amount !== null
            ? subscription.pending_monthly_amount
            : subscription.monthly_amount;

          // Call PortOne billing key payment API
          console.log(
            `[SUBSCRIPTION-BILLING] Charging billing key for subscription: ${subscription.id}, amount: ${effectiveAmount}` +
            (applyPendingChange ? ` (scheduled change ${subscription.plan_tier} → ${effectiveTier} applies this cycle)` : '')
          );

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
                orderName: `${academy?.name || 'Academy'} - ${effectiveTier} 구독`,
                customer: {
                  name: {
                    full: customerName,
                  },
                  email: customerEmail,
                  phoneNumber: customerPhone,
                },
                amount: {
                  total: effectiveAmount,
                },
                currency: 'KRW',
              }),
            }
          );

          if (paymentResponse.ok) {
            const paymentData = await paymentResponse.json();
            console.log(`[SUBSCRIPTION-BILLING] Payment successful for subscription: ${subscription.id}`);

            // Calculate billing period
            const billingPeriodStart = new Date(billingDate);
            const billingPeriodEnd = new Date(nextBillingDate);

            // Create subscription invoice
            const { error: invoiceError } = await supabaseAdmin
              .from('subscription_invoices')
              .insert({
                academy_id: subscription.academy_id,
                subscription_id: subscription.id,
                kg_transaction_id: paymentId,
                amount: effectiveAmount,
                currency: 'KRW',
                status: 'paid',
                paid_at: new Date().toISOString(),
                billing_period_start: billingPeriodStart.toISOString(),
                billing_period_end: billingPeriodEnd.toISOString(),
                plan_tier: effectiveTier,
                billing_cycle: subscription.billing_cycle,
                metadata: {
                  payment_method: paymentData.method?.type || 'CARD',
                  cron_triggered: true,
                },
              });

            if (invoiceError) {
              // 23505 = unique_violation on kg_transaction_id. Means a
              // concurrent cron run beat us to the invoice insert — but
              // because the paymentId is now deterministic, PortOne also
              // dedup'd the charge, so the customer wasn't double-billed.
              // Treat this as success (the invoice exists, the charge
              // succeeded once) instead of a hard error.
              if ((invoiceError as { code?: string }).code === '23505') {
                console.log(`[SUBSCRIPTION-BILLING] Invoice for ${subscription.id} already exists (race-loss) — treating as success`);
              } else {
                console.error(`[SUBSCRIPTION-BILLING] Error creating invoice for subscription ${subscription.id}:`, invoiceError.message);
                errors.push(`Subscription ${subscription.id}: Failed to create invoice`);
                writeFailures++;
              }
            }

            let updateData: Database['public']['Tables']['academy_subscriptions']['Update'] = {
              last_payment_date: new Date().toISOString(),
              next_billing_date: nextBillingDate.toISOString(),
              current_period_start: billingPeriodStart.toISOString(),
              current_period_end: billingPeriodEnd.toISOString(),
              status: 'active',
              updated_at: new Date().toISOString(),
            };

            // Apply the scheduled plan change resolved BEFORE the charge.
            // The decision (and its error reporting) lives up there because
            // it also determines what we bill; here we only persist it.
            if (applyPendingChange && pendingPlan) {
              console.log(`[SUBSCRIPTION-BILLING] Applying scheduled plan change for subscription ${subscription.id}: ${subscription.plan_tier} → ${effectiveTier}`);

              // student_limit / teacher_limit are NOT NULL, and
              // SubscriptionLimits no longer defines studentLimit /
              // teacherLimit — the model moved to totalUserLimit. Writing
              // them unconditionally (as this did originally) produced
              // `undefined + n` → NaN → null and failed the whole update
              // AFTER a successful charge, leaving next_billing_date
              // un-advanced and the customer exposed to a re-charge.
              updateData = {
                ...updateData,
                plan_tier: effectiveTier,
                monthly_amount: effectiveAmount,
                ...(pendingPlan.limits.totalUserLimit !== undefined
                  ? { total_user_limit: pendingPlan.limits.totalUserLimit }
                  : {}),
                ...(pendingPlan.limits.storageGb !== undefined
                  ? { storage_limit_gb: pendingPlan.limits.storageGb }
                  : {}),
                features_enabled: { ...pendingPlan.features },
                pending_tier: null,
                pending_monthly_amount: null,
                pending_change_effective_date: null,
              };

              // academies.subscription_tier is what the app gates features
              // on. Losing this write leaves the academy on the old plan's
              // limits while the subscription row disagrees.
              const { error: tierError } = await supabaseAdmin
                .from('academies')
                .update({
                  subscription_tier: effectiveTier,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', subscription.academy_id);
              if (tierError) {
                console.error(`[SUBSCRIPTION-BILLING] Error applying tier to academy ${subscription.academy_id}:`, tierError);
                errors.push(`Subscription ${subscription.id}: Failed to apply tier to academy`);
                writeFailures++;
              }
            }

            // Check if there are pending add-ons to apply
            if (subscription.pending_addons_effective_date) {
              const effectiveDate = new Date(subscription.pending_addons_effective_date);
              const todayDate = new Date();

              if (todayDate >= effectiveDate) {
                console.log(`[SUBSCRIPTION-BILLING] Applying scheduled add-ons for subscription ${subscription.id}`);

                // Import add-on calculation utilities
                const { calculateAddonCost } = await import('@/lib/addon-config');
                const { SUBSCRIPTION_PLANS } = await import('@/types/subscription');

                // Price add-ons at the tier in force for THIS cycle — a
                // scheduled change applied above is already effective.
                const currentPlanTier = effectiveTier as keyof typeof SUBSCRIPTION_PLANS;
                const currentPlan = SUBSCRIPTION_PLANS[currentPlanTier];

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

                // Calculate new limits (base limits + add-ons).
                // studentLimit/teacherLimit are optional on SubscriptionLimits
                // and no plan in SUBSCRIPTION_PLANS actually defines them (the
                // newer model uses totalUserLimit), so they are undefined at
                // runtime. `undefined + n` is NaN, which serializes to null and
                // would make this whole update fail against the NOT NULL
                // student_limit/teacher_limit columns — leaving the row's
                // next_billing_date un-advanced after a successful charge.
                // Only write those two columns when the plan really defines them.
                const baseStudentLimit = currentPlan.limits.studentLimit;
                const baseTeacherLimit = currentPlan.limits.teacherLimit;
                const baseStorageLimit = currentPlan.limits.storageGb;

                const newStudentLimit = baseStudentLimit === undefined
                  ? undefined
                  : baseStudentLimit === -1
                    ? -1
                    : baseStudentLimit + (subscription.pending_additional_students || 0);
                const newTeacherLimit = baseTeacherLimit === undefined
                  ? undefined
                  : baseTeacherLimit === -1
                    ? -1
                    : baseTeacherLimit + (subscription.pending_additional_teachers || 0);
                const newStorageLimit = baseStorageLimit === -1 ? -1 : baseStorageLimit + (subscription.pending_additional_storage_gb || 0);

                // Apply the add-ons
                updateData = {
                  ...updateData,
                  monthly_amount: newMonthlyAmount,
                  ...(newStudentLimit !== undefined ? { student_limit: newStudentLimit } : {}),
                  ...(newTeacherLimit !== undefined ? { teacher_limit: newTeacherLimit } : {}),
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
              writeFailures++;
            } else {
              console.log(`[SUBSCRIPTION-BILLING] Updated subscription ${subscription.id} next_billing_date to: ${nextBillingDate.toISOString()}`);
            }

            successCount++;

          } else {
            // Payment failed
            const errorData = await paymentResponse.json();
            console.error(`[SUBSCRIPTION-BILLING] Payment failed for subscription ${subscription.id}:`, errorData);

            // Mark subscription as past_due and create failed invoice in
            // parallel. Both results are inspected: dropping the past_due
            // flip leaves a non-paying academy with full access and no
            // dunning, and dropping the failed invoice means the decline
            // never appears in the admin billing view at all.
            const [pastDueResult, failedInvoiceResult] = await Promise.all([
              supabaseAdmin
                .from('academy_subscriptions')
                .update({
                  status: 'past_due',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', subscription.id),
              supabaseAdmin
                .from('subscription_invoices')
                .insert({
                  academy_id: subscription.academy_id,
                  subscription_id: subscription.id,
                  kg_transaction_id: paymentId,
                  amount: effectiveAmount,
                  currency: 'KRW',
                  status: 'failed',
                  failed_at: new Date().toISOString(),
                  failure_reason: errorData.message || 'Payment processing failed',
                  billing_period_start: billingDate,
                  billing_period_end: nextBillingDate.toISOString(),
                  plan_tier: effectiveTier,
                  billing_cycle: subscription.billing_cycle,
                }),
            ]);

            if (pastDueResult.error) {
              console.error(`[SUBSCRIPTION-BILLING] Error marking ${subscription.id} past_due:`, pastDueResult.error);
              errors.push(`Subscription ${subscription.id}: Failed to mark past_due`);
              writeFailures++;
            }
            if (failedInvoiceResult.error) {
              console.error(`[SUBSCRIPTION-BILLING] Error recording failed invoice for ${subscription.id}:`, failedInvoiceResult.error);
              errors.push(`Subscription ${subscription.id}: Failed to record failed invoice`);
              writeFailures++;
            }

            failCount++;
            errors.push(`Subscription ${subscription.id}: Payment failed - ${errorData.message}`);
          }
        })
      );

      // Count any unexpected rejections
      for (const result of batchResults) {
        if (result.status === 'rejected') {
          failCount++;
          errors.push(`Batch error: ${result.reason?.message || 'Unknown error'}`);
        }
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

    // Counters only — the `errors` string list stays in the HTTP response
    // rather than bloating the stored heartbeat detail.
    //
    // ok reflects writeFailures, not declines: this route swallows every
    // per-subscription write error to keep the batch going and then
    // answers 200, so an unconditional ok:true would show a green cron
    // over academies that were charged but never advanced.
    await recordHeartbeat(
      'subscription-billing',
      {
        ok: writeFailures === 0,
        detail: {
          date: today,
          found: subscriptions.length,
          succeeded: successCount,
          failed: failCount,
          writeFailures,
          errorCount: errors.length,
        },
      },
      Date.now() - startedAt,
    );

    return NextResponse.json(result);

  } catch (error) {
    console.error('[SUBSCRIPTION-BILLING] Unexpected error:', error);
    // The job aborted mid-flight — record a failure so the watchdog
    // escalates instead of seeing a healthy-looking last run.
    await recordHeartbeat(
      'subscription-billing',
      { ok: false, detail: { error: (error as Error).message } },
      Date.now() - startedAt,
    );
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
