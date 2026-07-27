# Sentry Setup

Error monitoring for Classraum. The code is wired and ready; you just
need to create the Sentry project and paste the DSN into your env.

## One-time setup (~10 minutes)

### 1. Create the Sentry project

1. Sign up at <https://sentry.io> (free tier: 5k errors/month, plenty
   for early traffic).
2. Create a new project. Pick **Next.js** as the platform.
3. Sentry shows you a DSN that looks like
   `https://abc123…@o12345.ingest.sentry.io/67890`. Copy it.

### 2. Set local env vars

Add to your `.env.local`:

```dotenv
NEXT_PUBLIC_SENTRY_DSN=https://…@…ingest.sentry.io/…
SENTRY_DSN=https://…@…ingest.sentry.io/…
SENTRY_ORG=your-org-slug      # from Sentry URL, e.g. https://your-org-slug.sentry.io
SENTRY_PROJECT=your-project-slug
```

`SENTRY_AUTH_TOKEN` is **build-time only** — needed for source-map
uploads. Don't put it in `.env.local`; only set it in Vercel (see step 4).

### 3. Verify it works locally

```bash
npm run dev
```

Visit any page. In a separate terminal, trigger a test error:

```bash
curl http://localhost:3000/api/sentry-test
# (or throw `throw new Error('test')` in any page and reload)
```

You should see the error appear in your Sentry dashboard within a
minute.

### 4. Production / Vercel setup

In the Vercel dashboard for your project → **Settings → Environment
Variables**, add:

| Variable | Scope | Value |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | Production, Preview, Development | Your DSN |
| `SENTRY_DSN` | Production, Preview, Development | Same DSN |
| `SENTRY_ORG` | Production, Preview | Your org slug |
| `SENTRY_PROJECT` | Production, Preview | Your project slug |
| `SENTRY_AUTH_TOKEN` | Production, Preview | Create at https://sentry.io/orgs/YOUR_ORG/settings/auth-tokens/ with scope `project:releases` and `project:write` |

Redeploy. Source maps will upload automatically on each build, so
stack traces in Sentry will show original TS line numbers instead of
minified gibberish.

## What's already configured

- **`sentry.client.config.ts`** — browser SDK
- **`sentry.server.config.ts`** — Node SDK (API routes, RSC)
- **`sentry.edge.config.ts`** — Edge runtime SDK (middleware)
- **`src/instrumentation.ts`** — wires it all into Next.js 15's
  `register()` / `onRequestError` hooks
- **`next.config.ts`** — `withSentryConfig` wraps the export so build-
  time source-map upload works

### PII scrubbing

Both client and server configs strip:

- `Authorization` headers and cookies
- Request bodies (form data, JSON payloads)
- Query strings on navigation + fetch breadcrumbs
- User email / IP / username from the `event.user` block

This is defence-in-depth on top of Sentry's own "Default PII" toggle.
Keep `sendDefaultPii: false` in both configs.

### Sample rates

`tracesSampleRate` defaults to 10% in production, 100% in development.
Bump this up if you want more performance data, down if you're getting
close to your Sentry quota.

Session replay is **off by default** (`replaysSessionSampleRate: 0`).
Enable it after launch if you find you need to see what users were
doing when errors happen — costs more quota but invaluable for debugging
user-reported issues.

## Troubleshooting

**No events appearing.** Check that `NEXT_PUBLIC_SENTRY_DSN` is set
(client) and `SENTRY_DSN` is set (server). Visit Sentry's "Issues" tab
for your project — empty means events aren't arriving.

**Stack traces are minified.** Check that `SENTRY_AUTH_TOKEN`,
`SENTRY_ORG`, and `SENTRY_PROJECT` are set in Vercel. Source-map upload
runs during `next build`; without these vars it's silently skipped.

**Too many "Non-Error promise rejection" events.** Already filtered in
the client config's `ignoreErrors`. If you see other noise dominating
your inbox, add patterns to the same array.

**Want to ignore a specific error.** Add it to the `ignoreErrors` array
in the appropriate config. Restart dev server / redeploy to apply.

---

# Alert rules

Everything above gets errors *into* Sentry. Alert rules are what make
Sentry tell **you**. Without them Sentry is a log you have to remember to
go and read — which is how `/api/subscription/downgrade` answered 500 to
every customer for months without anyone noticing.

These rules must be created in the Sentry dashboard (Alerts → Create
Alert); they are cloud-side config and cannot live in this repo.

## What the code already emits

`raiseAlert()` (`src/lib/ops/alert.ts`) is called from **51 sites across
23 files** — 26 `critical`, 24 `warning`, and one whose severity is
chosen per job by the watchdog — and every call carries these tags:

| Tag | Value |
|---|---|
| `alertSeverity` | `critical` \| `warning` \| `info` |
| `alertKind` | the condition, e.g. `academy-sub-past-due-write` |
| `dedupeKey` | `<alertKind>:<entity-id>`, e.g. `…-write:9f3c…` |

Events are **fingerprinted on `alertKind`**, so one condition is one
Sentry issue no matter how many academies it hits. Build rules on
`alertSeverity`; use `dedupeKey` to find the specific entity.

Separately, the `ops-watchdog` cron checks **20 scheduled jobs**
(`JOB_REGISTRY` in `src/lib/ops/jobs.ts`) and raises an alert when one
stops reporting — `critical` for billing/sync jobs, `warning` for
reminders.

## The rules to create

Set **Environment = production** on every rule, or preview deploys will
page you.

### 1. Critical ops alert — page immediately

- **When:** an event is captured
- **If:** `alertSeverity` equals `critical`
- **Then:** notify your on-call channel (Slack/PagerDuty/email)
- **Rate limit:** at most once per 30 minutes per issue

This is money and data integrity: charges not recorded, refunds still
counted as revenue, deletions with no audit row, a paid upgrade that
never applied. `raiseAlert` also emails on `critical`, so this is the
second channel, not the only one.

### 2. Warning ops alert — digest, don't page

- **When:** an event is captured
- **If:** `alertSeverity` equals `warning`
- **Then:** notify a low-priority channel
- **Rate limit:** at most once per 24 hours per issue

Recoverable or cosmetic: a missing ledger row, an undelivered
notification. Paging on these is how people learn to ignore the channel.

### 3. A scheduled job has stopped running

- **When:** an event is captured
- **If:** `alertKind` equals `cron-stale` OR `cron-never-ran`
- **Then:** notify on-call

`cron-stale` means a job ran before and has now gone quiet past its
`maxSilenceMinutes`. `cron-never-ran` means it has never reported at all
— usually a job added to `JOB_REGISTRY` but never wired into
`vercel.json`, which is exactly how recurring student invoicing sat
unscheduled for months.

Rule 1 already covers the critical jobs; this one exists so a *warning*
-severity job going silent is still visible as an availability problem
rather than being buried in the digest.

### 4. Unhandled server errors

- **When:** a new issue is created
- **If:** `level` equals `error` AND `alertSeverity` **is not set**
- **Then:** notify your dev channel

The tag filter is what keeps this from double-firing on everything rules
1 and 2 already cover — those all carry `alertSeverity`.

### 5. Error-rate spike

- **When:** number of errors in an issue is more than **50 in 1 hour**
- **Then:** notify on-call

Catches the class nothing else does: an endpoint failing for *everyone*
at once, where each event looks individually unremarkable.

## Verifying the rules actually fire

Creating a rule proves nothing — test it the way you would test a
smoke alarm.

1. Trigger a real `critical` alert in production. The safest is a job
   watchdog: it fires by itself if you pause a cron in `vercel.json` for
   longer than its `maxSilenceMinutes`.
2. Confirm all three sinks: a row in the `alerts` table (visible in
   Admin → System), an email, and a Sentry issue that fired the rule.
3. Resolve the alert and confirm it stops.

If Sentry shows nothing, check the DSN first — see below.

## Failure mode to know about

`Sentry.init({ dsn: undefined })` does **not** throw. It silently
disables the SDK, and every `captureMessage`/`captureException` becomes a
no-op — including all 51 `raiseAlert` sites. You would have alert rules
attached to a project that never receives events.

`sentry.server.config.ts` now logs a loud `[sentry]` error at startup if
no DSN is set while `VERCEL_ENV=production`. If you see that line in the
Vercel function logs, Sentry is off and rules 1–5 are inert. The `alerts`
table and critical emails still work, so you are degraded, not blind.
