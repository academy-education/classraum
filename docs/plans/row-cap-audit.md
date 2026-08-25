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

## Fixed

- `src/components/ui/assignments/hooks/useAssignmentsData.ts` (ae9d96c)
- `src/hooks/useSessionData.ts` — sessions page + calendar
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

## Not yet fixed (21)

Lower priority: most are date-windowed aggregates (a week, a month) that
cannot approach 1000, or batch jobs rather than screens. Each still
needs checking against its real scope before being called safe.

    assignments         app/(app)/dashboard/hooks/useClassroomPerformance.ts:116
    assignments         app/mobile/hooks/useMobileDashboard.ts:387
    assignments         components/ui/archive-page.tsx:271
    assignments         hooks/queries/useOptimizedAssignments.ts:55
    assignments         hooks/useSessionData.ts:185
    assignments         lib/notification-triggers.ts:1896
    attendance          app/(app)/dashboard/hooks/useClassroomPerformance.ts:139
    classroom_sessions  app/(app)/dashboard/hooks/useDashboardStats.ts:168
    classroom_sessions  app/(app)/dashboard/hooks/useDashboardStats.ts:262
    classroom_sessions  app/mobile/page.tsx:290
    classroom_sessions  app/mobile/page.tsx:522
    classroom_sessions  components/ui/archive-page.tsx:228
    classroom_sessions  hooks/queries/useOptimizedAttendance.ts:43
    classroom_sessions  lib/notification-triggers.ts:2034
    classroom_sessions  lib/notification-triggers.ts:2062
    invoices            app/(app)/dashboard/hooks/useDashboardStats.ts:246
    invoices            components/ui/payments-page.tsx:1292
    invoices            components/ui/payments-page.tsx:1348
    invoices            components/ui/payments/hooks/usePaymentsData.ts:280
    invoices            components/ui/payments/hooks/usePaymentsData.ts:288
    student_reports     hooks/useReports.ts:105

**A caution on this list.** It came from a regex over call sites, and
the first version of that regex reported 329 — it could not see a
`.range()` more than 1600 characters below the `.from()`. Payments and
reports were on that list and are correct. Verify each site against its
real scope before changing it; the measurement above is the instrument,
not the grep.
