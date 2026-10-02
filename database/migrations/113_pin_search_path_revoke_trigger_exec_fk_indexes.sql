-- Migration 113: advisor hygiene after 112.
--
-- 1. Pin search_path on the 8 functions the security advisor flags as
--    "function_search_path_mutable". Every body was read first: each one
--    either schema-qualifies its tables (public.*) or calls only pg_catalog
--    built-ins (md5, coalesce, regexp_replace, jsonb_array_elements_text,
--    now ...), and pg_catalog is always searched, so '' is safe. Verified in a
--    rolled-back transaction: study_item_content_sha / study_item_dedup_key
--    return identical hashes before and after, and the touch/lock triggers
--    fire under the pinned path.
--
-- 2. Revoke caller EXECUTE on the three remaining anon-callable SECURITY
--    DEFINER functions. All three RETURN trigger and are referenced only from
--    pg_trigger:
--      handle_new_user                 -> auth.users          on_auth_user_created
--      enqueue_response_audio_deletion -> study_response_audio study_response_audio_enqueue_delete
--      update_conversation_timestamp   -> chat_messages, user_messages
--    Postgres checks EXECUTE on a trigger function only at CREATE TRIGGER,
--    not when the trigger fires (verified in a rolled-back txn: a trigger
--    whose function had EXECUTE revoked from authenticated still fired for an
--    insert made as authenticated). postgres / service_role keep EXECUTE.
--
-- 3. Indexes on unindexed foreign keys - see the bottom of this file. No FK
--    table exceeds 10k rows, so only columns referenced by an RLS policy on
--    their own table and/or filtered with .eq() in src/ were indexed.

-- 1 -------------------------------------------------------------------------
ALTER FUNCTION public.bump_study_session_activity()          SET search_path = '';
ALTER FUNCTION public.touch_study_attempt_notes_updated_at() SET search_path = '';
ALTER FUNCTION public.study_item_reviews_lock_blind()        SET search_path = '';
ALTER FUNCTION public.study_item_content_sha(jsonb)          SET search_path = '';
ALTER FUNCTION public.study_item_reviews_stamp_sha()         SET search_path = '';
ALTER FUNCTION public.study_item_dedup_key(jsonb)            SET search_path = '';
ALTER FUNCTION public.study_item_attacks_stamp_sha()         SET search_path = '';
ALTER FUNCTION public.touch_sweep_verdict()                  SET search_path = '';

-- 2 -------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_response_audio_deletion() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_conversation_timestamp()   FROM PUBLIC, anon, authenticated;

-- 3 -------------------------------------------------------------------------
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction, and
-- apply_migration wraps its body in one, so these were run one at a time via
-- execute_sql on 2026-10-02. Recorded here so a fresh environment gets them;
-- run them outside a transaction.
--
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classroom_sessions_substitute_teacher
--   ON public.classroom_sessions (substitute_teacher);          -- RLS SELECT/UPDATE: substitute_teacher = auth.uid()
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignment_comments_user_id
--   ON public.assignment_comments (user_id);                    -- RLS DELETE x3: user_id = auth.uid()
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_families_academy_id
--   ON public.families (academy_id);                            -- RLS + .eq('academy_id') x3
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignment_categories_academy_id
--   ON public.assignment_categories (academy_id);               -- RLS x3 + .eq('academy_id') x3
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recurring_payment_templates_academy_id
--   ON public.recurring_payment_templates (academy_id);         -- RLS x2 + .eq('academy_id') x6
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_template_id
--   ON public.invoices (template_id);                           -- .eq('template_id') x4 (recurring cron)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_announcements_created_by
--   ON public.announcements (created_by);                       -- RLS UPDATE/DELETE: created_by = auth.uid()
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_user_id
--   ON public.support_tickets (user_id);                        -- RLS ALL: user_id = auth.uid()
--
-- Deliberately NOT indexed: topic_id on study_attempts/sessions/flashcard_reviews/
-- mastery/snap_captures and study_item_exposures.item_id - every app query is
-- student-scoped and served by an existing (student_id, ...) composite; plus
-- the created_by/resolved_by/uploaded_by-style audit columns, which nothing
-- filters on.
