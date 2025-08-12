# Automated Recurring Payments Setup

This document explains how to set up the automated recurring payment system.

## Overview

The automated system consists of:
1. **API Endpoints** for generating recurring invoices and controlling payment plans
2. **Cron Job Integration** for daily automated processing
3. **Database Schema** with pause/resume functionality
4. **Frontend Controls** for managing recurring payments

## API Endpoints

### 1. Generate Recurring Invoices
**Endpoint:** `POST /api/payments/recurring/generate`

**Purpose:** Creates invoices for all due recurring payment templates

**Authentication:** Requires `Authorization: Bearer <token>` header

**Response:**
```json
{
  "success": true,
  "date": "2024-01-15",
  "templatesFound": 5,
  "templatesProcessed": 5,
  "totalInvoicesCreated": 23,
  "errors": []
}
```

### 2. Control Payment Plans
**Endpoint:** `POST /api/payments/recurring/control`

**Purpose:** Pause, resume, or deactivate recurring payment plans

**Body:**
```json
{
  "action": "pause|resume|deactivate",
  "templateId": "uuid",
  "studentId": "uuid" // optional, for student-specific actions
}
```

### 3. Cron Job Endpoint
**Endpoint:** `GET /api/cron/recurring-payments`

**Purpose:** Entry point for external cron services

**Authentication:** Requires `Authorization: Bearer <CRON_SECRET_KEY>` header

## Database Schema Updates

The system adds the following field to `recurring_payment_template_students`:
- `is_paused` (boolean) - Controls whether a student's recurring payments are paused

## Setting Up Automation

### Option 1: Vercel Cron Jobs (RECOMMENDED - FREE)
Vercel now includes cron jobs in the FREE Hobby plan!

Add to your `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/recurring-payments",
      "schedule": "0 9 * * *"
    }
  ]
}
```

**Benefits:**
- ✅ **FREE** on Hobby plan
- ✅ **Native integration** - runs in same environment as your app
- ✅ **Simple setup** - just add vercel.json and deploy
- ✅ **Better reliability** - no external HTTP calls needed

### Option 2: GitHub Actions
Create `.github/workflows/recurring-payments.yml`:
```yaml
name: Recurring Payments
on:
  schedule:
    - cron: '0 9 * * *'  # Daily at 9 AM UTC
  workflow_dispatch:

jobs:
  generate-invoices:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Recurring Payments
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET_KEY }}" \
            "https://your-app.vercel.app/api/cron/recurring-payments"
```

### Option 3: External Cron Service
Use services like:
- **Cron-job.org**
- **EasyCron**
- **Zapier** (scheduled zaps)

Set up a daily HTTP GET request to:
```
GET https://your-app.vercel.app/api/cron/recurring-payments
Authorization: Bearer YOUR_SECRET_KEY
```

## Environment Variables

Add these to your environment:
```
CRON_SECRET_KEY=your-secure-random-key-here
```

## Testing

### Manual Testing
```bash
# Check which templates are due
curl -X GET "https://your-app.vercel.app/api/payments/recurring/generate"

# Generate invoices manually
curl -X POST \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  "https://your-app.vercel.app/api/payments/recurring/generate"

# Test cron endpoint
curl -X GET \
  -H "Authorization: Bearer YOUR_CRON_SECRET_KEY" \
  "https://your-app.vercel.app/api/cron/recurring-payments"
```

## Monitoring

The system provides detailed logging and status information:
- Check server logs for `[RECURRING]` and `[CRON]` entries
- API responses include counts of processed templates and created invoices
- Error handling with detailed error messages

## How It Works

1. **Daily Execution:** Cron job runs daily at scheduled time
2. **🚀 Smart Early Exit:** Quick count check - if no templates are due, exits in ~100ms
3. **Template Check:** System finds all active templates where `next_due_date <= today`
4. **Student Lookup:** For each template, gets all active, non-paused students
5. **Invoice Creation:** Creates invoices for each student (using override amounts if set)
6. **Next Due Date Update:** Calculates and updates template's next due date
7. **Error Handling:** Continues processing even if individual templates fail

**Efficiency Optimization:**
- 99% of daily runs exit early (no templates due)
- Only processes when invoices actually need to be generated
- Dramatically reduced execution time and resource usage

## Frontend Features

- **Payment Plans Tab:** View and manage all recurring payment templates
- **Pause/Resume:** Control individual templates or students
- **Status Indicators:** Visual indicators for active/paused states
- **Amount Overrides:** Per-student custom amounts

## Business Logic

- **Monthly Payments:** Generated on specified day of month
- **Weekly Payments:** Generated on specified day of week
- **Paused Students:** Skip invoice generation but keep template active
- **Inactive Templates:** Never generate new invoices
- **Amount Overrides:** Use student-specific amounts when available
- **End Date Handling:** Stop generating invoices after template end date

## Security Notes

- Always use secure tokens for cron job authentication
- Regularly rotate API keys and secrets
- Monitor logs for unauthorized access attempts
- Consider rate limiting for API endpoints