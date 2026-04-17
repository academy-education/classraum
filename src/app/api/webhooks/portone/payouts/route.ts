import { NextRequest, NextResponse } from 'next/server';
import {
  verifyWebhookSignature,
  parseWebhookPayload,
  WebhookVerificationError,
  PayoutWebhookPayload,
  WebhookHeaders,
} from '@/lib/portone-webhook';
import { supabaseServer } from '@/lib/supabase-server';
import { alerts } from '@/lib/alerting';
import { loggers } from '@/lib/error-monitoring';

const PORTONE_WEBHOOK_SECRET = process.env.PORTONE_WEBHOOK_SECRET;

/**
 * POST /api/webhooks/portone/payouts
 *
 * Webhook endpoint for PortOne Platform API payout status updates
 *
 * This endpoint receives webhooks when payout status changes occur.
 * It verifies the webhook signature and processes the payout status update.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check if webhook secret is configured
    if (!PORTONE_WEBHOOK_SECRET) {
      console.error('[Payout Webhook] PORTONE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      );
    }

    // Get raw body as text (required for signature verification)
    const rawBody = await request.text();

    // Extract webhook headers
    const headers: WebhookHeaders = {
      'webhook-id': request.headers.get('webhook-id') || '',
      'webhook-signature': request.headers.get('webhook-signature') || '',
      'webhook-timestamp': request.headers.get('webhook-timestamp') || '',
    };

    // Verify webhook signature
    try {
      verifyWebhookSignature(PORTONE_WEBHOOK_SECRET, rawBody, headers);
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        loggers.webhook.error('Payout webhook verification failed', error as Error, {
          webhookId: headers['webhook-id'],
          timestamp: headers['webhook-timestamp'],
        });
        await alerts.webhookVerificationFailed('payout', error as Error);
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }
      throw error;
    }

    // Parse webhook payload
    const payload = parseWebhookPayload<PayoutWebhookPayload>(rawBody);

    // Payload parsed and verified

    // Process payout webhook based on type
    await processPayoutWebhook(payload);


    // Return 200 OK to acknowledge receipt
    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[Payout Webhook] Error after ${processingTime}ms:`, error);

    // Return 500 to trigger PortOne retry
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Process payout webhook event
 */
async function processPayoutWebhook(payload: PayoutWebhookPayload) {
  const { type, data } = payload;

  // Handle different payout event types
  switch (type) {
    case 'Payout.Scheduled':
    case 'Payout.Processing':
    case 'Payout.Succeeded':
    case 'Payout.Canceled':
      // Status tracked via webhook_events table (logged below)
      // Future: update dedicated payouts table, send notifications to academy
      break;

    case 'Payout.Failed':
      console.error('[Payout] Failed:', data.payoutId, data.failureReason);
      // Failure alerting handled by handlePayoutFailure below
      break;

    default:
      // Unknown event type - log but don't fail
      console.warn('[Payout] Unknown webhook type:', type);
      console.warn('[Payout] Ignoring unknown event type as per webhook best practices');
  }

  // Log webhook event for audit trail
  await logWebhookEvent({
    type: 'payout',
    eventType: type,
    payoutId: data.payoutId,
    partnerId: data.partnerId,
    status: data.status,
    amount: data.amount,
    currency: data.currency,
    timestamp: payload.timestamp,
    failureReason: data.failureReason,
    rawData: payload,
  });

  // For failed payouts, trigger additional alerting
  if (type === 'Payout.Failed') {
    await handlePayoutFailure(data);
  }
}

/**
 * Handle payout failure - send alerts and create tickets
 */
async function handlePayoutFailure(data: PayoutWebhookPayload['data']) {
  loggers.payout.critical('Payout failed', undefined, {
    payoutId: data.payoutId,
    partnerId: data.partnerId,
    amount: data.amount,
    currency: data.currency,
    reason: data.failureReason,
  });

  // Send critical alert
  await alerts.payoutFailed(
    data.payoutId,
    data.partnerId,
    data.amount,
    data.currency,
    data.failureReason
  );

  // Future: send notification to academy, create support ticket, schedule retry
}

/**
 * Log webhook event for audit and debugging
 */
async function logWebhookEvent(event: {
  type: string;
  eventType: string;
  payoutId: string;
  partnerId: string;
  status: string;
  amount: number;
  currency: string;
  timestamp: string;
  failureReason?: string;
  rawData: any;
}) {
  try {
    // Store in database for audit trail
    const { error } = await supabaseServer.from('webhook_events').insert({
      type: event.type,
      event_type: event.eventType,
      entity_id: event.payoutId,
      partner_id: event.partnerId,
      status: event.status,
      amount: event.amount,
      currency: event.currency,
      timestamp: event.timestamp,
      processed: true, // Mark as processed immediately after handling
      error_message: event.failureReason || null,
      raw_data: event.rawData,
      webhook_id: null, // Can be extracted from headers if needed
    });

    if (error) {
      loggers.webhook.error('Failed to store webhook event in database', error as Error, {
        payoutId: event.payoutId,
        eventType: event.eventType,
      });
    } else {
      loggers.webhook.info('Webhook event stored in database', {
        type: event.type,
        eventType: event.eventType,
        entityId: event.payoutId,
        partnerId: event.partnerId,
        status: event.status,
        amount: event.amount,
        currency: event.currency,
      });
    }
  } catch (error) {
    loggers.webhook.error('Exception storing webhook event', error as Error, {
      payoutId: event.payoutId,
    });
  }
}
