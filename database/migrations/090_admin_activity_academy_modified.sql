-- Admin audit trail: allow 'academy_modified'.
--
-- logAdminActivity() (src/lib/admin-auth.ts) maps any action whose text
-- contains "academy" to action_type 'academy_modified'. That value was
-- never in admin_activity_logs_action_type_check, so Postgres rejected
-- the row, the insert returned { error } instead of throwing, and the
-- caller logged to console and carried on. Every academy-scoped
-- privileged action has therefore been missing from the audit trail
-- since the table was created — the same shape as the notifications
-- type CHECK that silently dropped study notification kinds.
--
-- Verified before writing this migration: an insert of
-- 'academy_modified' inside a rolled-back transaction raised
-- check_violation. Re-run that probe after applying and it succeeds.
--
-- The three existing academy values are kept: they describe specific
-- lifecycle events, whereas 'academy_modified' is the catch-all the code
-- actually emits.

ALTER TABLE public.admin_activity_logs
  DROP CONSTRAINT IF EXISTS admin_activity_logs_action_type_check;

ALTER TABLE public.admin_activity_logs
  ADD CONSTRAINT admin_activity_logs_action_type_check
  CHECK (action_type = ANY (ARRAY[
    'academy_created'::text,
    'academy_modified'::text,
    'academy_suspended'::text,
    'academy_unsuspended'::text,
    'subscription_modified'::text,
    'user_modified'::text,
    'notification_sent'::text,
    'support_ticket_created'::text,
    'support_ticket_updated'::text,
    'bulk_operation'::text
  ]));
