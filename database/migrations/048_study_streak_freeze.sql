-- Streak Freeze — persisted streak state + freeze inventory.
--
-- The daily streak count is still DERIVED from study_sessions.last_active_at
-- (nothing is written as the student studies). This table adds the freeze
-- layer on top: an inventory of "freezes" that auto-protect a missed day so
-- a single skipped day doesn't reset a hard-won streak (Duolingo's core
-- anti-churn mechanic).
--
-- protected_days records which past dates a freeze has been consumed to
-- cover — those days count as "kept" when the streak is walked back, and
-- the record makes consumption idempotent (a day is never double-charged).
--
-- last_milestone_awarded ratchets freeze grants (one per 7-day streak
-- milestone, capped in inventory) so re-reads don't repeatedly grant.
--
-- Service-role only (matches the other study ledgers): RLS on, no client
-- policies — the API reads/writes via supabaseAdmin.

create table if not exists public.study_streak_state (
  student_id              uuid primary key references auth.users(id) on delete cascade,
  -- Freeze inventory (capped in application code, e.g. 2).
  freezes                 integer not null default 1,
  -- Past dates auto-protected by a consumed freeze (bounded to a ~60d window
  -- by the application, which prunes older entries on each evaluation).
  protected_days          date[] not null default '{}',
  -- Highest streak the student has ever reached (persisted so it survives
  -- a reset — surfaced as "best streak" on the stats page).
  max_streak              integer not null default 0,
  -- Highest 7-day milestone already granted a freeze for (ratchet).
  last_milestone_awarded  integer not null default 0,
  -- Guards the "we saved your streak" inbox notification to once per day.
  last_saved_notified_on  date,
  updated_at              timestamptz not null default now()
);

alter table public.study_streak_state enable row level security;
