-- 085: partial refunds for study payments
--
-- study_payments previously tracked refunds as all-or-nothing via
-- refunded_at/refund_reason. This adds a per-refund ledger so a payment can
-- be refunded in parts:
--   • study_payment_refunds — one row per (partial or full) refund issued.
--   • admin_insert_study_refund() — the ONLY safe writer: locks the payment
--     row, recomputes remaining, and rejects an amount exceeding it, so two
--     concurrent operator refunds cannot both pass a read-then-write check
--     (a SELECT-then-INSERT dedupe is not idempotent; the row lock is).
--   • admin_study_payment_totals() — net revenue now subtracts the refund
--     ledger, so a partially refunded payment stops overstating revenue.
--   • Backfill: every already-refunded payment gets one full-amount ledger
--     row (created_at = refunded_at) so history is consistent.
--
-- study_payments.refunded_at now means "fully refunded" — it is stamped by
-- the refund route only when remaining reaches 0.

create table if not exists public.study_payment_refunds (
  id          uuid primary key default gen_random_uuid(),
  payment_id  text not null references public.study_payments(payment_id),
  amount_won  int  not null check (amount_won > 0),
  reason      text,
  created_by  uuid,
  created_at  timestamptz not null default now()
);

create index if not exists study_payment_refunds_payment_id_idx
  on public.study_payment_refunds (payment_id);

-- Service-role only: RLS on with no policies. Admin routes use the service
-- client; students never read the refund ledger directly.
alter table public.study_payment_refunds enable row level security;

-- Backfill: one full-amount record per already-refunded payment. amount_won=0
-- rows (zero-priced backfilled subscription charges) are skipped — the ledger
-- CHECK requires > 0 and a zero refund carries no money anyway.
insert into public.study_payment_refunds (payment_id, amount_won, reason, created_at)
select p.payment_id, p.amount_won, p.refund_reason, coalesce(p.refunded_at, now())
from public.study_payments p
where p.refunded_at is not null
  and p.amount_won > 0
  and not exists (
    select 1 from public.study_payment_refunds r where r.payment_id = p.payment_id
  );

-- Atomic guard + insert. Locks the payment row (FOR UPDATE) so concurrent
-- calls serialize; the remaining check therefore sees every prior insert.
-- Raises:
--   P0002 'payment not found'
--   P0001 'refund exceeds remaining' (also covers amount <= 0 via the CHECK)
create or replace function public.admin_insert_study_refund(
  p_payment_id text,
  p_amount     int,
  p_reason     text,
  p_created_by uuid default null
)
returns table (refund_id uuid, remaining_after int)
language plpgsql
set search_path = public
as $$
declare
  v_total int;
  v_prior int;
  v_id    uuid;
begin
  select amount_won into v_total
  from public.study_payments
  where payment_id = p_payment_id
  for update;

  if not found then
    raise exception 'payment not found' using errcode = 'P0002';
  end if;

  select coalesce(sum(amount_won), 0) into v_prior
  from public.study_payment_refunds
  where payment_id = p_payment_id;

  if p_amount is null or p_amount <= 0 or v_prior + p_amount > v_total then
    raise exception 'refund exceeds remaining' using errcode = 'P0001';
  end if;

  insert into public.study_payment_refunds (payment_id, amount_won, reason, created_by)
  values (p_payment_id, p_amount, p_reason, p_created_by)
  returning id into v_id;

  return query select v_id, v_total - v_prior - p_amount;
end;
$$;

revoke all on function public.admin_insert_study_refund(text, int, text, uuid) from public, anon, authenticated;
grant execute on function public.admin_insert_study_refund(text, int, text, uuid) to service_role;

-- Net revenue: subtract the refund ledger instead of zeroing refunded rows.
-- Post-backfill the two agree on fully refunded payments (amount − amount = 0)
-- and this version also counts partial refunds.
create or replace function public.admin_study_payment_totals(
  p_kind        text   default null,
  p_student_ids uuid[] default null
)
returns table (total_count bigint, net_won bigint)
language sql
stable
set search_path = public
as $$
  select
    count(*)::bigint,
    coalesce(sum(coalesce(p.amount_won, 0) - coalesce(r.refunded_won, 0)), 0)::bigint
  from public.study_payments p
  left join (
    select payment_id, sum(amount_won) as refunded_won
    from public.study_payment_refunds
    group by payment_id
  ) r on r.payment_id = p.payment_id
  where (p_kind is null or p.kind = p_kind)
    and (p_student_ids is null or p.student_id = any(p_student_ids));
$$;
