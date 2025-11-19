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

    console.log('[Payout Webhook] Received:', {
      type: payload.type,
      payoutId: payload.data.payoutId,
      partnerId: payload.data.partnerId,
      status: payload.data.status,
      amount: payload.data.amount,
      timestamp: payload.timestamp,
    });

    // Process payout webhook based on type
    await processPayoutWebhook(payload);

    const processingTime = Date.now() - startTime;
    console.log(`[Payout Webhook] Processed successfully in ${processingTime}ms`);

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
      console.log('[Payout] Status: Scheduled', data.payoutId);
      console.log('[Payout] Scheduled for:', data.scheduledAt);
      // TODO: Update internal database with scheduled status
      // TODO: Send notification to academy about scheduled payout
      break;

    case 'Payout.Processing':
      console.log('[Payout] Status: Processing', data.payoutId);
      // TODO: Update internal database with processing status
      // TODO: Notify academy that payout is being processed
      break;

    case 'Payout.Succeeded':
      console.log('[Payout] Status: Succeeded', data.payoutId);
      console.log('[Payout] Amount:', data.amount, data.currency);
      console.log('[Payout] Completed at:', data.payoutAt);
      // TODO: Update internal database with succeeded status
      // TODO: Send success notification to academy
      // TODO: Update accounting/financial records
      // TODO: Mark related settlements as fully paid out
      // TODO: Generate payout receipt/statement
      break;

    case 'Payout.Failed':
      console.error('[Payout] Status: Failed', data.payoutId);
      console.error('[Payout] Failure reason:', data.failureReason);
      // TODO: Update internal database with failed status
      // TODO: Send urgent notification to academy and admin
      // TODO: Create alert for manual review
      // TODO: Investigate failure reason
      // TODO: Determine if retry is needed
      // TODO: Update related settlements status if needed
      break;

    case 'Payout.Canceled':
      console.log('[Payout] Status: Canceled', data.payoutId);
      // TODO: Update internal database with canceled status
      // TODO: Send notification about cancellation
      // TODO: Investigate cancellation reason
      // TODO: Update related settlements if needed
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

  // TODO: Send notification to academy
  // TODO: Create support ticket for investigation
  // TODO: Check if automatic retry should be scheduled
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
