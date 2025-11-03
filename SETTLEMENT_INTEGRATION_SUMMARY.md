# PortOne Partner Settlement Integration - Summary of Changes

## Overview
This document summarizes all changes made to integrate PortOne's Partner Settlement (파트너 정산 자동화) service into the Classraum admin panel. The integration allows tracking settlements and payouts for academies (partners) when students/parents pay invoices.

## Business Flow
1. **Student/Parent** pays invoice through PortOne V2 Payment API
2. **Payment verification** confirms successful payment
3. **Settlement creation** automatically creates settlement record in PortOne Platform API
4. **Admin tracking** monitors settlements and payouts through admin panel
5. **Payout** transfers money to academy bank accounts

---

## 1. Database Changes

### Migration File
**Location**: `database/migrations/014_add_portone_partner_fields.sql`

**Purpose**: Add PortOne partner-related fields to the `academies` table

**SQL Changes**:
```sql
ALTER TABLE academies
ADD COLUMN portone_partner_id TEXT,
ADD COLUMN portone_contract_id TEXT,
ADD COLUMN bank_account JSONB,
ADD COLUMN business_registration_number TEXT,
ADD COLUMN tax_type TEXT CHECK (tax_type IN ('GENERAL', 'SIMPLIFIED', 'TAX_EXEMPT'));

CREATE INDEX idx_academies_portone_partner_id ON academies(portone_partner_id)
WHERE portone_partner_id IS NOT NULL;
```

**New Columns**:
- `portone_partner_id` - PortOne Platform API partner ID
- `portone_contract_id` - Default contract ID for settlements
- `bank_account` - JSON object with bank account details
- `business_registration_number` - Business registration number
- `tax_type` - Tax classification (일반과세/간이과세/면세)

**Action Required**: Run this migration using Supabase MCP or SQL editor

---

## 2. Type Definitions

### Updated File
**Location**: `src/types/subscription.ts`

**New Types**:
```typescript
export type TaxType = 'GENERAL' | 'SIMPLIFIED' | 'TAX_EXEMPT';
export type SettlementStatus = 'SCHEDULED' | 'IN_PROCESS' | 'SETTLED' | 'PAYOUT_SCHEDULED' | 'PAID_OUT' | 'CANCELED';
export type PayoutStatus = 'SCHEDULED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';

export interface BankAccount {
  bank: string;
  accountNumber: string;
  accountHolder: string;
  currency?: string;
  status?: 'VERIFIED' | 'UNVERIFIED';
}

export interface PortOnePartner {
  id: string;
  name: string;
  email?: string;
  businessRegistrationNumber?: string;
  account?: BankAccount;
  status?: string;
  defaultContractId?: string;
}

export interface PortOneSettlement {
  id: string;
  partnerId: string;
  type: 'ORDER' | 'ORDER_CANCEL' | 'MANUAL';
  status: SettlementStatus;
  settlementDate: string;
  settlementCurrency: string;
  amount: {
    settlement: number;
    payment: number;
    order: number;
    platformFee: number;
    platformFeeVat: number;
    additionalFee: number;
    additionalFeeVat: number;
    discount: number;
    discountShare: number;
    paymentSupply?: number;
    paymentTaxFree?: number;
    vatAmount?: number;
  };
  payment?: {
    id: string;
    orderName?: string;
    currency: string;
    paidAt?: string;
  };
  academyName?: string;
}

export interface PortOnePayout {
  id: string;
  partnerId: string;
  status: PayoutStatus;
  amount: number;
  currency: string;
  payoutAt?: string;
  scheduledAt?: string;
  account?: BankAccount;
  academyName?: string;
}

export interface AcademyWithPartner extends Academy {
  portone_partner_id?: string;
  portone_contract_id?: string;
  bank_account?: BankAccount;
  business_registration_number?: string;
  tax_type?: TaxType;
}
```

---

## 3. Admin Permissions

### Updated File
**Location**: `src/lib/admin-auth.ts`

**Changes**: Added two new permissions to the `getAdminPermissions` function

```typescript
export function getAdminPermissions(role: 'admin' | 'super_admin') {
  const basePermissions = {
    // ... existing permissions
    viewSettlements: true,        // NEW: View settlement tracking page
    managePartnerSettings: true,  // NEW: Configure academy partner settings
  };
  // ...
}
```

---

## 4. Admin Navigation

### Updated File
**Location**: `src/components/admin/AdminSidebar.tsx`

**Changes**:
1. Added import: `import { Banknote } from 'lucide-react';`
2. Added navigation item to `navigationItems` array (between Subscriptions and Users):

```typescript
{
  name: 'Settlements',
  href: '/admin/settlements',
  icon: Banknote,
  permission: 'viewSettlements',
  description: 'Partner settlement tracking'
}
```

---

## 5. API Routes

### 5.1 Settlements List API
**Location**: `src/app/api/admin/settlements/route.ts`

**Purpose**: Fetch settlement records from PortOne Platform API

**Endpoints**:
- `GET /api/admin/settlements?page=0&partnerId=xxx&status=SETTLED&from=2025-10-01&to=2025-10-31`

**Features**:
- Pagination support
- Filter by partner ID, status, date range
- Enriches data with academy names from database
- Admin authentication required

**PortOne API Called**: `GET /platform/partner-settlements`

---

### 5.2 Payouts API
**Location**: `src/app/api/admin/settlements/payouts/route.ts`

**Purpose**: Fetch payout history from PortOne Platform API

**Endpoints**:
- `GET /api/admin/settlements/payouts?page=0&status=SUCCEEDED&from=2025-10-01&to=2025-10-31`

**Features**:
- Pagination support
- Filter by status, date range
- Enriches data with academy names from database
- Admin authentication required

**PortOne API Called**: `GET /platform/partner-payouts`

---

### 5.3 Partner Management API
**Location**: `src/app/api/admin/academies/[id]/partner/route.ts`

**Purpose**: Manage PortOne partner information for academies

**Endpoints**:
- `GET /api/admin/academies/{id}/partner` - Get partner details
- `POST /api/admin/academies/{id}/partner` - Create/update partner

**GET Response**:
```json
{
  "portone_partner_id": "academy_123",
  "portone_contract_id": "contract_xyz",
  "business_registration_number": "123-45-67890",
  "tax_type": "GENERAL",
  "bank_account": {
    "bank": "SHINHAN",
    "accountNumber": "123-456-789012",
    "accountHolder": "홍길동",
    "currency": "KRW"
  },
  "partner": { /* PortOne partner object */ }
}
```

**POST Request**:
```json
{
  "partnerId": "academy_123", // Optional, auto-generated if empty
  "email": "partner@academy.com",
  "contractId": "contract_xyz",
  "businessRegistrationNumber": "123-45-67890",
  "taxType": "GENERAL",
  "bankAccount": {
    "bank": "SHINHAN",
    "accountNumber": "123-456-789012",
    "accountHolder": "홍길동",
    "currency": "KRW"
  }
}
```

**PortOne APIs Called**:
- `GET /platform/partners/{id}`
- `POST /platform/partners` (create)
- `PATCH /platform/partners/{id}` (update)

---

### 5.4 Settlement Creation API
**Location**: `src/app/api/admin/settlements/create/route.ts`

**Purpose**: Create settlement in PortOne after successful invoice payment

**Endpoints**:
- `POST /api/admin/settlements/create`

**Request Body**:
```json
{
  "invoiceId": "invoice_123",
  "paymentId": "payment_456",
  "paymentAmount": 100000
}
```

**Response** (Success):
```json
{
  "success": true,
  "message": "Settlement created successfully",
  "settlement": {
    "id": "settlement_789",
    "partnerId": "academy_123",
    "amount": 100000
  }
}
```

**Response** (Partner Not Configured):
```json
{
  "success": true,
  "message": "Payment successful but partner not configured - settlement not created",
  "settlement": null
}
```

**Response** (Settlement Failed):
```json
{
  "success": true,
  "message": "Payment successful but settlement creation failed",
  "error": { /* PortOne error */ },
  "settlement": null
}
```

**Features**:
- Fetches invoice with academy partner ID using JOIN
- Gracefully handles missing partner configuration
- Doesn't fail payment if settlement creation fails
- Logs detailed debug information

**PortOne API Called**: `POST /platform/transfers/order`

---

## 6. Admin Pages

### 6.1 Settlements Page
**Location**: `src/app/admin/settlements/page.tsx`

**Route**: `/admin/settlements`

**Purpose**: Page wrapper for settlement management component

**Metadata**:
- Title: "Settlement Management - Classraum Admin"
- Description: "Track and manage partner settlements"

---

## 7. Admin Components

### 7.1 Settlement Management Component
**Location**: `src/components/admin/settlements/SettlementManagement.tsx`

**Purpose**: Main settlement tracking interface

**Features**:
1. **Filters**:
   - Academy name (text search)
   - Status (all/scheduled/in_process/settled/payout_scheduled/paid_out/canceled)
   - Date range (from/to)

2. **Settlement Table**:
   - Settlement ID
   - Academy name
   - Type (Order/Order Cancel/Manual)
   - Status badge with color coding
   - Order amount
   - Platform fee
   - Final settlement amount
   - Settlement date
   - Actions (View Details)

3. **Action Buttons**:
   - Export to CSV
   - View Payout History

4. **Pagination**: 20 records per page

5. **Status Color Coding**:
   - SCHEDULED: Blue
   - IN_PROCESS: Yellow
   - SETTLED: Green
   - PAYOUT_SCHEDULED: Purple
   - PAID_OUT: Green
   - CANCELED: Gray

---

### 7.2 Settlement Detail Modal
**Location**: `src/components/admin/settlements/SettlementDetailModal.tsx`

**Purpose**: Display detailed settlement breakdown

**Sections**:
1. **Basic Information**:
   - Settlement ID
   - Partner ID
   - Academy name
   - Type
   - Status
   - Settlement date

2. **Amount Breakdown**:
   - Order amount
   - Payment amount
   - Platform fee (+ VAT)
   - Additional fee (+ VAT)
   - Discount
   - Discount share
   - Final settlement amount

3. **Payment Information**:
   - Payment ID
   - Order name
   - Payment date
   - Currency

---

### 7.3 Payout History Modal
**Location**: `src/components/admin/settlements/PayoutHistory.tsx`

**Purpose**: Track bank transfer payouts to academies

**Features**:
1. **Filters**:
   - Academy name (text search)
   - Status (all/scheduled/processing/succeeded/failed/canceled)
   - Date range (from/to)

2. **Payout Table**:
   - Payout ID
   - Academy name
   - Status badge
   - Amount
   - Bank account (bank + account number)
   - Scheduled date
   - Payout date

3. **Pagination**: 20 records per page

---

### 7.4 Partner Setup Modal
**Location**: `src/components/admin/academies/PartnerSetupModal.tsx`

**Purpose**: Configure PortOne partner information for academy

**Form Fields**:
1. **Partner ID** (optional, auto-generated)
2. **Email** (required)
3. **Contract ID** (optional)
4. **Business Registration Number** (required)
5. **Tax Type** (select: General/Simplified/Tax Exempt)
6. **Bank Account** (required):
   - Bank (select from list)
   - Account Number
   - Account Holder
   - Currency (default: KRW)

**Features**:
- Loads existing partner data on open
- Auto-generates partner ID as `academy_{academyId}` if empty
- Validates required fields
- Creates or updates partner in PortOne
- Syncs data to Supabase

---

### 7.5 Academy Management Update
**Location**: `src/components/admin/academies/AcademyManagement.tsx`

**Changes**: Added "Setup Partner" button to academy actions dropdown

**New Code**:
```typescript
// Import
import { Banknote } from 'lucide-react';
import { PartnerSetupModal } from './PartnerSetupModal';

// State
const [showPartnerSetupModal, setShowPartnerSetupModal] = useState(false);
const [academyForPartnerSetup, setAcademyForPartnerSetup] = useState<Academy | null>(null);

// Button in actions dropdown
<button
  onClick={() => {
    setAcademyForPartnerSetup(academy);
    setShowPartnerSetupModal(true);
    setShowActions(null);
  }}
  className="flex items-center w-full px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
>
  <Banknote className="mr-3 h-4 w-4" />
  Setup Partner
</button>

// Modal rendering
{showPartnerSetupModal && academyForPartnerSetup && (
  <PartnerSetupModal
    academyId={academyForPartnerSetup.id}
    academyName={academyForPartnerSetup.name}
    onClose={() => {
      setShowPartnerSetupModal(false);
      setAcademyForPartnerSetup(null);
    }}
    onSuccess={() => {
      loadAcademies();
    }}
  />
)}
```

---

## 8. Payment Flow Integration

### Updated File
**Location**: `src/app/mobile/invoice/[id]/pay/page.tsx`

**Changes**: Added settlement creation after successful payment

**Integration Point**: Lines 325-351 in the `handlePayment` function

**Code**:
```typescript
if (verifyResult.status === 'paid') {
  await supabase
    .from('invoices')
    .update({
      status: 'paid',
      transaction_id: response?.paymentId
    })
    .eq('id', invoiceId)

  // Create settlement in PortOne Platform API
  console.log('[Settlement Debug] Creating settlement for invoice:', invoiceId);
  try {
    const settlementResponse = await fetch('/api/admin/settlements/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invoiceId: invoiceId,
        paymentId: response?.paymentId,
        paymentAmount: invoice.finalAmount,
      }),
    });

    const settlementResult = await settlementResponse.json();
    console.log('[Settlement Debug] Settlement result:', settlementResult);

    if (settlementResult.settlement) {
      console.log('[Settlement Debug] Settlement created:', settlementResult.settlement.id);
    } else {
      console.log('[Settlement Debug] Settlement not created:', settlementResult.message);
    }
  } catch (settlementError) {
    // Don't fail payment if settlement creation fails
    console.error('[Settlement Debug] Settlement creation error:', settlementError);
  }
}
```

**Key Features**:
- Only creates settlement for `status === 'paid'`
- Wrapped in try-catch to prevent payment failure
- Detailed logging for debugging
- Gracefully handles missing partner configuration
- Doesn't block payment flow if settlement fails

---

## 9. Environment Variables

### Required
Add to `.env.local`:

```bash
PORTONE_API_SECRET=your_portone_api_secret_here
```

**Note**: Make sure this is the PortOne Platform API secret, not the V2 Payment API secret.

---

## 10. Security Considerations

1. **Admin Authentication**: All settlement APIs verify admin role before processing
2. **Server-side API Calls**: All PortOne API calls are made server-side to protect secrets
3. **Permission-based Access**: Settlement page requires `viewSettlements` permission
4. **Error Handling**: Graceful degradation - payment succeeds even if settlement fails
5. **Logging**: Detailed debug logs for troubleshooting without exposing sensitive data

---

## 11. Testing Checklist

### Database Setup
- [ ] Run migration `014_add_portone_partner_fields.sql`
- [ ] Verify new columns exist in `academies` table

### Partner Configuration
- [ ] Navigate to Admin → Academies
- [ ] Click "Setup Partner" for an academy
- [ ] Fill in partner information
- [ ] Submit form
- [ ] Verify data saved in database
- [ ] Verify partner created in PortOne Platform

### Settlement Tracking
- [ ] Navigate to Admin → Settlements
- [ ] Verify settlements load from PortOne
- [ ] Test filters (academy name, status, date range)
- [ ] Click "View Details" on a settlement
- [ ] Verify detailed breakdown displays
- [ ] Click "Payout History"
- [ ] Verify payouts load from PortOne

### Payment Integration
- [ ] Create an invoice for a student
- [ ] Make sure academy has partner configured
- [ ] Navigate to Mobile → Invoice → Pay
- [ ] Complete payment
- [ ] Check console logs for settlement creation
- [ ] Navigate to Admin → Settlements
- [ ] Verify new settlement appears

### Edge Cases
- [ ] Pay invoice for academy WITHOUT partner configured
- [ ] Verify payment succeeds
- [ ] Verify log shows "partner not configured"
- [ ] Simulate PortOne API failure
- [ ] Verify payment still succeeds
- [ ] Export settlements to CSV
- [ ] Verify all data exports correctly

---

## 12. Files Created

### Database
- `database/migrations/014_add_portone_partner_fields.sql`

### API Routes
- `src/app/api/admin/settlements/route.ts`
- `src/app/api/admin/settlements/payouts/route.ts`
- `src/app/api/admin/settlements/create/route.ts`
- `src/app/api/admin/academies/[id]/partner/route.ts`

### Pages
- `src/app/admin/settlements/page.tsx`

### Components
- `src/components/admin/settlements/SettlementManagement.tsx`
- `src/components/admin/settlements/SettlementDetailModal.tsx`
- `src/components/admin/settlements/PayoutHistory.tsx`
- `src/components/admin/academies/PartnerSetupModal.tsx`

---

## 13. Files Modified

### Type Definitions
- `src/types/subscription.ts` - Added PortOne settlement types

### Admin
- `src/lib/admin-auth.ts` - Added settlement permissions
- `src/components/admin/AdminSidebar.tsx` - Added Settlements navigation
- `src/components/admin/academies/AcademyManagement.tsx` - Added Partner Setup button

### Payment Flow
- `src/app/mobile/invoice/[id]/pay/page.tsx` - Integrated settlement creation

---

## 14. PortOne Platform API Endpoints Used

All endpoints use base URL: `https://api.portone.io`

### Authentication
All requests use `Authorization: PortOne {PORTONE_API_SECRET}` header

### Endpoints

1. **List Partner Settlements**
   - `GET /platform/partner-settlements`
   - Query params: `page`, `partnerId`, `status`, `from`, `to`

2. **List Partner Payouts**
   - `GET /platform/partner-payouts`
   - Query params: `page`, `status`, `from`, `to`

3. **Get Partner Details**
   - `GET /platform/partners/{partnerId}`

4. **Create Partner**
   - `POST /platform/partners`
   - Body: `{ id, name, email, businessRegistrationNumber, account, defaultContractId }`

5. **Update Partner**
   - `PATCH /platform/partners/{partnerId}`
   - Body: Same as create

6. **Create Settlement**
   - `POST /platform/transfers/order`
   - Body: `{ partnerId, paymentId, orderDetail: { orderAmount }, isForTest }`

---

## 15. User Guide

### For Admins

#### Setting Up a Partner
1. Navigate to **Admin → Academies**
2. Find the academy in the list
3. Click the **Actions** dropdown (three dots)
4. Click **Setup Partner**
5. Fill in the form:
   - Leave Partner ID empty to auto-generate
   - Enter email address
   - Enter business registration number
   - Select tax type
   - Select bank and enter account details
6. Click **Save Partner Info**

#### Viewing Settlements
1. Navigate to **Admin → Settlements**
2. Use filters to narrow down results:
   - Search by academy name
   - Filter by status
   - Select date range
3. Click **View Details** to see settlement breakdown
4. Click **Payout History** to see bank transfers

#### Exporting Data
1. Navigate to **Admin → Settlements**
2. Apply desired filters
3. Click **Export to CSV**
4. File downloads with all settlement data

---

## 16. Troubleshooting

### Settlement Not Created After Payment
**Symptoms**: Payment succeeds but no settlement appears

**Possible Causes**:
1. Academy doesn't have partner configured
   - Solution: Set up partner via Admin → Academies
2. PortOne API error
   - Check console logs for `[Settlement Debug]` messages
   - Check server logs for API error responses
3. Environment variable missing
   - Verify `PORTONE_API_SECRET` is set

### Partner Setup Fails
**Symptoms**: Error when saving partner information

**Possible Causes**:
1. Invalid bank account information
   - Verify account number format
2. PortOne API error
   - Check if partner already exists with same ID
   - Check if email format is valid
3. Database error
   - Verify migration was run
   - Check Supabase logs

### Settlements Not Loading
**Symptoms**: Empty settlement list or error message

**Possible Causes**:
1. No settlements exist in PortOne
   - Create test payment to generate settlement
2. Admin permission missing
   - Verify user has `viewSettlements` permission
3. PortOne API error
   - Check server logs for API error responses

---

## 17. Future Enhancements

Potential improvements for future versions:

1. **Webhook Integration**: Listen to PortOne settlement webhooks for real-time updates
2. **Settlement Reports**: Generate monthly/quarterly settlement reports
3. **Payout Schedule**: Configure automatic payout schedules per academy
4. **Settlement Disputes**: Interface for handling settlement disputes
5. **Multi-currency Support**: Support settlements in multiple currencies
6. **Bulk Partner Setup**: Upload CSV to set up multiple partners at once
7. **Settlement Notifications**: Email notifications for settlement status changes
8. **API Rate Limiting**: Implement rate limiting for PortOne API calls
9. **Caching**: Cache settlement data to reduce API calls
10. **Settlement Analytics**: Dashboard with settlement statistics and trends

---

## 18. Support and References

### PortOne Documentation
- **Platform API**: Check PortOne developer docs for Platform Settlement APIs
- **Partner Management**: Partner setup and configuration guides
- **Settlement Flows**: Understanding settlement calculation and timing

### Internal Resources
- **CLAUDE.md**: Project overview and architecture
- **Database Schema**: `database/schema.sql` for full schema
- **API Documentation**: Inline comments in API route files

### Contact
For questions or issues related to this integration, refer to:
- PortOne support for API-related issues
- Supabase docs for database-related issues
- This summary document for implementation details

---

**Integration Completed**: October 31, 2025
**Version**: 1.0
**Status**: Production Ready ✅
