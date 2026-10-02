-- 115: one recurring invoice per (template, student, period).
--
-- generateRecurringInvoices pre-reads the invoices already written for
-- (template_id, due_date) and inserts the rest. Two overlapping runs (the
-- daily cron and a manual retry) both pre-read "none" and both insert: a
-- second bill to a real parent. The generator now handles 23505 by
-- re-inserting row by row and skipping the duplicates, so with this index
-- the database is the guard. Without it the code behaves as before.
--
-- NOT APPLIED (2026-10-02). The live table already holds one duplicate
-- that makes this index fail to build:
--   template c91a7ab2-abec-41da-8643-832024c7f55e, student
--   c73c0670-506b-41cf-b9f1-034cd2801cf7, due_date 2025-10-15 — two
--   'pending' rows created 2025-09-28 02:53 and 04:58 UTC.
-- Decide which row is real (void/delete the other) BEFORE applying. Find
-- any others first:
--   select template_id, student_id, due_date, count(*)
--     from public.invoices where template_id is not null
--    group by 1, 2, 3 having count(*) > 1;
--
-- template_id NULL (one-off invoices) is unaffected: NULLs are distinct.
create unique index if not exists invoices_recurring_period_once
  on public.invoices (template_id, student_id, due_date);

-- Rollback:
--   drop index if exists public.invoices_recurring_period_once;
