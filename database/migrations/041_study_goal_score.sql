-- Predicted-score + study-plan engine, P1: goal capture.
--
-- goal_score  — the total scaled score the student is aiming for
--               (SAT: 400–1600). NULL = no goal set yet.
-- test_date   — when they sit the real exam; drives the "weeks to test"
--               projection horizon and the plan pace. NULL = unset.
--
-- Both live on the existing per-student prefs row (service-role writes
-- via the /api/study/prefs PUT, same as target_test / daily_goal).

alter table public.study_user_prefs
  add column if not exists goal_score integer,
  add column if not exists test_date  date;
