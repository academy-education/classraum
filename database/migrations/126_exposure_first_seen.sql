-- 126_exposure_first_seen.sql — keep the FIRST time a student saw an item.
--
-- NOT APPLIED. Tested in a rolled-back transaction against the live
-- database on 2026-10-07 (database/tests/126_exposure_first_seen.test.sql).
--
-- ── Owner decision 2 (2026-10-07) ────────────────────────────────────
-- study_item_exposures is UPSERTed on (student_id, item_id) and a re-serve
-- REFRESHES seen_at and session_id (assemble.ts recordExposures,
-- ignoreDuplicates:false — deliberately, so the oldest-first recycler
-- rotates). That is right for the draw and destroys the one fact
-- real-attempts.ts needs: when, and in which session, the student FIRST
-- met the item. An item served, left unanswered, and served again looked
-- like a first exposure the second time.
--
-- Two columns, both set once on INSERT and never changed afterwards:
--   first_seen_at          when the row was first written
--   first_seen_session_id  the session it was first written for
-- The session is needed as well as the time: real-attempts.ts decides
-- first exposure by WHICH session met the item first, and pairing the
-- first time with the latest session_id would credit the re-serve.
--
-- ── Write-once is enforced by a trigger, not by the caller ───────────
-- BEFORE INSERT copies seen_at / session_id into the first_* columns
-- (ignoring anything the caller passed). BEFORE UPDATE restores OLD's
-- first_* values whatever the UPDATE said — so ON CONFLICT DO UPDATE from
-- the existing upsert, a future upsert that names the columns, and a
-- hand-written UPDATE all leave them alone. No application change is
-- needed for the write path.
--
-- ── Backfill: earliest DIRECT evidence ───────────────────────────────
-- For every existing row:
--   first_seen_at = least(seen_at, earliest study_attempts.created_at for
--                   that student + item)
--   first_seen_session_id = the session of whichever of the two won
--                   (seen_at's own session_id on a tie or no attempt).
-- Why those two and nothing else:
--   * seen_at is the LATEST serve. It is an upper bound on first sight,
--     exact for every row that was never re-served.
--   * an attempt row is direct proof the student had the item in front of
--     them at that moment, in that session. Its created_at is itself an
--     upper bound (the item was served a little earlier), so the backfill
--     can be LATE but never claims a sighting earlier than the evidence.
--   * study_sessions.created_at was considered and rejected: it is not
--     per-item evidence (practice can serve items after the session row
--     exists), and on live data 628 exposures have seen_at BEFORE their
--     own session's created_at (exposures are written first), so it is not
--     a bound in either direction.
-- Measured 2026-10-07: 8,955 rows; 6,188 have an attempt; on 135 an
-- attempt predates seen_at — every one in a DIFFERENT session from the
-- current session_id, i.e. a re-serve overwrote a real first sighting.
-- Those 135 get the attempt's time and session. The rest keep seen_at.
-- What the backfill cannot recover: a re-served item the student never
-- answered before the re-serve. No row records that serve; it is lost.
-- (12 student+item pairs have attempts and no exposure row at all; they
-- are left alone — real-attempts.ts reads attempts as exposures too.)

begin;

alter table public.study_item_exposures
  add column if not exists first_seen_at timestamptz,
  add column if not exists first_seen_session_id uuid;

-- Backfill (before the trigger exists, so these UPDATEs are not reverted).
update public.study_item_exposures
   set first_seen_at = seen_at,
       first_seen_session_id = session_id
 where first_seen_at is null;

with earliest_attempt as (
  select s.student_id, a.item_id,
         (array_agg(a.created_at order by a.created_at, a.id))[1] as at,
         (array_agg(a.session_id order by a.created_at, a.id))[1] as session_id
    from public.study_attempts a
    join public.study_sessions s on s.id = a.session_id
   where a.item_id is not null
   group by s.student_id, a.item_id
)
update public.study_item_exposures e
   set first_seen_at = ea.at,
       first_seen_session_id = ea.session_id
  from earliest_attempt ea
 where ea.student_id = e.student_id
   and ea.item_id = e.item_id
   and ea.at < e.first_seen_at;

alter table public.study_item_exposures
  alter column first_seen_at set not null;

comment on column public.study_item_exposures.first_seen_at is
  'When the student FIRST saw this item. Set on insert, never changed (trigger '
  'study_item_exposures_first_seen). seen_at is the LATEST serve. Backfilled '
  'in 126 from least(seen_at, earliest attempt).';
comment on column public.study_item_exposures.first_seen_session_id is
  'Session of the first sighting (pairs with first_seen_at). Write-once.';

create or replace function public.study_item_exposures_first_seen()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.first_seen_at := coalesce(new.seen_at, now());
    new.first_seen_session_id := new.session_id;
  else
    new.first_seen_at := old.first_seen_at;
    new.first_seen_session_id := old.first_seen_session_id;
  end if;
  return new;
end;
$$;

revoke all on function public.study_item_exposures_first_seen() from public, anon, authenticated;

drop trigger if exists study_item_exposures_first_seen on public.study_item_exposures;
create trigger study_item_exposures_first_seen
  before insert or update on public.study_item_exposures
  for each row execute function public.study_item_exposures_first_seen();

commit;
