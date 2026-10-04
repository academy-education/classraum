import { NextRequest, NextResponse } from 'next/server';
import { verifyPayment } from '@/lib/portone';
import { dbAdmin } from '@/lib/supabase-admin';
import { triggerInvoicePaymentNotifications } from '@/lib/notification-triggers';
import { verifyWebhookSignature as verifyStandardWebhook, WebhookVerificationError } from '@/lib/portone-webhook';
import { tryHandleStudyOneTimeWebhook } from '@/lib/study/payment-webhook-handler';
import { raiseAlert } from '@/lib/ops/alert';
import type { Json } from '@/lib/database.types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // Study one-time purchases (spk-/pas-) can land here when the payment
    // was sent without noticeUrls and fell back to this console-configured
    // webhook. Grant them via the shared study handler BEFORE the invoice
    // secret gate below (the study grant re-verifies against PortOne's API,
    // so it doesn't need the webhook signature). Anything not a study
    // payment falls through to the invoice flow untouched.
    const studyOutcome = await tryHandleStudyOneTimeWebhook(body);
    if (studyOutcome.handled) {
      // Retryable = couldn't verify the payment (transient) → ask PortOne
      // to re-deliver rather than acking with a 2xx.
      const status = studyOutcome.retryable ? 503 : 200;
      return NextResponse.json({ ok: !studyOutcome.retryable, study: true, ...studyOutcome }, { status });
    }

    // Verify webhook signature using Standard Webhooks specification
    // PortOne V2 sends: webhook-id, webhook-signature (v1,base64), webhook-timestamp
    const webhookSecret = process.env.PORTONE_WEBHOOK_SECRET;
    if (webhookSecret) {
      const webhookId = request.headers.get('webhook-id');
      const webhookSignature = request.headers.get('webhook-signature');
      const webhookTimestamp = request.headers.get('webhook-timestamp');

      if (!webhookId || !webhookSignature || !webhookTimestamp) {
        console.error('[Webhook] Missing required webhook headers (webhook-id, webhook-signature, webhook-timestamp)');
        return NextResponse.json(
          { error: 'Missing webhook signature headers' },
          { status: 401 }
        );
      }

      try {
        verifyStandardWebhook(webhookSecret, body, {
          'webhook-id': webhookId,
          'webhook-signature': webhookSignature,
          'webhook-timestamp': webhookTimestamp,
        });
      } catch (err) {
        if (err instanceof WebhookVerificationError) {
          console.error('[Webhook] Webhook signature verification failed:', err.message);
          return NextResponse.json(
            { error: 'Invalid webhook signature' },
            { status: 401 }
          );
        }
        throw err;
      }
    } else if (process.env.NODE_ENV === 'production') {
      console.error('[Webhook] PORTONE_WEBHOOK_SECRET not configured — rejecting webhook');
      return NextResponse.json({ error: 'Webhook verification not configured' }, { status: 500 });
    }

    const data = JSON.parse(body);
    // PortOne V2 webhooks use snake_case (payment_id), not camelCase (paymentId)
    const paymentId = data.payment_id || data.paymentId;
    const customData = data.customData;

    if (!paymentId) {
      // Log shape, not contents — PortOne webhook bodies include customer
      // data we don't want surfacing in logs/Sentry on malformed payloads.
      console.error('[Webhook] Payment ID missing from webhook body. Keys present:', Object.keys(data ?? {}));
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    // SERVICE ROLE, deliberately. This is a server-to-server call from
    // PortOne: there is no user and no session cookie, so the cookie-bound
    // anon client it used until 2026-10-04 ran every write as `anon`. RLS
    // rejected the webhook_events claim (401 "new row violates row-level
    // security policy", 3x in prod), so invoice-paid notifications never
    // fired, and the invoice / subscription UPDATEs were filtered to zero
    // rows without an error. Authenticity comes from the Standard Webhooks
    // signature above plus verifyPayment() against PortOne's API below —
    // never from the database role.
    const supabase = dbAdmin;

    // ── Idempotency guard ──────────────────────────────────────────────
    // PortOne retries on non-2xx and can also redeliver after timeouts even
    // when we returned 200 (network loss, slow ACK). Without this check,
    // every retry re-fires triggerInvoicePaymentNotifications() — meaning
    // duplicate "payment received" emails/SMS to the parent. The webhook-id
    // header is PortOne's canonical idempotency key.
    //
    // The fast-path SELECT catches the common case (real PortOne retry of
    // an already-processed delivery). The slow-path race (two concurrent
    // deliveries both passing this check) is closed by the unique partial
    // index on webhook_events.webhook_id (migration 023) — the second
    // INSERT raises 23505 and we skip the notification.
    const webhookId = request.headers.get('webhook-id') || '';
    if (webhookId) {
      const { data: existing, error: existingError } = await supabase
        .from('webhook_events')
        .select('id')
        .eq('webhook_id', webhookId)
        .maybeSingle();
      if (existingError) {
        // Cannot tell a retry from a first delivery. Ask PortOne to
        // redeliver rather than risk a second notification.
        console.error('[Webhook] Idempotency lookup failed:', existingError);
        return NextResponse.json({ error: 'Idempotency check failed' }, { status: 500 });
      }
      if (existing) {
        console.log('[Webhook] Already processed; skipping:', webhookId);
        return NextResponse.json({
          success: true,
          message: 'Already processed (idempotent)',
        });
      }
    }

    // Verify payment with PortOne
    const verification = await verifyPayment(paymentId);

    if (!verification.success || !verification.payment) {
      return NextResponse.json(
        { error: verification.error || 'Payment verification failed' },
        { status: 400 }
      );
    }

    // Check if this is an invoice payment and update invoice status
    // Look for invoice payment by checking payment_id pattern or custom data
    let invoiceId: string | null = null;

    // First check if payment ID contains invoice reference
    if (paymentId.includes('invoice_')) {
      const match = paymentId.match(/invoice_([a-f0-9-]+)_/);
      if (match) {
        invoiceId = match[1];
      }
    }

    // Also check custom data if provided
    if (!invoiceId && customData?.invoiceId) {
      invoiceId = customData.invoiceId;
    }

    // Update invoice status if this is an invoice payment
    if (invoiceId) {
      let invoiceStatus: string;
      let notes: string;

      switch (verification.payment.status) {
        case 'PAID':
          invoiceStatus = 'paid';
          notes = `Payment completed via webhook at ${new Date().toISOString()}`;
          break;
        case 'CANCELLED':
          invoiceStatus = 'cancelled';
          notes = `Payment cancelled via webhook at ${new Date().toISOString()}`;
          break;
        case 'FAILED':
          invoiceStatus = 'failed';
          notes = `Payment failed via webhook at ${new Date().toISOString()}`;
          break;
        case 'VIRTUAL_ACCOUNT_ISSUED':
          invoiceStatus = 'pending';
          notes = `Virtual account issued, waiting for payment`;
          break;
        default:
          invoiceStatus = 'pending';
          notes = `Payment status: ${verification.payment.status}`;
      }

      // Note: invoices table has 'discount_reason' field, not 'notes'
      const updateData: any = {
        status: invoiceStatus,
        transaction_id: paymentId,
        payment_method: verification.payment.method?.type || 'unknown',
        discount_reason: notes, // Using discount_reason since notes field doesn't exist
      };

      // Add paid_at timestamp if payment is completed
      if (invoiceStatus === 'paid' && verification.payment.paidAt) {
        updateData.paid_at = verification.payment.paidAt;
      }

      const { data: updatedInvoices, error: invoiceUpdateError } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId)
        .select('id');

      if (invoiceUpdateError) {
        console.error('Failed to update invoice status:', invoiceUpdateError);
        // Return 500 so the payment provider retries the webhook
        return NextResponse.json(
          { error: 'Failed to update invoice status' },
          { status: 500 }
        );
      }

      // Send notification if invoice was marked as paid — but ONLY if this
      // is the first delivery for this webhook-id. The webhook_events
      // INSERT below acts as the idempotency claim; we gate notifications
      // on its success so two concurrent deliveries can't both notify.
      // (For the common single-delivery case, the early-return guard
      // above already handled the retry path.)
      // Zero rows is not a transient failure (a retry cannot make the
      // invoice exist), so it is alerted rather than retried — and nobody is
      // told an invoice was paid when no invoice was marked paid.
      const invoiceFound = (updatedInvoices?.length ?? 0) > 0;
      if (!invoiceFound) {
        await raiseAlert({
          severity: 'warning',
          title: 'Payment webhook matched no invoice',
          message:
            `Webhook for ${paymentId} (status ${verification.payment.status}) named invoice ${invoiceId}, ` +
            `but the update matched no row. The payment is not reflected on any invoice.`,
          dedupeKey: `payment-webhook-invoice-missing:${invoiceId}`,
          context: { invoiceId, paymentId },
        });
      }

      if (invoiceStatus === 'paid' && invoiceFound) {
        const claim = await claimWebhookId(supabase, webhookId, {
          eventType: 'Payment.InvoicePaid',
          paymentId,
          status: verification.payment.status,
          amount: verification.payment.amount?.total ?? null,
          rawData: data,
        });
        if (claim === 'error') {
          // The invoice IS paid, but without the claim we cannot notify
          // exactly once. Redeliver: the invoice update is idempotent.
          return NextResponse.json({ error: 'Failed to record webhook' }, { status: 500 });
        }
        if (claim === 'claimed') {
          try {
            await triggerInvoicePaymentNotifications(invoiceId);
          } catch (notificationError) {
            console.error('Error sending invoice payment notification:', notificationError);
            // Don't fail the webhook processing if notification fails
          }
        }
      }
    }

    // Check if this is a subscription payment
    if (paymentId.includes('subscription_')) {
      // Extract subscription ID from payment ID format: subscription_{subId}_initial_{timestamp} or subscription_{subId}_{timestamp}
      const parts = paymentId.split('_');
      let subscriptionId: string | null = null;

      if (parts.length >= 3 && parts[0] === 'subscription') {
        subscriptionId = parts[1];
      }

      if (subscriptionId) {
        if (verification.payment.status === 'PAID') {
          // Update academy_subscriptions table
          const { data: activatedSubs, error: subUpdateError } = await supabase
            .from('academy_subscriptions')
            .update({
              status: 'active',
              last_payment_date: verification.payment.paidAt || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', subscriptionId)
            .select('id');

          if (subUpdateError) {
            console.error('Error updating subscription:', subUpdateError);
            // Return 500 so the payment provider retries the webhook
            return NextResponse.json(
              { error: 'Failed to update subscription status' },
              { status: 500 }
            );
          }
          if ((activatedSubs?.length ?? 0) === 0) {
            await raiseAlert({
              severity: 'warning',
              title: 'Payment webhook matched no academy subscription',
              message: `PAID webhook for ${paymentId} named academy subscription ${subscriptionId}, but no row matched.`,
              dedupeKey: `payment-webhook-sub-missing:${subscriptionId}`,
              context: { subscriptionId, paymentId },
            });
          }
          // Create the subscription_invoices row ONLY IF nobody else did.
          //
          // This webhook is a backstop, not an author. Both authoritative
          // writers — the billing cron and the client-side payment callback
          // — already insert this row with status 'paid' and a correctly
          // COMPUTED billing period. So there is nothing here worth
          // updating, and updating is actively harmful: the cron charges
          // before it advances academy_subscriptions.current_period_*, so a
          // webhook that wins that race would overwrite the cron's correct
          // period with the PREVIOUS one. Hence ignoreDuplicates (ON
          // CONFLICT DO NOTHING) rather than a real upsert.
          //
          // onConflict must still name kg_transaction_id: that's the UNIQUE
          // constraint. Supabase otherwise defaults to the PRIMARY KEY (id),
          // which we don't supply, so a redelivery would hit 23505.
          //
          // The insert needs plan_tier, billing_cycle, billing_period_start
          // and billing_period_end — all NOT NULL with no default. They live
          // on the parent subscription, so read them alongside academy_id;
          // omitting them (as this did until 2026-07-27) meant the INSERT
          // branch always failed 23502 and the backstop never worked. In the
          // only case this row is now written — neither other writer ran —
          // current_period_* is the best available approximation.
          const { data: subRow, error: subReadError } = await supabase
            .from('academy_subscriptions')
            .select('academy_id, plan_tier, billing_cycle, current_period_start, current_period_end')
            .eq('id', subscriptionId)
            .single();

          if (subReadError || !subRow) {
            console.error('Error reading subscription for invoice upsert:', subReadError);
            // Log but don't fail — subscription status is already updated
          } else {
            const { error: invoiceUpdateError } = await supabase
              .from('subscription_invoices')
              .upsert({
                academy_id: subRow.academy_id,
                subscription_id: subscriptionId,
                kg_transaction_id: paymentId,
                status: 'paid',
                paid_at: verification.payment.paidAt || new Date().toISOString(),
                amount: verification.payment.amount.total,
                currency: 'KRW',
                plan_tier: subRow.plan_tier,
                billing_cycle: subRow.billing_cycle,
                billing_period_start: subRow.current_period_start,
                billing_period_end: subRow.current_period_end,
                metadata: {
                  payment_method: verification.payment.method?.type ?? null,
                  webhook_received_at: new Date().toISOString(),
                },
              }, { onConflict: 'kg_transaction_id', ignoreDuplicates: true });

            if (invoiceUpdateError) {
              // Don't fail — subscription status is already updated and the
              // cron / client callback are the authoritative writers. But
              // say so somewhere a person reads.
              await raiseAlert({
                severity: 'warning',
                title: 'Subscription invoice backstop insert failed',
                message: `PAID webhook for ${paymentId} could not write its subscription_invoices backstop row.`,
                dedupeKey: `payment-webhook-sub-invoice-upsert:${paymentId}`,
                error: invoiceUpdateError,
                context: { subscriptionId, paymentId },
              });
            }
          }
        } else if (verification.payment.status === 'FAILED') {
          // Mark subscription as past_due. Unchecked, a failed write meant
          // the route still returned processed:true, PortOne stopped
          // retrying, and the subscription silently stayed 'active' with no
          // dunning ever starting. Both writes are idempotent end-states, so
          // returning 500 to force a redelivery is safe.
          const { error: pastDueError } = await supabase
            .from('academy_subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('id', subscriptionId);

          if (pastDueError) {
            await raiseAlert({
              severity: 'critical',
              title: 'Academy subscription not marked past_due',
              message:
                `A FAILED payment webhook for ${paymentId} could not move academy subscription ${subscriptionId} to past_due. ` +
                `The subscription still reads as active and dunning will not start. Returning 500 so PortOne redelivers.`,
              dedupeKey: `academy-sub-past-due-write:${subscriptionId}`,
              error: pastDueError,
              context: { subscriptionId, paymentId },
            });
            return NextResponse.json(
              { error: 'Failed to mark subscription past_due' },
              { status: 500 }
            );
          }

          // Update subscription invoice
          const { error: failedInvoiceError } = await supabase
            .from('subscription_invoices')
            .update({
              status: 'failed',
              failed_at: verification.payment.failedAt || new Date().toISOString(),
              failure_reason: 'Payment failed',
            })
            .eq('kg_transaction_id', paymentId);

          if (failedInvoiceError) {
            await raiseAlert({
              severity: 'warning',
              title: 'Subscription invoice not marked failed',
              message:
                `A FAILED payment webhook for ${paymentId} could not mark its subscription_invoices row failed. ` +
                `Returning 500 so PortOne redelivers.`,
              dedupeKey: `academy-sub-invoice-failed-write:${paymentId}`,
              error: failedInvoiceError,
              context: { subscriptionId, paymentId },
            });
            return NextResponse.json(
              { error: 'Failed to update subscription invoice' },
              { status: 500 }
            );
          }

        } else if (verification.payment.status === 'CANCELLED') {
          // Refund. If this write is lost the invoice keeps reading 'paid'
          // and refunded money is counted as revenue — so never ack it.
          const { error: refundError } = await supabase
            .from('subscription_invoices')
            .update({
              status: 'refunded',
            })
            .eq('kg_transaction_id', paymentId);

          if (refundError) {
            await raiseAlert({
              severity: 'critical',
              title: 'Refunded subscription invoice still marked paid',
              message:
                `A CANCELLED (refund) webhook for ${paymentId} could not mark its subscription_invoices row refunded. ` +
                `Refunded money will keep counting as revenue. Returning 500 so PortOne redelivers.`,
              dedupeKey: `academy-sub-invoice-refund-write:${paymentId}`,
              error: refundError,
              context: { subscriptionId, paymentId },
            });
            return NextResponse.json(
              { error: 'Failed to record refund' },
              { status: 500 }
            );
          }

        }
      }
    }

    // Handle different payment statuses
    switch (verification.payment.status) {
      case 'PAID':
        // Payment successful
        break;

      case 'CANCELLED':
        // Payment cancelled
        break;

      case 'FAILED':
        // Payment failed
        break;

      default:
        console.warn('[Webhook] Unhandled payment status:', verification.payment.status);
    }

    // Final audit-log claim. If any earlier branch already called
    // claimWebhookId (e.g. the invoice-paid path gating notifications),
    // this is a no-op (the unique partial index on webhook_id rejects it
    // and we ignore the 23505). Always runs so every delivery leaves an
    // audit row, even subscription / cancelled / failed paths that have
    // no side effects.
    const finalClaim = await claimWebhookId(supabase, webhookId, {
      eventType: 'Payment.StatusChanged',
      paymentId,
      status: verification.payment.status,
      amount: verification.payment.amount?.total ?? null,
      rawData: data,
    });
    if (finalClaim === 'error') {
      // Every write above is an idempotent end-state, so a redelivery is
      // safe; acking would leave no audit row and no idempotency key.
      return NextResponse.json({ error: 'Failed to record webhook' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      status: verification.payment.status,
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Atomically claim a webhook-id by inserting into webhook_events. Returns
 * 'claimed' if this call wrote the row, 'duplicate' if it was already there
 * (race with a concurrent retry), and 'error' for any other failure — which
 * the caller must treat as retryable (500), never as a duplicate: until
 * 2026-10-04 an RLS rejection here read as "someone else claimed it" and
 * silently suppressed every invoice-paid notification.
 *
 * Callers should gate side-effecting operations (notifications, alerts)
 * on the return value so duplicate deliveries can never double-fire.
 *
 * Safe to call without a webhookId — returns true unconditionally in that
 * case, since there's no idempotency key to enforce. (PortOne always
 * sends webhook-id; the null branch exists for tests / manual replay.)
 */
type SupabaseClient = typeof dbAdmin;
type ClaimOutcome = 'claimed' | 'duplicate' | 'error';
async function claimWebhookId(
  supabase: SupabaseClient,
  webhookId: string,
  event: {
    eventType: string;
    paymentId: string;
    status: string;
    amount: number | null;
    // webhook_events.raw_data is a jsonb column; typing this as `unknown`
    // meant it couldn't be handed to .insert() honestly.
    rawData: Json;
  }
): Promise<ClaimOutcome> {
  if (!webhookId) return 'claimed';
  const { error } = await supabase.from('webhook_events').insert({
    type: 'payment',
    event_type: event.eventType,
    entity_id: event.paymentId,
    status: event.status,
    amount: event.amount,
    currency: 'KRW',
    timestamp: new Date().toISOString(),
    processed: true,
    raw_data: event.rawData,
    webhook_id: webhookId,
  });
  if (!error) return 'claimed';
  // 23505 = unique_violation — concurrent retry beat us to the claim.
  if ((error as { code?: string }).code === '23505') {
    console.log('[Webhook] webhook_id already claimed (race-loss):', webhookId);
    return 'duplicate';
  }
  console.error('[Webhook] Failed to log webhook_events row:', error);
  return 'error';
}