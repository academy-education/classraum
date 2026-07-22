-- 049_study_question_reports.sql
-- Student-facing question dispute / report flow. A student who spots a
-- wrong answer key, an ambiguous stem, a typo, or off-topic content can
-- flag the question from the post-session review. Reports land in a queue
-- for human review and feed bank QC — the first real quality signal from
-- live use (study_attempts are contaminated test data, so item stats
-- aren't trustworthy yet; an explicit human flag is).
create table if not exists public.study_question_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  session_id uuid references public.study_sessions(id) on delete set null,
  -- Served questions carry no stable id (bank draw returns renderer-shaped
  -- items), so identify by a content hash of the normalized prompt +
  -- correct answer, computed server-side, plus a full snapshot for review.
  question_hash text not null,
  question_snapshot jsonb not null,
  reason text not null check (reason in ('wrong_key','ambiguous','typo','off_topic','other')),
  note text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index if not exists study_question_reports_student_hash_uniq
  on public.study_question_reports (student_id, question_hash);

create index if not exists study_question_reports_status_idx
  on public.study_question_reports (status, created_at desc);

alter table public.study_question_reports enable row level security;

drop policy if exists "study_question_reports insert own" on public.study_question_reports;
create policy "study_question_reports insert own" on public.study_question_reports
  for insert to authenticated with check (student_id = auth.uid());

drop policy if exists "study_question_reports select own" on public.study_question_reports;
create policy "study_question_reports select own" on public.study_question_reports
  for select to authenticated using (student_id = auth.uid());
