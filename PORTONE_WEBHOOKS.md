# PortOne Webhooks Implementation Guide

## Overview

This document describes the PortOne webhook implementation for settlement and payout status updates. Webhooks allow real-time synchronization of settlement and payout statuses from PortOne Platform API.

## Architecture

### Webhook Endpoints

- **Settlement Webhooks**: `/api/webhooks/portone/settlements`
- **Payout Webhooks**: `/api/webhooks/portone/payouts`

### Security

All webhooks implement Standard Webhooks specification for signature verification:
- HMAC-SHA256 signature verification
- Timestamp validation (5-minute tolerance window)
- Replay attack prevention

## Setup

### 1. Environment Variables

Add to `.env.local`:

```bash
# PortOne Webhook Secret (obtained from PortOne Console)
PORTONE_WEBHOOK_SECRET=your_webhook_secret_here

# Alert Configuration (optional)
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_RECIPIENTS=admin@classraum.com,tech@classraum.com
ALERT_EMAIL_FROM=alerts@classraum.com

# Slack Alerts (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

### 2. Configure Webhook URL in PortOne Console

Contact PortOne support (<support.b2b@portone.io>) to configure webhook URLs:

**Test Environment:**
```
https://your-domain.com/api/webhooks/portone/settlements
https://your-domain.com/api/webhooks/portone/payouts
```

**Production Environment:**
```
https://classraum.com/api/webhooks/portone/settlements
https://classraum.com/api/webhooks/portone/payouts
```

### 3. Whitelist PortOne Webhook IP

If using IP filtering, whitelist PortOne's webhook IP:
- **IP Address**: `52.78.5.241`

## Webhook Events

### Settlement Events

| Event Type | Description | Trigger |
|------------|-------------|---------|
| `Settlement.Scheduled` | Settlement has been scheduled | When settlement is first created |
| `Settlement.InProcess` | Settlement is being processed | Settlement processing has started |
| `Settlement.Settled` | Settlement is complete | Funds have been settled |
| `Settlement.PayoutScheduled` | Payout has been scheduled | Payout date scheduled |
| `Settlement.PaidOut` | Funds have been paid out | Bank transfer completed |
| `Settlement.Canceled` | Settlement canceled | Settlement was canceled |

### Payout Events

| Event Type | Description | Trigger |
|------------|-------------|---------|
| `Payout.Scheduled` | Payout scheduled | Payout date set |
| `Payout.Processing` | Payout is being processed | Bank transfer initiated |
| `Payout.Succeeded` | Payout completed successfully | Funds transferred |
| `Payout.Failed` | Payout failed | Transfer failed |
| `Payout.Canceled` | Payout canceled | Payout was canceled |

## Webhook Payload Structure

### Settlement Webhook

```json
{
  "type": "Settlement.Settled",
  "timestamp": "2025-03-20T14:25:10Z",
  "data": {
    "settlementId": "set_1234567890",
    "partnerId": "academy_abc123",
    "paymentId": "payment_xyz789",
    "status": "SETTLED",
    "amount": {
      "order": 100000,
      "settlement": 95000
    },
    "settlementDate": "2025-03-25T00:00:00Z"
  }
}
```

### Payout Webhook

```json
{
  "type": "Payout.Succeeded",
  "timestamp": "2025-03-20T15:30:00Z",
  "data": {
    "payoutId": "payout_9876543210",
    "partnerId": "academy_abc123",
    "status": "SUCCEEDED",
    "amount": 95000,
    "currency": "KRW",
    "scheduledAt": "2025-03-20T00:00:00Z",
    "payoutAt": "2025-03-20T15:30:00Z"
  }
}
```

## Testing

### Manual Testing with curl

#### 1. Generate Test Signature

Use the webhook secret to generate a test signature:

```javascript
// test-webhook-signature.js
const crypto = require('crypto');

const secret = 'your_webhook_secret_here';
const webhookId = 'test-webhook-id';
const timestamp = Math.floor(Date.now() / 1000).toString();
const payload = JSON.stringify({
  type: 'Settlement.Settled',
  timestamp: new Date().toISOString(),
  data: {
    settlementId: 'test_settlement_123',
    partnerId: 'academy_test',
    status: 'SETTLED',
    amount: { order: 100000, settlement: 95000 }
  }
});

const signedContent = `${timestamp}.${webhookId}.${payload}`;
const signature = crypto
  .createHmac('sha256', secret)
  .update(signedContent, 'utf8')
  .digest('base64');

console.log('Payload:', payload);
console.log('Timestamp:', timestamp);
console.log('Webhook ID:', webhookId);
console.log('Signature:', `v1,${signature}`);
```

#### 2. Send Test Webhook

```bash
# Settlement webhook test
curl -X POST https://localhost:3000/api/webhooks/portone/settlements \
  -H "Content-Type: application/json" \
  -H "webhook-id: test-webhook-id" \
  -H "webhook-timestamp: 1234567890" \
  -H "webhook-signature: v1,GENERATED_SIGNATURE_HERE" \
  -d '{"type":"Settlement.Settled","timestamp":"2025-03-20T14:25:10Z","data":{"settlementId":"test_123","partnerId":"academy_test","status":"SETTLED"}}'

# Payout webhook test
curl -X POST https://localhost:3000/api/webhooks/portone/payouts \
  -H "Content-Type: application/json" \
  -H "webhook-id: test-webhook-id" \
  -H "webhook-timestamp: 1234567890" \
  -H "webhook-signature: v1,GENERATED_SIGNATURE_HERE" \
  -d '{"type":"Payout.Succeeded","timestamp":"2025-03-20T15:30:00Z","data":{"payoutId":"test_456","partnerId":"academy_test","status":"SUCCEEDED","amount":95000,"currency":"KRW"}}'
```

### Using PortOne Console Test

1. Log into PortOne Console
2. Navigate to Webhook settings
3. Click "Test" button next to webhook URL
4. Select event type to test
5. Verify webhook is received and processed

### Automated Testing

Create test cases in your test suite:

```typescript
// __tests__/webhooks/settlements.test.ts
import { POST } from '@/app/api/webhooks/portone/settlements/route';
import { verifyWebhookSignature } from '@/lib/portone-webhook';

describe('Settlement Webhook', () => {
  it('should accept valid webhook', async () => {
    // Test implementation
  });

  it('should reject invalid signature', async () => {
    // Test implementation
  });

  it('should reject expired timestamp', async () => {
    // Test implementation
  });
});
```

## Monitoring

### Logs

Webhook processing is logged with the following format:

```
[2025-03-20T14:25:10Z] [INFO] [Webhook] Settlement webhook received
[2025-03-20T14:25:10Z] [INFO] [Settlement] Status: Settled test_settlement_123
[2025-03-20T14:25:10Z] [INFO] [Webhook Event] type=settlement, id=test_settlement_123, status=SETTLED
[2025-03-20T14:25:10Z] [INFO] [Webhook] Processed successfully in 125ms
```

### Alerts

Critical events trigger alerts:

1. **Payout Failures**: CRITICAL alert sent immediately
2. **Webhook Verification Failures**: HIGH alert for potential security issues
3. **Processing Errors**: Logged and alerted based on severity

### Performance Monitoring

Webhook processing time is tracked:
- Average processing time
- 95th percentile
- Slow operation detection (> 5 seconds)

## Error Handling

### Automatic Retry

PortOne automatically retries failed webhooks:
- Total attempts: 5 (initial + 4 retries)
- Retry delays: 5m, 10m, 20m, 40m (with jitter)
- Exponential backoff with equal jitter

### Error Responses

| Status Code | Description | PortOne Action |
|-------------|-------------|----------------|
| 200 | Success | No retry |
| 401 | Invalid signature | No retry |
| 500 | Server error | Retry |

## Implementation Checklist

- [x] Webhook endpoints created
- [x] Signature verification implemented
- [x] Error monitoring system
- [x] Alerting mechanism
- [ ] Database integration for webhook events
- [ ] Email notification integration
- [ ] Slack notification integration
- [ ] Update SettlementManagement UI to show real-time updates
- [ ] Update PayoutHistory UI to show real-time updates
- [ ] Webhook event audit log UI
- [ ] Test with PortOne sandbox environment
- [ ] Deploy to production
- [ ] Configure production webhook URLs with PortOne
- [ ] Monitor for 24 hours post-deployment

## Database Schema Recommendations

### webhook_events table

```sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL, -- 'settlement' or 'payout'
  event_type TEXT NOT NULL, -- 'Settlement.Settled', 'Payout.Succeeded', etc.
  entity_id TEXT NOT NULL, -- settlement_id or payout_id
  partner_id TEXT,
  status TEXT NOT NULL,
  amount NUMERIC,
  currency TEXT,
  timestamp TIMESTAMPTZ NOT NULL, -- event timestamp from webhook
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- server timestamp
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  raw_data JSONB NOT NULL,
  webhook_id TEXT, -- from webhook headers
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_entity ON webhook_events(entity_id);
CREATE INDEX idx_webhook_events_partner ON webhook_events(partner_id);
CREATE INDEX idx_webhook_events_type ON webhook_events(type, event_type);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);
```

## Troubleshooting

### Webhook Not Received

1. Check webhook URL is correctly configured in PortOne Console
2. Verify webhook secret matches between PortOne and environment variables
3. Check firewall/IP filtering allows PortOne IP (52.78.5.241)
4. Review server logs for incoming requests
5. Test with PortOne Console test function

### Signature Verification Failures

1. Verify `PORTONE_WEBHOOK_SECRET` matches PortOne Console
2. Check for whitespace in environment variable
3. Ensure raw body is used for verification (not parsed JSON)
4. Verify webhook timestamp is within 5-minute tolerance
5. Check system clock is synchronized

### Webhook Processing Errors

1. Review error logs for stack traces
2. Check database connectivity
3. Verify all required environment variables are set
4. Test with curl to isolate PortOne vs code issues
5. Enable detailed logging temporarily

## Support

For PortOne webhook issues:
- **Email**: support.b2b@portone.io
- **Documentation**: https://developers.portone.io/platform/ko/guides/webhook

For Classraum implementation issues:
- **Internal**: Contact tech team
- **Logs**: Check CloudWatch/application logs
- **Alerts**: Review alert emails and Slack notifications
