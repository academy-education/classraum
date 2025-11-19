import { NextRequest, NextResponse } from 'next/server';
import {
  verifyWebhookSignature,
  parseWebhookPayload,
  WebhookVerificationError,
  SettlementWebhookPayload,
  WebhookHeaders,
} from '@/lib/portone-webhook';
import { supabaseServer } from '@/lib/supabase-server';
import { alerts } from '@/lib/alerting';
import { loggers } from '@/lib/error-monitoring';

const PORTONE_WEBHOOK_SECRET = process.env.PORTONE_WEBHOOK_SECRET;

/**
 * POST /api/webhooks/portone/settlements
 *
 * Webhook endpoint for PortOne Platform API settlement status updates
 *
 * This endpoint receives webhooks when settlement status changes occur.
 * It verifies the webhook signature and processes the settlement status update.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check if webhook secret is configured
    if (!PORTONE_WEBHOOK_SECRET) {
      console.error('[Settlement Webhook] PORTONE_WEBHOOK_SECRET not configured');
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
        loggers.webhook.error('Settlement webhook verification failed', error as Error, {
          webhookId: headers['webhook-id'],
          timestamp: headers['webhook-timestamp'],
        });
        await alerts.webhookVerificationFailed('settlement', error as Error);
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }
      throw error;
    }

    // Parse webhook payload
    const payload = parseWebhookPayload<SettlementWebhookPayload>(rawBody);

    console.log('[Settlement Webhook] Received:', {
      type: payload.type,
      settlementId: payload.data.settlementId,
      partnerId: payload.data.partnerId,
      status: payload.data.status,
      timestamp: payload.timestamp,
    });

    // Process settlement webhook based on type
    await processSettlementWebhook(payload);

    const processingTime = Date.now() - startTime;
    console.log(`[Settlement Webhook] Processed successfully in ${processingTime}ms`);

    // Return 200 OK to acknowledge receipt
    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[Settlement Webhook] Error after ${processingTime}ms:`, error);

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
 * Process settlement webhook event
 */
async function processSettlementWebhook(payload: SettlementWebhookPayload) {
  const { type, data } = payload;

  // Handle different settlement event types
  switch (type) {
    case 'Settlement.Scheduled':
      console.log('[Settlement] Status: Scheduled', data.settlementId);
      // TODO: Update internal database with scheduled status
      // TODO: Send notification to academy/admin
      break;

    case 'Settlement.InProcess':
      console.log('[Settlement] Status: In Process', data.settlementId);
      // TODO: Update internal database with in_process status
      break;

    case 'Settlement.Settled':
      console.log('[Settlement] Status: Settled', data.settlementId);
      // TODO: Update internal database with settled status
      // TODO: Trigger any post-settlement workflows
      // TODO: Send settlement completion notification
      break;

    case 'Settlement.PayoutScheduled':
      console.log('[Settlement] Status: Payout Scheduled', data.settlementId);
      // TODO: Update internal database with payout_scheduled status
      // TODO: Notify academy that payout is scheduled
      break;

    case 'Settlement.PaidOut':
      console.log('[Settlement] Status: Paid Out', data.settlementId);
      // TODO: Update internal database with paid_out status
      // TODO: Send final payout confirmation notification
      // TODO: Update accounting records
      break;

    case 'Settlement.Canceled':
      console.log('[Settlement] Status: Canceled', data.settlementId);
      // TODO: Update internal database with canceled status
      // TODO: Investigate cancellation reason
      // TODO: Send cancellation notification
      // TODO: Trigger refund/reversal if needed
      break;

    default:
      // Unknown event type - log but don't fail
      console.warn('[Settlement] Unknown webhook type:', type);
      console.warn('[Settlement] Ignoring unknown event type as per webhook best practices');
  }

  // Log webhook event for audit trail
  await logWebhookEvent({
    type: 'settlement',
    eventType: type,
    settlementId: data.settlementId,
    partnerId: data.partnerId,
    status: data.status,
    timestamp: payload.timestamp,
    amount: data.amount?.settlement,
    rawData: payload,
  });
}

/**
 * Log webhook event for audit and debugging
 */
async function logWebhookEvent(event: {
  type: string;
  eventType: string;
  settlementId: string;
  partnerId: string;
  status: string;
  timestamp: string;
  amount?: number;
  rawData: any;
}) {
  try {
    // Store in database for audit trail
    const { error } = await supabaseServer.from('webhook_events').insert({
      type: event.type,
      event_type: event.eventType,
      entity_id: event.settlementId,
      partner_id: event.partnerId,
      status: event.status,
      amount: event.amount || null,
      currency: 'KRW', // Default to KRW for settlements
      timestamp: event.timestamp,
      processed: true, // Mark as processed immediately after handling
      raw_data: event.rawData,
      webhook_id: null, // Can be extracted from headers if needed
    });

    if (error) {
      loggers.webhook.error('Failed to store webhook event in database', error as Error, {
        settlementId: event.settlementId,
        eventType: event.eventType,
      });
    } else {
      loggers.webhook.info('Webhook event stored in database', {
        type: event.type,
        eventType: event.eventType,
        entityId: event.settlementId,
        partnerId: event.partnerId,
        status: event.status,
      });
    }
  } catch (error) {
    loggers.webhook.error('Exception storing webhook event', error as Error, {
      settlementId: event.settlementId,
    });
  }
}
