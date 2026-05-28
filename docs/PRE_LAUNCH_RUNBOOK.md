# Pre-Launch Runbook

Consolidates the 20-commit pre-launch hardening pass shipped on 2026-05-25
into a single deploy-day checklist. Follow this top-to-bottom before
flipping `app.classraum.com` to public traffic.

If you're new to this codebase: the audits today (toast, tech debt,
loading/error states, rate limiting, PII logging, webhook idempotency,
cron idempotency, admin routes, file uploads, CORS, public routes, RLS
policies, email injection, subscription cancellation) each found at
least one real bug. The fixes are summarised at the bottom under
"What this PR-set changed."

---

## 1. Environment variables

All Vercel environments (Production, Preview, and where applicable
Development) must have these set before deploy. Variables marked
**(new)** were added today.

### Required for the app to function

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Existing — Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Existing — publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Now required.** Admin routes used to fall back to anon when this was missing (commit 2ecb3a8) — the fallback was a security footgun and was removed. Without this var, admin routes return 500. |
| `NEXT_PUBLIC_SITE_URL` | Existing — base URL for email links etc. |

### Required for crons + payments

| Variable | Notes |
|---|---|
| `CRON_SECRET_KEY` | Auth for all `/api/cron/*` routes. |
| `PORTONE_API_SECRET` | PortOne V2 API secret |
| `PORTONE_STORE_ID` / `NEXT_PUBLIC_PORTONE_STORE_ID` | Existing |
| `PORTONE_WEBHOOK_SECRET` | Standard Webhooks HMAC secret. **Production rejects unsigned webhooks** — if this is unset in prod the payments webhook returns 500. |

### Required for transactional email

| Variable | Notes |
|---|---|
| `POSTMARK_SERVER_TOKEN` | Postmark server token for `/api/emails/welcome`, deletion-notice emails, account-deletion digest. Optional in non-prod — calls silently return `{sent:false}` if missing. |
| `POSTMARK_FROM_EMAIL` | Optional. Defaults to `no-reply@classraum.com`. |

### Required for alerting / deletion-digest

| Variable | Notes |
|---|---|
| `ALERT_EMAIL_ENABLED` | Set to `true` to enable email alerts |
| `ALERT_EMAIL_RECIPIENTS` | **(used by new digest)** Comma-separated list. The weekly account-deletion digest (commit 6b6d0ab) sends here. Without it, digest cron logs the report instead of mailing. |
| `ALERT_EMAIL_FROM` | Optional override (defaults to `POSTMARK_FROM_EMAIL`) |
| `SLACK_WEBHOOK_URL` | Optional — existing alerting system |

### Sentry **(new — entire section)**

See `docs/SENTRY_SETUP.md` for the full walkthrough. Quick reference:

| Variable | Scope | Source |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | All environments | Sentry project settings |
| `SENTRY_DSN` | All environments | Same value as above |
| `SENTRY_ORG` | Production, Preview | Sentry URL slug |
| `SENTRY_PROJECT` | Production, Preview | Sentry project slug |
| `SENTRY_AUTH_TOKEN` | Production, Preview | Create at sentry.io/orgs/YOUR_ORG/settings/auth-tokens — scopes `project:releases` + `project:write` |

All Sentry vars are **optional at the code level** — the SDK no-ops when the
DSN is missing. Without them, error monitoring is disabled but the app works.

---

## 2. Database migrations

Apply migrations 033 and 034 (both shipped today) before deploying the
new code. Both are idempotent; running them on a DB that already has
them applied is a no-op.

```sql
-- Migration 033: missing indexes on chat/announcements/student_reports
-- See database/migrations/033_chat_conversations_and_report_indexes.sql
-- Status: applied to live DB 2026-05-25

-- Migration 034: drop USING(true) RLS policies (P0 + P1)
-- See database/migrations/034_fix_overly_permissive_rls.sql
-- Status: applied to live DB 2026-05-25
```

Verify in the Supabase dashboard's Migrations tab that both show as
applied. If either is missing, the deploy will technically still
function, but:
- Without 033: chat list, announcements feed, and student reports list
  will get slower as data grows (Seq Scans at 10k+ rows).
- Without 034: **the entire `users` table is readable via the anon key
  from any browser**. Do not deploy public traffic without this
  migration applied.

---

## 3. Cron schedule

`vercel.json` has one new cron entry today:

```json
{ "path": "/api/cron/account-deletion-digest", "schedule": "0 0 * * 1" }
```

Runs every Monday at 00:00 UTC (09:00 Asia/Seoul). Vercel auto-picks
this up on the next deploy — no manual configuration needed.

The existing `/api/cron/process-account-deletions` daily 03:00 UTC sweep
is unchanged.

---

## 4. Code-level changes you need to know about

These are behaviour changes that may surprise you if you're not aware:

### TypeScript build now fails on type errors (commit feba0ce)
- Previously `next.config.ts` had `typescript.ignoreBuildErrors: true`.
- Now `false`. `npm run build` will fail if `npx tsc --noEmit` would.
- Verified clean before this commit; if a future PR breaks TS, the build
  blocks instead of silently shipping. The `'not_submitted'` vs
  `'not submitted'` bug from earlier this week would have been caught
  here.

### ESLint warnings re-engaged (commit feba0ce)
- `@typescript-eslint/no-explicit-any`, `no-unused-vars`,
  `react-hooks/exhaustive-deps` are all `warn` (not `error`).
- Existing baseline: ~500 warnings as of this PR-set. Visible in CI/IDE.
- Bump each to `error` once the baseline drops near zero.

### Test/debug endpoints 404 in production (commit 37c76a4)
- `/api/test-notifications`, `/api/test-push`, `/api/test-ai`,
  `/api/notifications/create-sample` return `404` when
  `NODE_ENV === 'production'`. Still work in dev.
- `/api/notifications/triggers` was deleted entirely (dead code).
- `/api/notifications/create` now requires either a user JWT OR
  `x-internal-secret: $CRON_SECRET_KEY` header.

### Rate limits added on (commits 7e32bcb, 3f7fd90)
- `POST /api/account/delete` — 3/user/hour
- `POST /api/account/reactivate` — 5/email/15min + 20/IP/15min
- `POST /api/payments/verify` — 20/user/min
- `POST /api/reports/generate-feedback` + stream — 5/IP/min + 3/student/hour
- `GET /api/messages/contacts` — 30/user/min
- `POST /api/chat/messages` — 30/user/min + 15/conversation/min
- `POST /api/chat/conversations` — 10/user/hour
- `GET /api/onboarding/[token]` — 30/IP/min
- `POST /api/onboarding/[token]` — 10/IP/hour

In-memory limiter (single Vercel instance). Migrate to Upstash Redis
if you scale beyond one region.

### Security headers (commit 0549eb3)
- HSTS, X-Frame-Options=SAMEORIGIN, X-Content-Type-Options=nosniff,
  Referrer-Policy, Permissions-Policy set on every non-asset route.
- CSP intentionally not set yet. Recommended: add as
  `Content-Security-Policy-Report-Only` first, tune from Sentry
  violations, then promote to enforcing.

### Sentry breadcrumb scrubbing (commit d7beecc)
- `console.log/error` arguments and breadcrumb URLs are PII-scrubbed
  before leaving the process — email/phone/name fields redacted in
  any object, regex-scrubbed from free-text messages.

---

## 5. Pre-deploy verification

Run this checklist locally and on staging before flipping prod:

```bash
# 1. Clean build
rm -rf .next
npm run build
# Should succeed with TS strict + ESLint warnings (not errors)

# 2. Type check
npx tsc --noEmit
# Should output nothing (clean)

# 3. Audit warnings counts (informational baseline)
npx next lint 2>&1 | grep -oE "@typescript-eslint/no-explicit-any|@typescript-eslint/no-unused-vars|react-hooks/exhaustive-deps" | sort | uniq -c
# Expected baseline approximately:
#   ~283 no-explicit-any
#   ~160 no-unused-vars
#   ~66  exhaustive-deps
```

Then on staging:

- [ ] Sign up as a new manager → verify welcome email arrives, name is HTML-escaped
- [ ] Sign in as a parent → verify invoices list loads, payment flow completes
- [ ] Trigger a fake fetch failure on `/mobile/invoices` (network throttle) → confirm ErrorState card with retry button renders (not the "all paid up" empty state)
- [ ] As an unauthenticated browser, run in devtools:
  ```js
  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  sb.from('users').select('*')
  ```
  → must return `[]` not the user table (verifies migration 034)
- [ ] Open Sentry dashboard → verify events from staging are arriving
- [ ] Run `GET /api/cron/account-deletion-digest` with `Authorization: Bearer $CRON_SECRET_KEY` → verify it returns stats JSON
- [ ] Cancel a test subscription → verify `billing_key_cancelled_at` is stamped in the DB and the PortOne dashboard shows the key revoked

---

## 6. Post-deploy verification

Within 30 minutes of deploy:

- [ ] Sentry inbox is quiet (no immediate error surge)
- [ ] At least one real user has loaded the homepage successfully
- [ ] No 500s in Vercel logs from `/api/payments/webhook` or `/api/cron/*`
- [ ] HTTP response headers on `https://app.classraum.com/auth` include
      `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`
      (check with `curl -I`)

Within 24 hours:

- [ ] First `process-account-deletions` cron run (03:00 UTC) returns
      `success: true` in Vercel logs
- [ ] PortOne dashboard shows payment webhooks succeeding (not retrying)

Within 1 week (first digest run):

- [ ] Account-deletion digest email arrives in `ALERT_EMAIL_RECIPIENTS`
      inbox on Monday morning
- [ ] Stats show 0 overdue (anything > 0 means the sweep is failing
      for those rows — escalate)

---

## 7. Known follow-ups (deferred)

Things noted in audits but not fixed today. Listed so they don't get
lost.

**Type debt (deferred from commits 6, 16):**
- ~270 `as any` remaining (mostly render-layer chart callbacks)
- ~160 unused-var warnings (mostly dead imports)
- ~66 `react-hooks/exhaustive-deps` warnings (many intentional;
  need per-case triage with eslint-disable + justification)

**RLS scope tightening (deferred from commit 47d8f62):**
- `public.users` SELECT is currently `TO authenticated USING (true)`
  — anyone signed in can read every user row. The legitimate use case
  is manager/teacher/parent cross-user lookups within their academy,
  which need a join through `managers`/`teachers`/`students`/`parents`
  tables. Tightening requires per-UI testing because every cross-user
  read flow has to keep working. Tracked as the next RLS PR.

**Subscription state machine (deferred from commit a3edf50):**
- `past_due` subscriptions retry forever with no termination. Needs a
  business decision on "after N failed retries, auto-cancel and
  revoke access" before coding.
- Pending plan changes (`pending_tier`, `pending_change_effective_date`)
  aren't cleared on cancel. Orphan fields, low impact.

**Other:**
- CSP Content-Security-Policy header — recommended next security addition
- Per-tenant rate limits on admin routes (currently none — relies on
  "admin compromise = game over anyway")
- Cron monitoring digest expanded to cover the other 7 crons
  (currently only deletion-sweep has one)

---

## 8. What this PR-set changed (audit findings + fixes)

20 commits, each closing at least one real bug. Roughly grouped:

**Payment integrity (real money at stake)**
- 9b44699 — payments webhook idempotency (was double-firing
  notifications + 23505-erroring on retries)
- 8944fdf — subscription-billing + recurring-payments cron used
  non-deterministic paymentIds → double-charging on retries
- 2ecb3a8 — settlements/create accepted any authenticated user, no
  invoice ownership check
- a3edf50 — subscription cancel didn't revoke PortOne billing key

**Security**
- 0549eb3 — added HSTS, X-Frame-Options, etc.
- 7e32bcb, 3f7fd90 — rate limits on 9 abusable endpoints
- 47d8f62 — RLS `USING (true)` on `users` and `alerts` (P0 — anon
  could scrape entire user table)
- 37c76a4 — 6 unauthenticated mutation endpoints (test-notifications,
  test-push, test-ai, notifications/create, notifications/triggers,
  create-sample)
- a3edf50 — welcome-email HTML injection via signup name field
- d7beecc — Sentry breadcrumb PII scrubbing

**Observability**
- d76967c — Sentry wired (DSN-ready)
- 6b6d0ab — weekly account-deletion digest cron

**Reliability**
- 851d106 — missing indexes on chat/announcements/student_reports
- 7842e12, 719b80c — ErrorState component + applied across 10 mobile
  pages (silent-failure pattern killed)

**Code quality**
- feba0ce — TS strict + ESLint warnings re-engaged
- f983b8c — i18n LanguageContext memoised (latent stale closures)
- 88d56dc — dead imports + interfaces removed

**Hygiene**
- cd2786d — demo seed data removed from production
- 761a944 — redundant ESLint directives cleaned

---

## Questions / running into trouble?

1. Check this doc's "Pre-deploy verification" section first
2. Check `docs/SENTRY_SETUP.md` for Sentry-specific issues
3. Check `docs/recurring-payments-setup.md` for PortOne / billing
4. Check Vercel logs and the Sentry inbox before falling back to
   "everything's broken"
