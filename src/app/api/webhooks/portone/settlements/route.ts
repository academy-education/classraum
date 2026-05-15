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

    // Idempotency check — PortOne retries on 5xx, and we deliberately
    // return 500 on processing errors. Without this, repeated deliveries
    // produce duplicate audit rows and (once side-effecting handlers land)
    // would fire notifications/refunds twice. The webhook-id header is the
    // natural idempotency key; check for an existing row before processing.
    const webhookId = headers['webhook-id'];
    if (webhookId) {
      const { data: existing } = await supabaseServer
        .from('webhook_events')
        .select('id')
        .eq('webhook_id', webhookId)
        .maybeSingle();
      if (existing) {
        loggers.webhook.info('Settlement webhook already processed; skipping', {
          webhookId,
        });
        return NextResponse.json({
          success: true,
          message: 'Already processed (idempotent)',
        });
      }
    }

    // Process settlement webhook based on type
    await processSettlementWebhook(payload, webhookId);


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
async function processSettlementWebhook(payload: SettlementWebhookPayload, webhookId: string) {
  const { type, data } = payload;

  // Handle different settlement event types
  switch (type) {
    case 'Settlement.Scheduled':
    case 'Settlement.InProcess':
    case 'Settlement.Settled':
    case 'Settlement.PayoutScheduled':
    case 'Settlement.PaidOut':
      // Status tracked via webhook_events table (logged below)
      // Future: update dedicated settlements table, send notifications to academy
      break;

    case 'Settlement.Canceled':
      console.error('[Settlement] Canceled:', data.settlementId);
      // Future: send cancellation notification, trigger refund/reversal if needed
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
    webhookId,
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
  webhookId: string;
}) {
  try {
    // Store in database for audit trail. webhook_id is stored to support
    // idempotency — a unique partial index on (webhook_id) where not null
    // ensures duplicate deliveries error at the DB layer; we swallow that
    // specific error and treat it as a successful no-op.
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
      webhook_id: event.webhookId || null,
    });

    if (error) {
      // 23505 = unique_violation. Treat as a benign retry of an already-
      // logged event. Anything else is a real DB problem worth surfacing.
      if ((error as { code?: string }).code === '23505') {
        loggers.webhook.info('Settlement webhook event already logged (race-loss)', {
          webhookId: event.webhookId,
          settlementId: event.settlementId,
        });
        return;
      }
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
