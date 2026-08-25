# PostgREST 1000-row cap — audit, 2026-08-25

PostgREST caps a single response at ~1000 rows and reports success. With
an `ORDER BY`, truncation removes **one end** of the data, and which end
depends on the sort direction. This is not "a few rows missing".

## Why it matters more than it looks

The sessions page sorted date ASCENDING, so the 462 rows it lost were
the LATEST. It ended on 2026-08-04 while today was 2026-08-25: no
current or upcoming class was visible on the list or the calendar.

## Measured population (2026-08-25, largest single academy)

| table | rows | academies over 1000 |
|---|---|---|
| assignment_grades | 19,932 | 2 |
| attendance | 19,929 | 1 |
| student_reports | 1,925 | 1 |
| invoices | 1,824 | 1 |
| assignments | 1,463 | 2 |
| classroom_sessions | 1,463 | 1 |
| classroom_students | 303 | 0 |
| students | 150 | 0 |

The last two are nowhere near the cap and need nothing.

## A miss worth recording

The first attempt fixed `src/hooks/useSessionData.ts`, and verified it by
replaying that hook's query against the database: 1462 of 1462, no
duplicates. Both true, and both irrelevant — **nothing imports that
hook.** The sessions page has its own query. The check proved the hook
was fixed and said nothing about the page, which still showed 1000.

The hook has been deleted rather than left as a fixed-but-dead trap.

Verify against the SURFACE the user named, not against a plausible
implementation of it. `grep -rn "useSessionData" src/` was one command
and would have caught this before the claim was made.

## Fixed

- `src/components/ui/assignments/hooks/useAssignmentsData.ts` (ae9d96c)
- `src/components/ui/sessions-page.tsx` — the sessions list AND the
  filter-card counts. The latter carried a hand-written `.limit(1000)`,
  not a PostgREST cap; that literal was the "1000 sessions" the page
  reported. Both now paginate.
- `src/components/ui/attendance-page.tsx` — also stopped reporting a
  separate `count(*)` beside a truncated list, which is the tell

Use `fetchAllRows()` from `src/lib/fetch-all-rows.ts`. **Order by
something unique**, or a prefix plus a unique tiebreaker: `.range()`
pages are separate requests and without a total order rows can be
skipped or duplicated between them. Sessions share a date and a start
time constantly, which is exactly when this bites.

## Already correct — do not "fix"

These paginate server-side with a real pager UI, or filter to one
student/classroom. Checked individually:

- `usePaymentsData.ts:268` — `.range(from, to)`, real pagination
- `reports-page.tsx:695` — `.range(from, to)`

## Fixed — the money ones

`usePaymentsData.ts` summed EVERY invoice to produce all-time revenue,
unpaginated. On the demo academy it added up 1000 of 1774 paid invoices:

    revenue shown   ₩269,425,000
    revenue actual  ₩431,470,000
    understated     ₩162,045,000  (37.6%)

No error, no warning — a money figure quietly wrong by more than a
third. Both the paid and pending aggregates now page, ordered by `id`
(unique) so no invoice is counted twice. Verified on the page: it now
reads ₩431,470,000.

`useDashboardStats.ts` — the two months of paid invoices behind "revenue
this month" already returned **912 of the 1000 cap** at 150 students.
Not yet wrong, wrong on the next slightly bigger school, and silently.
Paged. Typing the rows also surfaced that `paid_at` and `created_at` are
both nullable and the code did `new Date(invoice.created_at)` — for a
null that is 1970, which drops the invoice out of every month bucket
rather than erroring. Now skipped explicitly.

## Checked and SAFE — do not "fix" these

Measured against real data, not assumed:

| site | why it is fine |
|---|---|
| `useDashboardStats.ts:168` | last 7 days of sessions — 198 rows |
| `useDashboardStats.ts:262` | the previous week — same order |
| `payments-page.tsx:1292` | an INSERT. The detector cannot tell. |
| `payments-page.tsx:1348` | narrowed by `.in('student_id', selected)` |
| `useReports.ts:105` | 77 reports for the largest academy |

## Not yet checked (13)

Lower priority: most are date-windowed aggregates (a week, a month) that
cannot approach 1000, or batch jobs rather than screens. Each still
needs checking against its real scope before being called safe.

    assignments         app/(app)/dashboard/hooks/useClassroomPerformance.ts:116
    assignments         app/mobile/hooks/useMobileDashboard.ts:387
    assignments         components/ui/archive-page.tsx:271
    assignments         hooks/queries/useOptimizedAssignments.ts:55
    assignments         lib/notification-triggers.ts:1896
    attendance          app/(app)/dashboard/hooks/useClassroomPerformance.ts:139
    classroom_sessions  app/mobile/page.tsx:290
    classroom_sessions  app/mobile/page.tsx:522
    classroom_sessions  components/ui/archive-page.tsx:228
    classroom_sessions  hooks/queries/useOptimizedAttendance.ts:43
    classroom_sessions  lib/notification-triggers.ts:2034
    classroom_sessions  lib/notification-triggers.ts:2062

**A caution on this list.** It came from a regex over call sites, and
the first version of that regex reported 329 — it could not see a
`.range()` more than 1600 characters below the `.from()`. Payments and
reports were on that list and are correct. Verify each site against its
real scope before changing it; the measurement above is the instrument,
not the grep.
