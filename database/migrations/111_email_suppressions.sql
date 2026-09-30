-- 111: addresses we never email, whatever the mail is.
--
-- 2026-09-30: the owner asked that nothing be sent to the two "Manning" test
-- accounts (alexandria@gmail.com, sonny@gmail.com). Both are still on
-- auto-renewing plans, so a per-charge hold (migration 110) would not cover
-- the next renewal's receipt, the renewal reminder, the weekly recap or any
-- auth mail. The check lives in sendResendEmail, which every product and auth
-- email passes through (sendPostmarkEmail delegates to it).
--
-- Addresses are stored lower-cased and trimmed; the sender compares the same
-- way. Service role only: RLS on, no policies.
create table if not exists public.email_suppressions (
  email text primary key check (email = lower(btrim(email))),
  reason text not null,
  created_at timestamptz not null default now()
);
alter table public.email_suppressions enable row level security;

insert into public.email_suppressions (email, reason) values
  ('alexandria@gmail.com', 'Manning test account: owner said send nothing (2026-09-30)'),
  ('sonny@gmail.com', 'Manning test account: owner said send nothing (2026-09-30)')
on conflict (email) do nothing;

-- Rollback:
--   drop table if exists public.email_suppressions;
