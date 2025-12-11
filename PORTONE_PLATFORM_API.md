# PortOne Platform API Integration Guide

## Overview

This document describes the PortOne Platform API integration for settlement and payout data synchronization. Since **PortOne Platform API does not support webhooks for settlements and payouts**, we use an **API polling approach** to fetch and sync data to our database.

> **Note**: PortOne Platform API only supports webhooks for **Tax Invoices**, not for settlements or payouts. For real-time payment updates (invoices, subscriptions), see the existing `/api/payments/webhook` endpoint which uses the V2 Payment API.

## Architecture

### API Polling Service

- **API Client**: `src/lib/portone-platform-api.ts`
- **Sync Service**: `src/lib/portone-sync-service.ts`
- **Sync Trigger**: `src/app/api/portone/sync/route.ts`

### How It Works

1. **Scheduled or Manual Trigger**: Cron job or manual API call triggers sync
2. **Fetch from PortOne**: Service calls PortOne Platform API endpoints
3. **Store in Database**: Settlement and payout data stored in `webhook_events` table
4. **Alert on Failures**: Failed payouts trigger critical alerts

## Setup

### 1. Environment Variables

Add to `.env.local`:

```bash
# PortOne Platform API Credentials
PORTONE_API_SECRET=your_api_secret_here
PORTONE_STORE_ID=your_store_id_here

# Alert Configuration (optional)
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_RECIPIENTS=admin@classraum.com,tech@classraum.com
ALERT_EMAIL_FROM=alerts@classraum.com

# Slack Alerts (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

### 2. Get API Credentials

1. Log into PortOne Console
2. Navigate to Settings → API Keys
3. Copy your API Secret and Store ID
4. Add to environment variables

### 3. Configure Cron Job (Recommended)

For automatic syncing, configure a cron job in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/portone/sync",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

This runs the sync every 6 hours. Adjust the schedule as needed:
- `0 */6 * * *` - Every 6 hours
- `0 */1 * * *` - Every hour
- `0 0 * * *` - Once daily at midnight

## API Endpoints

### PortOne Platform API Endpoints (External)

These are the PortOne API endpoints we call:

- **Get Settlements**: `GET https://api.portone.io/platform/partner-settlements`
- **Get Single Settlement**: `GET https://api.portone.io/platform/partner-settlements/{id}`
- **Get Payouts**: `GET https://api.portone.io/platform/payouts`
- **Get Single Payout**: `GET https://api.portone.io/platform/payouts/{id}`

### Our Sync API Endpoint

- **Trigger Sync**: `POST /api/portone/sync`
- **Get Endpoint Info**: `GET /api/portone/sync`

## Settlement & Payout Statuses

### Settlement Statuses

| Status | Description | Next Status |
|--------|-------------|-------------|
| `SCHEDULED` | Settlement scheduled | IN_PROCESS |
| `IN_PROCESS` | Being processed | SETTLED |
| `SETTLED` | Settlement complete | PAYOUT_SCHEDULED |
| `PAYOUT_SCHEDULED` | Payout scheduled | PAID_OUT |
| `PAID_OUT` | Funds paid out | (final) |
| `CANCELED` | Settlement canceled | (final) |

### Payout Statuses

| Status | Description | Action |
|--------|-------------|--------|
| `SCHEDULED` | Payout scheduled | None |
| `PROCESSING` | Being processed | None |
| `SUCCEEDED` | Payout completed | None |
| `FAILED` | Payout failed | **Alert sent** |
| `CANCELED` | Payout canceled | None |

## Data Structure

### Settlement Data

```typescript
interface PlatformPartnerSettlement {
  id: string;
  partnerId: string;
  paymentId?: string;
  status: PlatformPartnerSettlementStatus;
  settlementAmount: number;
  settlementCurrency: string;
  settlementDate?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Payout Data

```typescript
interface PlatformPayout {
  id: string;
  partnerId: string;
  status: PlatformPayoutStatus;
  amount: number;
  currency: string;
  scheduledAt?: string;
  payoutAt?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}
```

## Usage

### Automatic Sync (Recommended)

Set up a cron job as described above. The sync will run automatically at the scheduled interval.

### Manual Sync via API

#### Trigger Full Sync (Last 7 Days)

```bash
curl -X POST https://classraum.com/api/portone/sync
```

#### Sync with Custom Date Range

```bash
curl -X POST "https://classraum.com/api/portone/sync?since=2025-11-01T00:00:00Z&limit=50"
```

**Parameters:**
- `since`: ISO 8601 date string (default: 7 days ago)
- `limit`: Number of items per request (default: 100)

#### Response Example

```json
{
  "success": true,
  "duration": 1245,
  "settlements": {
    "synced": 15,
    "errors": 0
  },
  "payouts": {
    "synced": 8,
    "errors": 0
  },
  "message": "Sync completed successfully"
}
```

### Manual Sync via Code

```typescript
import { syncAll, syncSettlements, syncPayouts } from '@/lib/portone-sync-service';

// Sync both settlements and payouts
const result = await syncAll({
  since: new Date('2025-11-01'),
  limit: 100,
});

// Sync only settlements
const settlements = await syncSettlements({
  since: new Date('2025-11-01'),
  limit: 50,
});

// Sync only payouts
const payouts = await syncPayouts({
  since: new Date('2025-11-01'),
  limit: 50,
});
```

## Testing

### 1. Test Script

Run the test script to verify sync functionality:

```bash
node scripts/test-portone-sync.js
```

This will:
1. Test the GET endpoint (info)
2. Trigger a POST sync
3. Display results

### 2. Check Database

After syncing, verify data in Supabase:

```sql
-- View all synced settlements
SELECT * FROM webhook_events
WHERE type = 'settlement'
ORDER BY timestamp DESC;

-- View all synced payouts
SELECT * FROM webhook_events
WHERE type = 'payout'
ORDER BY timestamp DESC;

-- Check for failed payouts
SELECT * FROM webhook_events
WHERE type = 'payout' AND status = 'FAILED';

-- View sync statistics
SELECT
  type,
  status,
  COUNT(*) as count
FROM webhook_events
WHERE type IN ('settlement', 'payout')
GROUP BY type, status;
```

### 3. Monitor Logs

Check application logs for sync activity:

```
[Settlement] Starting settlement sync from PortOne API
[Settlement] Fetched 15 settlements from PortOne API
[Settlement] Settlement stored in database settlementId=set_123
[Settlement] Settlement sync completed in 1245ms
[Payout] Starting payout sync from PortOne API
[Payout] Fetched 8 payouts from PortOne API
[Payout] Payout stored in database payoutId=pay_456
[Payout] Payout sync completed in 892ms
```

## Database Schema

### webhook_events Table

We reuse the existing `webhook_events` table for both webhook data (from Payment API) and polling data (from Platform API):

```sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL, -- 'payment', 'settlement', 'payout'
  event_type TEXT NOT NULL, -- 'Settlement.SETTLED', 'Payout.FAILED', etc.
  entity_id TEXT NOT NULL, -- settlement_id or payout_id
  partner_id TEXT,
  status TEXT NOT NULL,
  amount NUMERIC,
  currency TEXT,
  timestamp TIMESTAMPTZ NOT NULL, -- event timestamp
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- when we received/fetched it
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  raw_data JSONB NOT NULL, -- full settlement or payout object
  webhook_id TEXT, -- NULL for API-polled data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_id, type) -- Prevent duplicates
);
```

**Key Fields:**
- `type`: Identifies data source (`settlement` or `payout`)
- `entity_id`: Settlement ID or Payout ID
- `webhook_id`: NULL for API-polled data (vs webhook data)
- `raw_data`: Complete settlement/payout object from PortOne
- Unique constraint on `(entity_id, type)` prevents duplicates

## Monitoring

### Logs

All sync operations are logged:

```
[Settlement] Starting settlement sync from PortOne API
[Settlement] Fetched 15 settlements from PortOne API
[Settlement] Settlement stored in database settlementId=set_123
[Settlement] Settlement sync completed in 1245ms synced=15 errors=0
```

### Alerts

Critical events trigger alerts:

1. **Payout Failures**: CRITICAL alert when payout status is FAILED
2. **Sync Failures**: Error logs if sync encounters issues
3. **API Errors**: Error logs if PortOne API returns errors

### Performance Tracking

- Sync duration tracked for each operation
- Metrics include: synced count, error count, duration
- Slow operations (>5s) logged as warnings

## Error Handling

### Duplicate Prevention

The service automatically prevents duplicates:
- Checks if entity already exists before inserting
- Only updates if status has changed
- Uses upsert with conflict resolution on `(entity_id, type)`

### Partial Failure Handling

If some items fail to sync:
- Successful items are still stored
- Failed items are logged with error details
- Returns statistics: `{ synced: 15, errors: 2 }`

### API Error Handling

If PortOne API returns errors:
- Error is logged with full details
- Sync operation throws error
- Can be retried manually or by next cron job

## Best Practices

### Sync Frequency

**Recommended**: Sync every 6 hours
- Balances data freshness with API usage
- Sufficient for most settlement/payout workflows
- Reduces unnecessary API calls

**For Time-Sensitive Operations**: Sync every 1 hour
- More up-to-date data
- Higher API usage

**For Low-Volume Operations**: Sync once daily
- Minimal API usage
- Sufficient if real-time updates not critical

### Date Range

**Default**: Last 7 days
- Catches any status changes in recent settlements/payouts
- Covers typical settlement/payout cycle
- Reasonable data volume

**For Initial Setup**: Sync larger date range
```bash
curl -X POST "https://classraum.com/api/portone/sync?since=2025-01-01T00:00:00Z&limit=500"
```

### Monitoring

1. Set up alerts for failed syncs
2. Monitor sync duration for performance issues
3. Review error logs regularly
4. Check database growth over time

## Troubleshooting

### Sync Returns Zero Items

**Possible Causes:**
1. No settlements/payouts in date range
2. Invalid API credentials
3. Wrong Store ID

**Solutions:**
1. Check PortOne Console for recent settlements/payouts
2. Verify `PORTONE_API_SECRET` and `PORTONE_STORE_ID`
3. Try broader date range

### API Authentication Errors

**Error**: `401 Unauthorized`

**Solutions:**
1. Verify API Secret is correct
2. Check for whitespace in environment variable
3. Ensure API key has Platform API permissions
4. Contact PortOne support if key is valid

### Database Errors

**Error**: Duplicate key violation

**Cause**: Rare race condition in concurrent syncs

**Solution**:
- Sync endpoint is idempotent, safe to retry
- Check unique constraint on webhook_events table

### Slow Sync Performance

**If sync takes > 5 seconds:**

1. Reduce `limit` parameter (default: 100)
2. Reduce date range with `since` parameter
3. Check PortOne API status
4. Review database query performance

## Implementation Checklist

- [x] API client created (`portone-platform-api.ts`)
- [x] Sync service created (`portone-sync-service.ts`)
- [x] Sync API endpoint created (`/api/portone/sync`)
- [x] Error monitoring integrated
- [x] Alerting for failed payouts
- [x] Database integration (reusing webhook_events table)
- [x] Test script created
- [ ] Set up cron job in `vercel.json`
- [ ] Configure environment variables in production
- [ ] Test sync in staging environment
- [ ] Monitor first 24 hours after deployment
- [ ] Update SettlementManagement UI to display synced data
- [ ] Update PayoutHistory UI to display synced data
- [ ] Create admin UI to trigger manual sync

## Support

### PortOne Platform API

- **Documentation**: https://developers.portone.io/platform
- **Support Email**: support.b2b@portone.io
- **API Base URL**: https://api.portone.io

### Internal Support

- **Logs**: Check application logs for sync activity
- **Database**: Query `webhook_events` table for synced data
- **Alerts**: Review email/Slack alerts for critical issues

## Related Documentation

- [PortOne Payment Webhook](./PORTONE_WEBHOOKS.md) - V2 Payment API webhooks (archived)
- [Error Monitoring](./src/lib/error-monitoring.ts) - Logging system
- [Alerting](./src/lib/alerting.ts) - Alert configuration
