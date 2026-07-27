-- Reverts migration 056. That FK broke academy deletion.
--
-- 056 added invoices.academy_id -> academies(id) ON DELETE RESTRICT so
-- PostgREST could embed `academies(name)` on invoices. It did fix the
-- embed. It also silently broke `delete_academy_cascade()`, which the
-- nightly process-account-deletions cron calls whenever the sole
-- manager of an academy completes account deletion.
--
-- That function anonymizes subscription_invoices (academy_id = NULL),
-- deletes announcements, then deletes the academy — but it never
-- touches `invoices`. With RESTRICT in place the delete raises a
-- foreign-key violation, so the cron would have failed every night for
-- any academy that has ever issued an invoice. Confirmed by calling the
-- function inside a rolled-back transaction: foreign_key_violation.
--
-- The obvious repair, ON DELETE SET NULL to match subscription_invoices,
-- is not available: invoices.academy_id is NOT NULL, and relaxing that
-- would let new invoices be written with no academy at all — a worse
-- problem than the one being solved.
--
-- The remaining choices both decide the fate of financial records:
-- CASCADE destroys an academy's billing history along with it, which
-- contradicts delete_user_account_cascade deliberately ANONYMIZING a
-- departing student's invoices rather than deleting them; or the cascade
-- function itself has to be taught what to do with invoices. That is a
-- retention policy decision, not a schema detail, so it is left to a
-- human rather than settled here.
--
-- The widget that needed the embed now fetches academy names with a
-- second query instead. Slightly less elegant, and it cannot break a
-- cron.
begin;

alter table invoices drop constraint if exists invoices_academy_id_fkey;

commit;
