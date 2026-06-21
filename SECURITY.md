# Security audit (2026-06-22)

Snapshot of the security pass triggered after the help-center analytics work landed. Documents what was fixed, what's still open, and the rationale for both.

## Fixed in this pass

### P0: Unauthenticated `/api/payments/recurring/control`
Before: any POST with `{action, templateId}` could pause / resume / deactivate any academy's recurring billing template. Sabotage vector against paying customers.

After: requires a Bearer token, verifies the caller is either a Classraum platform admin (`role` ∈ `admin` / `super_admin`) or a `manager` of the template's academy. The single client caller (`payments-page.tsx` template-delete flow) now sends the token via a shared `authHeaders()` helper.

### P0: Unauthenticated `/api/emails/welcome`
Before: any POST with `{email, name, role}` triggered a real Postmark send from `no-reply@classraum.com`. Both a spam vector and a real cost risk.

After: per-IP rate limit at 5 req/min, plus per-recipient limit at 3 req/hour. We didn't add auth because the signup flow calls this fire-and-forget before the first sign-in completes — the rate limits are the right primitive here.

### P1: `academy-logos` bucket policies
Before: `Allow authenticated insert / update / delete academy-logos` had no path scoping. Any signed-in user (including students in other academies) could overwrite or delete any academy's logo.

After: new policies require the path's first segment to match the caller's `academy_id` (looked up via a `SECURITY DEFINER` `user_academy_id(uid)` helper that coalesces across `managers` / `teachers` / `parents` / `students`). Path convention `{academyId}/logo.{ext}` was already in use by `settings-page.tsx`, so no client change needed. Public SELECT stays — logos render unauthenticated on `/auth`.

### P1: `announcement-attachments` bucket policies
Before: `Allow public read announcement-attachments` allowed anonymous SELECT — anyone with the URL pattern could browse attachments across every academy. `Allow authenticated delete / update` let any signed-in user touch any file.

After:
- SELECT narrowed to `authenticated` only.
- UPDATE / DELETE restricted to `owner = auth.uid()`. Safe because the `announcements` table itself already only allows DELETE / UPDATE on `created_by = auth.uid()` — the file uploader is the same person as the announcement author.

## Still open (follow-ups)

### `assignment-attachments` cross-tenant SELECT
The bucket's SELECT policy is broad: any authenticated user can read any file. Cross-academy leak (e.g. student in academy A can fetch student in academy B's submitted homework).

**Why not fixed now:** upload path is `{timestamp}-{sanitizedFileName}` (see `src/hooks/useFileUpload.ts:103`) with no `academy_id`, so path-scoping isn't possible without a migration. Two options:
1. Refactor upload to write under `{academyId}/{timestamp}-{name}`, write a one-shot copy migration for existing files, then add academy-scoped SELECT.
2. Issue signed URLs from a server route that verifies academy membership, and make the bucket private.

Option 2 is cleaner but bigger.

### `announcement-attachments` cross-tenant SELECT
Same root cause as above. SELECT is now `authenticated` (was `public`) but still cross-tenant. Same fix paths apply.

### Unrestricted INSERT on the storage buckets
Three buckets (`announcement-attachments`, `assignment-attachments`, plus the not-yet-fixed pre-state of `academy-logos`) accept INSERT from any authenticated user with no path / size scoping. Storage abuse risk (fill the bucket; rack up cost).

After this pass, `academy-logos` INSERT is path-scoped. The other two are still open — same fix as the SELECT path refactor above.

### `users.read_all_authenticated`
Policy `SELECT to authenticated using (true)` on `public.users`. Every signed-in user can read every user row across the whole database (id, name, email, role). Broad PII surface.

Likely intentional for cross-role lookups (managers seeing teacher names, etc.) but exposes more than needed. A scoped rewrite would limit reads to `same academy_id` plus the caller's own row, with a separate full-read policy for `admin` / `super_admin`. Non-trivial because many UI components likely depend on the broad read.

### RLS-enabled tables with zero policies
Six admin-only tables run with RLS on but no policies, meaning only the service-role key can touch them:
- `academy_notes`
- `admin_activity_logs`
- `admin_settings`
- `error_logs`
- `system_notifications`
- `webhook_events`

This is the right shape for service-role-only data, but worth documenting per-table so a future contributor doesn't try to add a policy and accidentally open access.

### Supabase project settings (not code)
- **Leaked-password protection** is disabled in the Auth dashboard. Enable it (Auth → Settings → "Check passwords against HaveIBeenPwned"). Zero code change.
- **Postgres version** has outstanding security patches. Upgrade via the Supabase dashboard (Project → Infrastructure → Postgres).

## How to re-run this audit

Two MCP calls produce most of the signal:

```
supabase.get_advisors({ type: "security" })
supabase.execute_sql("select * from pg_policies where schemaname = 'public' or schemaname = 'storage'")
```

Then a grep over `src/app/api/**/route.ts` for routes that don't call `getUserFromRequest`, `auth.getUser`, `getServerSession`, `NODE_ENV.*production`, or known-public patterns (`webhook`, `cron`, `onboarding`, public test-taker pages). Each unmatched route is a candidate for review.
