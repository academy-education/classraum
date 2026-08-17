-- Add a payment-status filter to admin_study_payment_totals so the admin
-- Payments tab's new status dropdown (All / Paid / Partially refunded /
-- Refunded) keeps its pagination count and net-revenue figure exact under
-- the filter. Status derives from the same signals the list DTO uses:
--   refunded — refunded_at stamped (remaining hit 0)
--   partial  — not stamped, but the refund ledger holds something
--   paid     — not stamped, ledger empty
--
-- The old 2-arg function is DROPPED (not just replaced): CREATE OR REPLACE
-- with an added defaulted arg would leave both overloads behind, and a
-- PostgREST rpc call that omits the new arg would then be ambiguous.
begin;

drop function if exists public.admin_study_payment_totals(text, uuid[]);

create function public.admin_study_payment_totals(
  p_kind        text   default null,
  p_student_ids uuid[] default null,
  p_pay_status  text   default null
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
    and (p_student_ids is null or p.student_id = any(p_student_ids))
    and (
      p_pay_status is null
      or (p_pay_status = 'refunded' and p.refunded_at is not null)
      or (p_pay_status = 'partial'  and p.refunded_at is null and coalesce(r.refunded_won, 0) > 0)
      or (p_pay_status = 'paid'     and p.refunded_at is null and coalesce(r.refunded_won, 0) = 0)
    );
$$;

revoke all on function public.admin_study_payment_totals(text, uuid[], text) from public, anon, authenticated;
grant execute on function public.admin_study_payment_totals(text, uuid[], text) to service_role;

commit;
