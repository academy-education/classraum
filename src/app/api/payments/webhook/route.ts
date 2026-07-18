import { NextRequest, NextResponse } from 'next/server';
import { verifyPayment } from '@/lib/portone';
import { createClient } from '@/lib/supabase/server';
import { triggerInvoicePaymentNotifications } from '@/lib/notification-triggers';
import { verifyWebhookSignature as verifyStandardWebhook, WebhookVerificationError } from '@/lib/portone-webhook';
import { tryHandleStudyOneTimeWebhook } from '@/lib/study/payment-webhook-handler';

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
      return NextResponse.json({ ok: true, study: true, ...studyOutcome });
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

    const supabase = await createClient();

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
      const { data: existing } = await supabase
        .from('webhook_events')
        .select('id')
        .eq('webhook_id', webhookId)
        .maybeSingle();
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

      const { error: invoiceUpdateError } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId);

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
      if (invoiceStatus === 'paid') {
        const claimed = await claimWebhookId(supabase, webhookId, {
          eventType: 'Payment.InvoicePaid',
          paymentId,
          status: verification.payment.status,
          amount: verification.payment.amount?.total ?? null,
          rawData: data,
        });
        if (claimed) {
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
          const { error: subUpdateError } = await supabase
            .from('academy_subscriptions')
            .update({
              status: 'active',
              last_payment_date: verification.payment.paidAt || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', subscriptionId);

          if (subUpdateError) {
            console.error('Error updating subscription:', subUpdateError);
            // Return 500 so the payment provider retries the webhook
            return NextResponse.json(
              { error: 'Failed to update subscription status' },
              { status: 500 }
            );
          }
          // Update or create subscription_invoices record. The table has a
          // UNIQUE (kg_transaction_id) constraint — pass it as onConflict so
          // retries UPDATE the existing row instead of failing with 23505.
          // Without onConflict, Supabase upsert defaults to PRIMARY KEY (id)
          // which we don't supply, so the second delivery would always try
          // to INSERT and hit the unique violation.
          const { error: invoiceUpdateError } = await supabase
            .from('subscription_invoices')
            .upsert({
              academy_id: (await supabase
                .from('academy_subscriptions')
                .select('academy_id')
                .eq('id', subscriptionId)
                .single()).data?.academy_id,
              subscription_id: subscriptionId,
              kg_transaction_id: paymentId,
              status: 'paid',
              paid_at: verification.payment.paidAt || new Date().toISOString(),
              amount: verification.payment.amount.total,
              currency: 'KRW',
              metadata: {
                payment_method: verification.payment.method?.type,
                webhook_received_at: new Date().toISOString(),
              },
            }, { onConflict: 'kg_transaction_id' });

          if (invoiceUpdateError) {
            console.error('Error updating subscription invoice:', invoiceUpdateError);
            // Log but don't fail — subscription status is already updated
          }
        } else if (verification.payment.status === 'FAILED') {
          // Mark subscription as past_due
          await supabase
            .from('academy_subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('id', subscriptionId);

          // Update subscription invoice
          await supabase
            .from('subscription_invoices')
            .update({
              status: 'failed',
              failed_at: verification.payment.failedAt || new Date().toISOString(),
              failure_reason: 'Payment failed',
            })
            .eq('kg_transaction_id', paymentId);

        } else if (verification.payment.status === 'CANCELLED') {
          // Update subscription invoice
          await supabase
            .from('subscription_invoices')
            .update({
              status: 'refunded',
            })
            .eq('kg_transaction_id', paymentId);

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
    await claimWebhookId(supabase, webhookId, {
      eventType: 'Payment.StatusChanged',
      paymentId,
      status: verification.payment.status,
      amount: verification.payment.amount?.total ?? null,
      rawData: data,
    });

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
 * true if this call wrote the row, false if it was already there (race
 * with a concurrent retry).
 *
 * Callers should gate side-effecting operations (notifications, alerts)
 * on the return value so duplicate deliveries can never double-fire.
 *
 * Safe to call without a webhookId — returns true unconditionally in that
 * case, since there's no idempotency key to enforce. (PortOne always
 * sends webhook-id; the null branch exists for tests / manual replay.)
 */
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
async function claimWebhookId(
  supabase: SupabaseClient,
  webhookId: string,
  event: {
    eventType: string;
    paymentId: string;
    status: string;
    amount: number | null;
    rawData: unknown;
  }
): Promise<boolean> {
  if (!webhookId) return true;
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
  if (!error) return true;
  // 23505 = unique_violation — concurrent retry beat us to the claim.
  // Any other error gets logged but we still treat as "not claimed" so
  // the caller skips the side effect (safer than firing twice).
  if ((error as { code?: string }).code === '23505') {
    console.log('[Webhook] webhook_id already claimed (race-loss):', webhookId);
    return false;
  }
  console.error('[Webhook] Failed to log webhook_events row:', error);
  return false;
}