-- 065_study_response_audio_ledger.sql
--
-- Make every voice recording REFERENCEABLE from the moment it exists.
--
-- WHY
-- ---
-- On 2026-07-29 the study-response-audio bucket held 66 recordings from
-- 3 students and not one was referenced by any row: every
-- study_response_submissions row had audio_path NULL. 55 of them
-- belonged to sessions that never produced a speaking submission at all
-- (6 of those sessions were abandoned mid-test), so nothing in the
-- product could surface them and no deletion path could reach them.
-- They were deleted manually; this migration stops it recurring.
--
-- The root cause is WHEN the reference is written. audio_path is set at
-- GRADING time (grade-batch / grade-audio), so any recording whose test
-- is never submitted is orphaned by construction. A student who records
-- three answers and closes the tab leaves three unreachable files.
--
-- So the reference moves to UPLOAD time. The transcribe route inserts a
-- row here immediately after the object lands in the bucket, before it
-- calls Whisper — the same ordering the route already uses for the
-- upload itself ("store the audio first so we have a path even if
-- transcription fails").
--
-- audio_path on study_response_submissions is NOT replaced. It stays as
-- the grading-time pointer used by the review screen. This table is the
-- durable inventory underneath it: submissions answer "which recording
-- belongs to this graded response", this answers "what audio exists at
-- all, and whose is it".
--
-- WHY A DELETION QUEUE
-- --------------------
-- A cascading FK deletes the ROW. It does not delete the OBJECT — the
-- bytes live in storage, and Postgres has no reach there. The account
-- deletion cron (src/app/api/cron/process-account-deletions) removes
-- database rows only and has never touched storage. So without the
-- queue below, this table would make recordings referenceable right up
-- until the moment a student deletes their account, at which point the
-- reference would vanish and the file would remain — exactly the state
-- we just cleaned up, recreated on the one path where it matters most.
--
-- The trigger captures the path on ANY delete of a ledger row, whether
-- it came from a user deletion, a session deletion, or a manual DELETE.
-- That is deliberate: a cascade fires from places no application code
-- knows about, so the capture has to live in the database, not in the
-- route that happens to be deleting today.
--
-- Draining the queue is a separate job (deferred): it needs storage
-- credentials, which Postgres does not have. Until that job exists the
-- queue is an accurate to-do list rather than a leak — which is still
-- strictly better than the current silent loss.

begin;

create table if not exists public.study_response_audio (
  id            uuid primary key default gen_random_uuid(),
  -- Cascade chain is users -> study_sessions -> here, matching how
  -- study_response_submissions already hangs off the session.
  session_id    uuid not null references public.study_sessions(id) on delete cascade,
  -- Denormalised from the session on purpose. The trigger below needs
  -- the owner AFTER the session row is gone (cascade deletes children
  -- first), and it is also what the storage RLS policy keys on: the
  -- bucket path is `<student_id>/<session_id>/<epoch>.<ext>`.
  student_id    uuid not null,
  -- Unique so a retried upload cannot double-insert, and so the drain
  -- job can dedupe by path.
  storage_path  text not null unique,
  mime_type     text,
  bytes         bigint,
  -- Question index within the session when known. Nullable because the
  -- transcribe route does not currently receive it; wiring it later
  -- turns "which recording is this" from a timestamp guess into a fact.
  position      integer,
  created_at    timestamptz not null default now()
);

create index if not exists study_response_audio_session_idx
  on public.study_response_audio (session_id);
create index if not exists study_response_audio_student_idx
  on public.study_response_audio (student_id, created_at desc);

alter table public.study_response_audio enable row level security;

-- Students read their own recordings; nothing else is exposed. Writes
-- go through the service role in the transcribe route, so there is
-- deliberately no INSERT/UPDATE/DELETE policy for end users.
drop policy if exists study_response_audio_select_own on public.study_response_audio;
create policy study_response_audio_select_own
  on public.study_response_audio for select
  using (student_id = auth.uid());

-- ---------------------------------------------------------------
-- Storage deletion queue
-- ---------------------------------------------------------------

create table if not exists public.storage_deletion_queue (
  id            bigserial primary key,
  bucket_id     text not null,
  storage_path  text not null,
  enqueued_at   timestamptz not null default now(),
  -- Set by the drain job once the object is actually gone. Rows are
  -- kept, not deleted, so "did we honour this deletion" stays auditable
  -- — which is the whole point for personal data.
  deleted_at    timestamptz,
  attempts      integer not null default 0,
  last_error    text
);

-- Partial index: the drain job only ever scans outstanding work.
create index if not exists storage_deletion_queue_pending_idx
  on public.storage_deletion_queue (enqueued_at)
  where deleted_at is null;

alter table public.storage_deletion_queue enable row level security;
-- No policies: service-role only. Students have no business reading a
-- list of file paths, including their own.

create or replace function public.enqueue_response_audio_deletion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.storage_deletion_queue (bucket_id, storage_path)
  values ('study-response-audio', old.storage_path);
  return old;
end;
$$;

drop trigger if exists study_response_audio_enqueue_delete on public.study_response_audio;
create trigger study_response_audio_enqueue_delete
  after delete on public.study_response_audio
  for each row execute function public.enqueue_response_audio_deletion();

commit;
