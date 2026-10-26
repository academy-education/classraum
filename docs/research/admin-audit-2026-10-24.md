# Admin area audit, 2026-10-24

Scope: `/admin` pages (`src/app/admin/**`), their components (`src/components/admin/**`), the admin API routes (`src/app/api/admin/**`), and the `admin.*` locale keys. Method: code reading, a local harness that ran the REAL `AdminLayout` and every admin page against mocked network at 375, 390, 812x375, 768 and 1280px (puppeteer and the iOS 18.3 / 26.5 simulators), and read-only counts from the live database (row counts and RLS policies only, no personal data).

This is a menu for the owner. Nothing below is built yet, except the items under "Already fixed in this branch".

## Top 10

| # | Item | Priority | Effort |
|---|------|----------|--------|
| 1 | Super-admin pages are hidden in the sidebar but enforced nowhere: a plain `admin` can open them by URL and their APIs answer | P0 | M (half a day) |
| 2 | Support page reads and writes chat tables from the browser, and RLS grants those tables to `super_admin` only: a plain `admin` sees an empty queue that looks real | P0 | S-M |
| 3 | Dashboard has no settlements, webhook-failure, cron-failure, error-spike, study-billing or bank-health tiles; each needs a separate page visit | P1 | M (1 day) |
| 4 | `/api/admin/users` reads `users` unpaged; it silently truncates at 1,000 rows (465 today) | P1 | S |
| 5 | Support page reads every conversation and every message unpaged; counts and "last message" silently go wrong past 1,000 messages | P1 | S-M |
| 6 | Header "Refresh" is `window.location.reload()`: throws away filters, open tabs and scroll on every page | P1 | M |
| 7 | Bank QC History / Live-bank / ledger panels are English-only (about 46 hard-coded strings) on a page the owner reads in Korean | P2 | M |
| 8 | Phone list pages open with four full-height stat cards before any content | P2 | S |
| 9 | `AdminLayout` re-runs its auth check (2 queries) on every navigation | P2 | S |
| 10 | Row-action menus are `position: fixed` and stay put while the list scrolls under them | P2 | S |

## Already fixed in this branch (not open)

The portrait drawer bug (root cause: one `sidebarOpen` state serving both the desktop rail and the phone drawer), a phone bottom tab bar, page-level overflow on Study / Error logs / Settlements / System / Dashboard at 375px, modal titles cut off at the dialog edge, row-action menus opening below the fold, landscape content under the notch, and question counts plus "most questions seen" on the Bank QC Overview.

## P0: security and data correctness

### 1. Super-admin-only pages are enforced only by hiding the sidebar link

- Files: `src/components/admin/AdminSidebar.tsx:123` (the only role check), pages `src/app/admin/{activity-logs,error-logs,subscription-usage,webhook-events,system,settings}/page.tsx` (no check), routes `src/app/api/admin/activity-logs/route.ts:72`, `error-logs/route.ts:73`, `system/route.ts:39`, `subscription-usage/route.ts:38`, `webhook-events/route.ts:85` (all accept `['admin','super_admin']` for GET).
- Evidence: grep for `super_admin` in the six page components finds it only in `SettingsDashboard.tsx`. Only the destructive actions re-check (`error-logs/route.ts:295` DELETE, `webhook-events/route.ts:264` POST, `users/route.ts:225` role grants).
- Impact: an `admin` reads the audit log, the error log (stack traces and request payloads), webhook payloads and the auth-user counts on System. There are 0 plain admins today (3 super admins), so this is latent; it becomes live the day the first `admin` is created.
- Fix sketch: a `requireSuperAdmin()` beside `requireAdmin()` in `src/app/api/admin/_lib/admin-auth.ts`, used by those GETs; a `superAdminOnly` flag on the nav item that `AdminShell` also uses to render a 403 card for the page. Add one test that iterates the super-admin nav items and asserts each route rejects role `admin`.
- Effort: M (half a day including tests).

### 2. Support depends on RLS that only lets `super_admin` in, while the page is offered to `admin`

- Files: `src/components/admin/support/SupportManagement.tsx:109,144,155,179,212` and `TicketDetailModal.tsx:136,359,383,407,437` (browser client `db`: select, insert, update, delete), `AdminSidebar.tsx:108` (badge count), nav permission `viewSupport` at `AdminSidebar.tsx:61` (true for `admin`).
- Evidence (pg_policies, live): `chat_conversations` has `chat_conversations_super_admin_access` (ALL, `role = 'super_admin'`) and a staff policy limited to the user's own rows; `chat_messages` likewise. No policy mentions `admin`.
- Impact: for an `admin` every query returns 0 rows with no error, so the page shows an empty, healthy-looking queue, the badge reads 0, and replies/closes fail. The dashboard tile (`/api/admin/dashboard`, service role, `dashboard/route.ts:256`) would show 5 open while the page shows none. Latent today for the same reason as item 1.
- Fix sketch: move the Support reads and writes behind `/api/admin/support` with `requireAdmin` + service role, as every other admin page already does, or add `admin` to both policies. The API route is the consistent choice and also fixes item 5.
- Effort: S (policy) or M (API route).

## P1: operator-blocking

### 3. The dashboard does not show what an operator checks every morning

- Files: `src/components/admin/AdminDashboard.tsx`, `src/app/api/admin/dashboard/route.ts:205-283,411-441`.
- Evidence: the route returns academies, users, academy subscriptions, revenue (including study payments, line 153), support conversations, system health and alerts. It does not return: settlements or payouts waiting (only on `/admin/settlements`, which calls PortOne live), webhook failures (`/admin/webhook-events`), cron job failures (`/api/admin/system/jobs`, shown only on System), error-log spikes (System health is a blended percentage, line 277), study subscriptions / failed renewals / refunds (`/admin/study`), comment and nickname reports waiting, and question-bank health (`/admin/bank-qc` Overview: sections under 5 tests, students under 5 left).
- Impact: to answer "is anything on fire?" the owner opens six pages. Failed renewals and failed crons are the ones that cost money silently.
- Fix sketch: a "Needs attention" row of small tiles, each a count with a link, fed by the existing endpoints' totals: failed webhooks (24h), failed cron runs (24h), error logs (24h vs 7-day average), failed study renewals, reports waiting, bank sections under 5 tests (from `loadBankUsage`). Read them server-side in `/api/admin/dashboard` with per-tile error isolation (the route already has `tileUnavailable`).
- Effort: M (1 day).

### 4. `/api/admin/users` will silently drop users past 1,000

- File: `src/app/api/admin/users/route.ts:55-64`.
- Evidence: `.from('users').select('id, name, email, role, created_at').order('created_at')` with no `.range()` and no count check. Live count 465. The auth-user side is already paginated (`listAllAuthUsers`, line 77) and the membership lookup chunked (line 89), so only this read is exposed.
- Impact: the 1,001st user and beyond vanish from the list, the stats cards and search, with no error.
- Fix sketch: page with `.range()` against an exact count, as `src/lib/study/bank-usage-load.ts` `readAll` does, and refuse a short read. Longer term, server-side paging and search; the page currently filters client-side.
- Effort: S.

### 5. Support counts are computed from an unpaged read of every message

- File: `src/components/admin/support/SupportManagement.tsx:176-240`.
- Evidence: conversations unpaged; then one `.in('conversation_id', allIds)` over `chat_messages` unpaged, aggregated in JS for last message, message count and unread count. Live: 6 conversations, 10 messages today.
- Impact: past 1,000 messages the newest-first read stops, so older conversations show 0 messages, no last message and 0 unread. Silent.
- Fix sketch: fold into item 2's API route; compute counts with SQL (`count(*) filter (where ...)` grouped by conversation) or a view.
- Effort: S-M.

### 6. Header Refresh reloads the whole app

- File: `src/components/admin/AdminHeader.tsx:49-53`.
- Evidence: `handleRefresh` calls `window.location.reload()`.
- Impact: every filter, tab (`?tab=` survives, local state does not), open modal, scroll position and the auth check are thrown away; on a phone it is a full reload of a heavy page.
- Fix sketch: a small refresh context: pages register a `reload()` (most already have `loadX()` functions and `usePolling`), the header calls the active page's. Fall back to `router.refresh()`.
- Effort: M.

## P2: quality

### 7. Bank QC is partly English-only

- Files: `src/components/admin/bank-qc/BankQcDashboard.tsx`, `LiveBankState.tsx:330`, `HardeningPanel.tsx`, `ItemSweepPanel.tsx`.
- Evidence: a scan for literal JSX text finds about 46 hard-coded English strings in `bank-qc/` (for example "Task", "Items", "Per test", "Quality", "The eight stages", "No batches recorded.", "Live bank state unavailable"), against 1 or 0 in every other admin folder. The `admin.*` locale trees are otherwise in parity: 1,593 keys in each, 0 missing either way, 2 identical values (`subscriptions.idPrefix`, `activityLogs.columns.ip`, both legitimately the same).
- Impact: the Korean UI switches language mid-page on the page the owner uses most.
- Fix sketch: move the strings into `admin.bankQc.*` through the existing `useQcT`. Ledger prose that is data, not UI, can stay English with a note.
- Effort: M.

### 8. Phone list pages open with a wall of stat cards

- Files: `users/UserManagement.tsx:479`, `academies/AcademyManagement.tsx:742`, `subscriptions/SubscriptionManagement.tsx:380`, `settlements/SettlementManagement.tsx:415` (all `grid grid-cols-1 sm:grid-cols-2 ...` of `DashboardCard`).
- Evidence: at 375px the first screen of Users is four 120px cards; the table starts below the fold (screenshot `scratchpad/admin-mobile/after/shell-375x812-closed.png`). Nothing overflows, so this was left as a design choice rather than fixed here.
- Fix sketch: a compact row variant below `sm`, as the manager dashboard's `src/components/ui/dashboard/DashboardCard.tsx` already does (`data-compact-card`, with a gap rule in `globals.css`).
- Effort: S.

### 9. The auth check re-runs on every admin navigation

- File: `src/components/admin/AdminLayout.tsx:104` (`[router, pathname]` dependency).
- Evidence: each route change calls `getSession()` and re-selects the `users` row, then replaces `adminUser` with a new object, re-rendering the shell.
- Fix sketch: depend on nothing (run once) and subscribe to `onAuthStateChange` for sign-out. Keep the redirect path read from a ref.
- Effort: S.

### 10. Row-action menus do not follow the scroll

- Files: `AcademyManagement.tsx`, `UserManagement.tsx`, `SubscriptionManagement.tsx`, `SupportManagement.tsx` (menus are `position: fixed`, placed by `anchorMenu`).
- Evidence: open a menu and scroll the list; the menu stays where it was while its row moves away. The click-outside overlay catches taps but not scrolls.
- Fix sketch: close the menu on `scroll` of `<main>` (one listener in a shared hook), or move to the Radix `DropdownMenu` the rest of the app uses.
- Effort: S.

### 11. Two copies of the sidebar poll the same counts

- File: `src/components/admin/AdminShell.tsx` (rail and drawer each mount `AdminSidebar`), `AdminSidebar.tsx:84-90` (60s poll of alerts and chat_conversations).
- Impact: with the drawer open on a tablet that later becomes lg, both poll; the bottom bar shows no Support badge at all.
- Fix sketch: lift the two counts into `AdminShell` (one poll) and pass them to the sidebar and the bottom bar's Support tab.
- Effort: S.

### 12. Design-system consistency is good; a few leftovers

- Every list page uses `AdminPageHeader`, `AdminTableShell`, `ModalShell`, `StatusBadge`, `useConfirm` (no `window.confirm` / `alert` left). Leftovers: dead `animate-in` / `slide-in-from-*` classes in `AdminHeader.tsx` (no `tailwindcss-animate` / `tw-animate-css` is installed, so they do nothing), the bank-qc panels' own card and table styles, and Study's underline tabs versus Bank QC's pill tabs.
- Effort: S each.

## Not verified

- Settlements and payouts were exercised only against mocked PortOne responses; the real PortOne shapes and their error states were not.
- RLS was read for `chat_conversations`, `chat_messages` and `alerts` only. The other tables admin pages touch from the browser are `users` (own row, name only, Settings) and `user_preferences` (language); both are normal user-scoped reads.
