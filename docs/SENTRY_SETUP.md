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
