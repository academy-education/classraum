/**
 * Test Webhook Signature Generator
 *
 * This script generates valid webhook signatures for testing PortOne webhooks locally.
 *
 * Usage:
 *   node scripts/test-webhook-signature.js settlement
 *   node scripts/test-webhook-signature.js payout
 */

const crypto = require('crypto');

// Get webhook secret from environment or use default test secret
const secret = process.env.PORTONE_WEBHOOK_SECRET || 'test_webhook_secret_12345';

// Determine webhook type from command line argument
const webhookType = process.argv[2] || 'settlement';

// Generate webhook data
const webhookId = `test-${webhookType}-${Date.now()}`;
const timestamp = Math.floor(Date.now() / 1000).toString();

// Create payload based on type
let payload;

if (webhookType === 'settlement') {
  payload = {
    type: 'Settlement.Settled',
    timestamp: new Date().toISOString(),
    data: {
      settlementId: `test_settlement_${Date.now()}`,
      partnerId: 'academy_test_123',
      paymentId: `payment_${Date.now()}`,
      status: 'SETTLED',
      amount: {
        order: 100000,
        settlement: 95000,
      },
      settlementDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
    },
  };
} else if (webhookType === 'payout') {
  payload = {
    type: 'Payout.Succeeded',
    timestamp: new Date().toISOString(),
    data: {
      payoutId: `test_payout_${Date.now()}`,
      partnerId: 'academy_test_123',
      status: 'SUCCEEDED',
      amount: 95000,
      currency: 'KRW',
      scheduledAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      payoutAt: new Date().toISOString(),
    },
  };
} else if (webhookType === 'payout-failed') {
  payload = {
    type: 'Payout.Failed',
    timestamp: new Date().toISOString(),
    data: {
      payoutId: `test_payout_failed_${Date.now()}`,
      partnerId: 'academy_test_123',
      status: 'FAILED',
      amount: 95000,
      currency: 'KRW',
      scheduledAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      failureReason: 'Invalid bank account information',
    },
  };
} else {
  console.error(`Unknown webhook type: ${webhookType}`);
  console.error('Valid types: settlement, payout, payout-failed');
  process.exit(1);
}

const payloadString = JSON.stringify(payload, null, 2);

// Generate signature
const signedContent = `${timestamp}.${webhookId}.${JSON.stringify(payload)}`;
const signature = crypto
  .createHmac('sha256', secret)
  .update(signedContent, 'utf8')
  .digest('base64');

const webhookSignature = `v1,${signature}`;

// Determine endpoint
const endpoint = webhookType.startsWith('payout')
  ? '/api/webhooks/portone/payouts'
  : '/api/webhooks/portone/settlements';

// Print results
console.log('\n=== PortOne Webhook Test Data ===\n');
console.log('Webhook Type:', webhookType);
console.log('Endpoint:', endpoint);
console.log('Secret:', secret.substring(0, 10) + '...');
console.log('\nWebhook Headers:');
console.log('  webhook-id:', webhookId);
console.log('  webhook-timestamp:', timestamp);
console.log('  webhook-signature:', webhookSignature);
console.log('\nPayload:');
console.log(payloadString);
console.log('\n=== cURL Command ===\n');
console.log(`curl -X POST http://localhost:3000${endpoint} \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "webhook-id: ${webhookId}" \\`);
console.log(`  -H "webhook-timestamp: ${timestamp}" \\`);
console.log(`  -H "webhook-signature: ${webhookSignature}" \\`);
console.log(`  -d '${JSON.stringify(payload)}'`);
console.log('\n=== End ===\n');

// Also save to file for easy reference
const fs = require('fs');
const outputFile = `test-webhook-${webhookType}-${Date.now()}.json`;
const output = {
  webhookType,
  endpoint,
  headers: {
    'webhook-id': webhookId,
    'webhook-timestamp': timestamp,
    'webhook-signature': webhookSignature,
  },
  payload,
  curlCommand: `curl -X POST http://localhost:3000${endpoint} -H "Content-Type: application/json" -H "webhook-id: ${webhookId}" -H "webhook-timestamp: ${timestamp}" -H "webhook-signature: ${webhookSignature}" -d '${JSON.stringify(payload)}'`,
};

fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
console.log(`Test data saved to: ${outputFile}\n`);
