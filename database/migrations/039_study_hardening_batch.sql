-- 039: Study module hardening batch.
-- Already applied to the live Supabase project (via MCP) during the
-- July 2026 bug-fix pass; this file captures the DDL so the schema is
-- reproducible from the repo. Idempotent — safe to run again.

-- Atomic credit-pack top-up. The purchase-pack route previously did a
-- read-modify-write on purchased_credits_remaining, which raced under
-- double-tap / retry. SECURITY DEFINER + revoked from client roles:
-- only the service role (supabaseAdmin) may call it.
create or replace function public.increment_study_purchased_credits(
  p_student_id uuid,
  p_delta integer
) returns void
language sql
security definer
set search_path = public
as $$
  update study_subscriptions
  set purchased_credits_remaining = coalesce(purchased_credits_remaining, 0) + p_delta,
      updated_at = now()
  where student_id = p_student_id;
$$;

revoke all on function public.increment_study_purchased_credits(uuid, integer) from public;
revoke all on function public.increment_study_purchased_credits(uuid, integer) from anon;
revoke all on function public.increment_study_purchased_credits(uuid, integer) from authenticated;

-- Exposure ledger for bank-assembled tests: one row per (student, item),
-- seen_at refreshed on re-serve so recycling is fair
-- (least-recently-seen items are picked first by assembleFromBank).
create table if not exists public.study_item_exposures (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  item_id uuid not null references public.study_item_bank (id) on delete cascade,
  source text,
  session_id uuid,
  seen_at timestamptz not null default now(),
  unique (student_id, item_id)
);

create index if not exists idx_item_exposures_student
  on public.study_item_exposures (student_id, seen_at);

-- Service-role only — clients never read or write the ledger directly.
-- RLS enabled with no policies = deny all for anon/authenticated.
alter table public.study_item_exposures enable row level security;

-- Free tier: study_subscriptions.status gains 'free'.
alter table public.study_subscriptions
  drop constraint if exists study_subscriptions_status_check;
alter table public.study_subscriptions
  add constraint study_subscriptions_status_check
  check (status in ('free', 'trial', 'active', 'past_due', 'cancelled', 'expired'));
