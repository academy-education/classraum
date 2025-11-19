/**
 * PortOne Webhook Verification Utility
 *
 * Based on Standard Webhooks specification
 * https://www.standardwebhooks.com/
 */

import crypto from 'crypto';

const WEBHOOK_TOLERANCE_SECONDS = 300; // 5 minutes

export interface WebhookHeaders {
  'webhook-id': string;
  'webhook-signature': string;
  'webhook-timestamp': string;
}

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookVerificationError';
  }
}

/**
 * Verify webhook signature using Standard Webhooks specification
 * @param secret - Webhook secret from PortOne console
 * @param payload - Raw webhook body as string
 * @param headers - Webhook headers containing id, signature, and timestamp
 * @returns true if verification succeeds
 * @throws WebhookVerificationError if verification fails
 */
export function verifyWebhookSignature(
  secret: string,
  payload: string,
  headers: WebhookHeaders
): boolean {
  const webhookId = headers['webhook-id'];
  const webhookSignature = headers['webhook-signature'];
  const webhookTimestamp = headers['webhook-timestamp'];

  if (!webhookId || !webhookSignature || !webhookTimestamp) {
    throw new WebhookVerificationError('Missing required webhook headers');
  }

  // Check timestamp to prevent replay attacks
  const timestamp = parseInt(webhookTimestamp, 10);
  const now = Math.floor(Date.now() / 1000);

  if (isNaN(timestamp)) {
    throw new WebhookVerificationError('Invalid webhook timestamp');
  }

  if (Math.abs(now - timestamp) > WEBHOOK_TOLERANCE_SECONDS) {
    throw new WebhookVerificationError('Webhook timestamp outside tolerance window');
  }

  // Parse signature(s) - format is "v1,signature1 v1,signature2"
  const signatures = webhookSignature.split(' ')
    .map(sig => {
      const [version, signature] = sig.split(',');
      return { version, signature };
    })
    .filter(sig => sig.version === 'v1');

  if (signatures.length === 0) {
    throw new WebhookVerificationError('No valid v1 signatures found');
  }

  // Compute expected signature
  // Format: {timestamp}.{webhookId}.{payload}
  const signedContent = `${webhookTimestamp}.${webhookId}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedContent, 'utf8')
    .digest('base64');

  // Compare with provided signatures (constant-time comparison)
  const isValid = signatures.some(sig => {
    try {
      const sigBuffer = Buffer.from(sig.signature, 'base64');
      const expectedBuffer = Buffer.from(expectedSignature, 'base64');
      return sigBuffer.length === expectedBuffer.length &&
             crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    } catch {
      return false;
    }
  });

  if (!isValid) {
    throw new WebhookVerificationError('Invalid webhook signature');
  }

  return true;
}

/**
 * Parse webhook payload
 * @param payload - Raw webhook body as string
 * @returns Parsed JSON object
 */
export function parseWebhookPayload<T = any>(payload: string): T {
  try {
    return JSON.parse(payload);
  } catch (error) {
    throw new WebhookVerificationError('Invalid JSON payload');
  }
}

/**
 * Webhook event types for settlements
 */
export type SettlementWebhookType =
  | 'Settlement.Scheduled'
  | 'Settlement.InProcess'
  | 'Settlement.Settled'
  | 'Settlement.PayoutScheduled'
  | 'Settlement.PaidOut'
  | 'Settlement.Canceled';

/**
 * Webhook event types for payouts
 */
export type PayoutWebhookType =
  | 'Payout.Scheduled'
  | 'Payout.Processing'
  | 'Payout.Succeeded'
  | 'Payout.Failed'
  | 'Payout.Canceled';

export interface SettlementWebhookPayload {
  type: SettlementWebhookType;
  timestamp: string;
  data: {
    settlementId: string;
    partnerId: string;
    paymentId?: string;
    status: string;
    amount?: {
      order: number;
      settlement: number;
    };
    settlementDate?: string;
  };
}

export interface PayoutWebhookPayload {
  type: PayoutWebhookType;
  timestamp: string;
  data: {
    payoutId: string;
    partnerId: string;
    status: string;
    amount: number;
    currency: string;
    scheduledAt?: string;
    payoutAt?: string;
    failureReason?: string;
  };
}
