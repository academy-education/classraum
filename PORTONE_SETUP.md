# PortOne Live Payment Setup

## Summary

Successfully migrated from test channel to live KG Inicis payment channels.

## Changes Made

### 1. Created PortOne Configuration Utility
**File**: `src/lib/portone-config.ts`

- Centralizes all PortOne credentials
- Manages two separate channel keys:
  - `paymentChannelKey`: For invoice payments (student/parent)
  - `billingChannelKey`: For subscription recurring payments (academy)
- Includes validation function

### 2. Updated Payment Pages

**Files Updated**:
- `src/app/mobile/invoice/[id]/pay/page.tsx`
- `src/components/payments/payment-button.tsx`
- `src/lib/portone.ts`

**Changes**:
- Removed hardcoded test channel key: `channel-key-8bb588e1-00e4-4a9f-a4e0-5351692dc4e6`
- Now uses `getPortOneConfig().paymentChannelKey` for live payments
- Automatic validation of environment variables

## Environment Variables Required

Add these to your `.env.local`:

```env
# Existing (same for test and live)
PORTONE_STORE_ID=store-ad93c530-701d-4592-8dbf-cea93576b412
PORTONE_API_SECRET=Classraum
PORTONE_API_KEY=rR77jue7RBFX163zQ1puXD5FiGdsHesffW3HAiQs4f96LKedPg9qPb6EaFJEhEMrbMP5ZFZIGUkyaYxO
NEXT_PUBLIC_PORTONE_STORE_ID=store-ad93c530-701d-4592-8dbf-cea93576b412

# NEW - Live Channel Keys
# Get from PortOne Console → Channels → KG Inicis Single Payment
NEXT_PUBLIC_PORTONE_CHANNEL_KEY_PAYMENT_LIVE=your-payment-channel-key-here

# Get from PortOne Console → Channels → KG Inicis Billing
NEXT_PUBLIC_PORTONE_CHANNEL_KEY_BILLING_LIVE=your-billing-channel-key-here
```

## How to Get Live Channel Keys

1. Login to **PortOne Admin Console**: https://admin.portone.io
2. Go to **결제 연동** (Payment Integration) → **채널 관리** (Channel Management)
3. Find your two KG Inicis channels:
   - **KG Inicis - Single Payment** (일반결제) → Copy Channel Key
   - **KG Inicis - Billing** (정기결제) → Copy Channel Key
4. Paste into `.env.local`

## Payment Flow

### Invoice Payments (Student/Parent)
1. Student/parent clicks "Pay Invoice"
2. Uses `NEXT_PUBLIC_PORTONE_CHANNEL_KEY_PAYMENT_LIVE`
3. One-time payment through KG Inicis
4. Invoice status updated to "paid"

### Subscription Payments (Academy)
1. Academy subscribes to Classraum
2. Uses `NEXT_PUBLIC_PORTONE_CHANNEL_KEY_BILLING_LIVE`
3. Billing key saved for recurring payments
4. Monthly auto-billing

## Testing

Before going live:
1. Ensure both channel keys are in `.env.local`
2. Test with a real card (₩100 payment)
3. Verify payment appears in PortOne console
4. Check invoice status updates correctly

## Next Steps

1. ✅ Add channel keys to `.env.local`
2. ✅ Test invoice payment flow
3. ⏳ Implement subscription billing flow (future)
4. ⏳ Set up webhooks for payment notifications (future)

## Important Notes

- **Same credentials** for store ID, API secret, and API key (no test/live difference)
- **Different channels** for single vs recurring payments
- **No mode switch** needed - always uses live channels
- **Hardcoded test keys removed** - now uses environment variables only
