# Academy Subscription Billing Setup

## Summary

Successfully implemented recurring subscription billing for academies using PortOne V2 billing keys with KG Inicis.

---

## What Was Implemented

### 1. Database Migration
**File**: `database/migrations/005_add_billing_key_to_subscriptions.sql`

Added columns to store billing keys:
- `billing_key`: PortOne billing key for recurring payments
- `billing_key_issued_at`: Timestamp when billing key was issued
- Indexes for fast billing key and next_billing_date lookups

**To Apply**: Run this migration in Supabase SQL Editor

### 2. Subscription Subscribe API
**File**: `src/app/api/subscription/subscribe/route.ts`

Handles subscription signup:
- Receives billing key from frontend
- Creates/updates `academy_subscriptions` record
- Optionally makes initial payment immediately
- Updates academy tier

**Endpoint**: `POST /api/subscription/subscribe`

**Request Body**:
```json
{
  "billingKey": "billing_key_xxx",
  "planTier": "pro",
  "billingCycle": "monthly",
  "makeInitialPayment": true
}
```

### 3. Subscription Page (Frontend)
**File**: `src/app/(app)/dashboard/subscription/page.tsx`

Features:
- Displays all subscription plans (free, basic, pro, enterprise)
- Monthly/yearly billing cycle toggle
- PortOne billing key popup integration
- Sends billing key to backend API
- Auto-refreshes after successful subscription

**Route**: `/dashboard/subscription`

### 4. Webhook Handler Updates
**File**: `src/app/api/payments/webhook/route.ts` (MODIFIED)

Added subscription payment detection:
- Checks if `paymentId` contains `subscription_`
- Extracts subscription ID from payment ID
- Updates `academy_subscriptions` table (status, last_payment_date)
- Creates/updates `subscription_invoices` records
- Handles PAID, FAILED, and CANCELLED statuses

### 5. Subscription Billing Cron Job
**File**: `src/app/api/cron/subscription-billing/route.ts`

Runs daily at 8 AM KST:
- Queries subscriptions where `next_billing_date <= today`
- Charges billing key via PortOne API
- Creates subscription invoices
- Updates subscription with new billing dates
- Marks failed payments as `past_due`

**Schedule**: Daily at 8:00 AM (vercel.json)

### 6. Subscription Cancel API
**File**: `src/app/api/subscription/cancel/route.ts`

Allows managers to cancel subscriptions:
- Sets `auto_renew = false`
- Subscription remains active until current period ends
- No refunds, just prevents future billing

**Endpoint**: `POST /api/subscription/cancel`

### 7. Vercel Cron Configuration
**File**: `vercel.json` (MODIFIED)

Added subscription billing cron:
```json
{
  "path": "/api/cron/subscription-billing",
  "schedule": "0 8 * * *"
}
```

---

## Payment Flow

### Initial Subscription
1. Manager visits `/dashboard/subscription`
2. Selects plan (Basic/Pro/Enterprise) and billing cycle
3. Clicks "구독하기" button
4. PortOne popup opens for billing key issuance
5. User enters card information
6. Billing key issued and sent to backend
7. Backend saves billing key to `academy_subscriptions`
8. Backend makes initial payment immediately (optional)
9. Subscription activated with `next_billing_date` set

### Recurring Billing
1. **Daily Cron Job** runs at 8 AM
2. Finds subscriptions where `next_billing_date <= today`
3. Charges billing key via PortOne API:
   ```
   POST https://api.portone.io/payments/{paymentId}/billing-key
   Body: { billingKey, orderName, amount: { total } }
   ```
4. On success:
   - Creates `subscription_invoices` record (status: 'paid')
   - Updates `academy_subscriptions`:
     - `last_payment_date`: now
     - `next_billing_date`: +1 month or +1 year
     - `current_period_start/end`: updated
5. On failure:
   - Marks subscription as `past_due`
   - Creates failed invoice record
   - Retry logic can be added later

### Webhook Confirmation
1. PortOne sends webhook to `/api/payments/webhook`
2. Webhook detects `subscription_` in payment ID
3. Updates subscription status and invoice records
4. Provides redundancy in case cron job response is lost

---

## Database Tables Updated

### `academy_subscriptions`
**New Columns**:
- `billing_key` (TEXT): PortOne billing key
- `billing_key_issued_at` (TIMESTAMPTZ): When billing key was issued

**Updated Fields** (on payment):
- `status`: 'active', 'past_due', etc.
- `last_payment_date`: Timestamp of last successful payment
- `next_billing_date`: Date of next billing charge
- `current_period_start/end`: Current subscription period

### `subscription_invoices`
**Created Records** (on each payment):
- `kg_transaction_id`: PortOne payment ID
- `status`: 'paid', 'failed', 'refunded'
- `amount`: Charged amount
- `paid_at` / `failed_at`: Timestamps
- `billing_period_start/end`: Billing period for this invoice

---

## Environment Variables

```env
# Already configured in .env.local ✅
PORTONE_STORE_ID=store-ad93c530-701d-4592-8dbf-cea93576b412
PORTONE_API_SECRET=Classraum
PORTONE_API_KEY=rR77jue7RBFX163zQ1puXD5FiGdsHesffW3HAiQs4f96LKedPg9qPb6EaFJEhEMrbMP5ZFZIGUkyaYxO
NEXT_PUBLIC_PORTONE_STORE_ID=store-ad93c530-701d-4592-8dbf-cea93576b412

# Billing channel for subscriptions ✅
NEXT_PUBLIC_PORTONE_CHANNEL_KEY_BILLING_LIVE=channel-key-9c4c6316-e34f-44e1-bef0-902322b8a4e3

# Webhook secret (already registered) ✅
PORTONE_WEBHOOK_SECRET=whsec_EH2du7Hz70E3WPHrqRThRnqfrTQ2l9WAVH9eJpRgyuY=
```

---

## Testing Checklist

### Before Testing
- [ ] Run database migration: `005_add_billing_key_to_subscriptions.sql`
- [ ] Deploy code to Vercel or test locally
- [ ] Ensure webhook is registered in PortOne console
- [ ] Verify environment variables are set in Vercel

### Test Flow
1. **Visit Subscription Page**
   - Go to `/dashboard/subscription`
   - Verify plans are displayed correctly
   - Monthly/yearly toggle works

2. **Subscribe to a Plan**
   - Click "구독하기" on Pro plan
   - PortOne popup opens
   - Enter test card: `4111 1111 1111 1111`, expiry: any future date, CVV: 123
   - Verify billing key issuance succeeds
   - Check `academy_subscriptions` table has `billing_key` filled
   - Verify initial payment is made (check PortOne console)

3. **Check Database**
   ```sql
   -- Verify subscription record
   SELECT * FROM academy_subscriptions WHERE academy_id = 'your-academy-id';

   -- Verify initial invoice
   SELECT * FROM subscription_invoices WHERE subscription_id = 'your-subscription-id';
   ```

4. **Test Webhook**
   - Make payment via subscription page
   - Check webhook logs in Vercel
   - Verify `academy_subscriptions.status` is 'active'
   - Verify `subscription_invoices.status` is 'paid'

5. **Test Cron Job**
   - Manually call: `curl https://yourdomain.com/api/cron/subscription-billing`
   - Or wait until 8 AM KST
   - Check logs for successful billing
   - Verify `next_billing_date` is updated (+1 month)

6. **Test Cancellation**
   - Call `POST /api/subscription/cancel`
   - Verify `auto_renew` is set to `false`
   - Verify subscription remains active until `current_period_end`

---

## Important Notes

### PortOne Billing Key Requirements (from official docs)
- **정기 구독 전용**: Billing keys can ONLY be used for regular subscriptions
- **비정기 결제 불가**: Cannot use for irregular payments
- **카드사 심사 필요**: Card companies require approval for billing key usage

### Payment vs Billing Channels
- **Payment Channel** (`NEXT_PUBLIC_PORTONE_CHANNEL_KEY_PAYMENT_LIVE`):
  - For student/parent invoice payments
  - One-time payments
- **Billing Channel** (`NEXT_PUBLIC_PORTONE_CHANNEL_KEY_BILLING_LIVE`):
  - For academy subscription recurring payments
  - Billing key issuance and charging

### Retry Logic for Failed Payments
Currently, failed payments are marked as `past_due` with no automatic retry. Consider adding:
- Retry after 3 days
- Retry after 7 days
- Final cancellation after 14 days
- Email notifications to academy managers

### Webhook Redundancy
The webhook provides redundancy in case the cron job's API response is lost or delayed. Both cron job and webhook update the same tables, but this is safe due to idempotent operations.

---

## Next Steps

### Recommended Enhancements
1. **Email Notifications**
   - Payment successful notification
   - Payment failed notification
   - Subscription expiring soon (7 days before)
   - Subscription cancelled confirmation

2. **Admin Dashboard**
   - View all academy subscriptions
   - Manually retry failed payments
   - Refund processing
   - Subscription analytics

3. **Subscription Management UI**
   - View current plan details
   - View payment history
   - Change billing cycle
   - Update payment method (issue new billing key)
   - Download invoices

4. **Webhook Signature Validation**
   - Currently validates signature if `PORTONE_WEBHOOK_SECRET` is set
   - Ensure this is always validated in production

5. **Failed Payment Retry Logic**
   - Implement exponential backoff
   - Maximum retry attempts
   - Email notifications on each failure

---

## Troubleshooting

### Billing Key Not Saved
- Check browser console for errors
- Verify PortOne SDK is loaded: `@portone/browser-sdk/v2`
- Check billing channel key is correct
- Ensure user is authenticated as manager

### Initial Payment Fails
- Verify billing key was issued successfully
- Check PortOne API secret is correct
- Check card has sufficient funds
- Review PortOne console for error details

### Cron Job Not Running
- Check Vercel cron logs in dashboard
- Verify cron schedule is correct in `vercel.json`
- Check function timeout (currently 60s max)
- Ensure `user-agent` check allows `vercel-cron/1.0`

### Webhook Not Updating Subscription
- Check webhook is registered in PortOne console
- Verify webhook signature validation
- Check webhook logs in Vercel
- Ensure payment ID contains `subscription_` prefix

### Database Migration Fails
- Check if columns already exist
- Verify Supabase connection
- Run migration in Supabase SQL Editor directly
- Check for any foreign key constraint errors

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/subscription/plans` | GET | Get all subscription plans |
| `/api/subscription/subscribe` | POST | Subscribe to a plan (save billing key) |
| `/api/subscription/status` | GET | Get current subscription status |
| `/api/subscription/cancel` | POST | Cancel subscription (disable auto_renew) |
| `/api/cron/subscription-billing` | GET/POST | Cron job to charge billing keys |
| `/api/payments/webhook` | POST | PortOne webhook for payment updates |

---

## Files Created/Modified

### New Files (7)
1. `database/migrations/005_add_billing_key_to_subscriptions.sql`
2. `src/app/(app)/dashboard/subscription/page.tsx`
3. `src/app/api/subscription/subscribe/route.ts`
4. `src/app/api/subscription/cancel/route.ts`
5. `src/app/api/cron/subscription-billing/route.ts`
6. `SUBSCRIPTION_BILLING_SETUP.md` (this file)
7. `PORTONE_SETUP.md` (existing, documents invoice payments)

### Modified Files (2)
1. `src/app/api/payments/webhook/route.ts` - Added subscription payment handling
2. `vercel.json` - Added subscription-billing cron job

---

## Support

For issues with:
- **PortOne Integration**: https://developers.portone.io
- **KG Inicis**: Contact your KG Inicis representative
- **Vercel Cron Jobs**: https://vercel.com/docs/cron-jobs

---

## Changelog

### 2025-01-16 - Initial Implementation
- ✅ Database migration for billing keys
- ✅ Subscription subscribe API
- ✅ Subscription page with PortOne popup
- ✅ Webhook handler for subscription payments
- ✅ Subscription billing cron job
- ✅ Subscription cancel API
- ✅ Vercel cron configuration

### Future Updates
- ⏳ Email notifications
- ⏳ Retry logic for failed payments
- ⏳ Subscription management dashboard
- ⏳ Invoice download functionality
