-- Credits could be granted to nobody.
--
-- increment_study_purchased_credits was a bare UPDATE returning void:
--
--   update study_subscriptions
--   set purchased_credits_remaining = ... where student_id = p_student_id;
--
-- A student with no study_subscriptions row updates ZERO rows, and the
-- function still returns success. Every caller therefore reported the
-- grant as delivered while the credits went nowhere.
--
-- Six call sites reach this function: credit-pack purchases, league
-- reward payouts, 1v1 duel wins, gift redemptions, referral redemptions
-- and referral conversions. Only two of them (grant-purchase.ts and
-- league-rewards.ts) pre-created the row first, so the other four could
-- silently drop a grant — including duel wins, where the win is
-- recorded and the prize is not.
--
-- Fixing the four call sites would mean copying the same twenty-line
-- create-then-grant dance into each, and the seventh caller would
-- forget. So the guarantee belongs in the function: make it an upsert
-- and every present and future caller inherits it.
begin;

create or replace function public.increment_study_purchased_credits(
  p_student_id uuid,
  p_delta integer
)
returns void
language sql
security definer
set search_path to 'public'
as $function$
  insert into study_subscriptions (
    student_id, status, plan, price_cents, currency,
    purchased_credits_remaining, updated_at
  )
  values (
    p_student_id, 'free', 'free_v1', 0, 'KRW',
    -- Only on the INSERT branch. A negative delta against a
    -- non-existent row must not mint a negative balance.
    greatest(p_delta, 0), now()
  )
  on conflict (student_id) do update
    set purchased_credits_remaining =
          coalesce(study_subscriptions.purchased_credits_remaining, 0) + p_delta,
        updated_at = now();
$function$;

-- Auto-provisioned rows describe a free account, so the column defaults
-- must describe one too. They said 'monthly_v1' at 990000 cents — a row
-- created without explicit values claimed a paying customer on a plan
-- nobody had bought. Every real caller sets these explicitly, so this
-- only changes what an implicit insert produces.
alter table study_subscriptions alter column plan set default 'free_v1';
alter table study_subscriptions alter column price_cents set default 0;

-- Backfill the rows that already inherited the wrong price. The admin
-- subscriptions table renders price_cents per row, so free accounts have
-- been displaying ₩9,900. Scoped to free_v1 so no genuine paid row is
-- touched.
update study_subscriptions
set price_cents = 0, updated_at = now()
where plan = 'free_v1' and price_cents <> 0;

commit;
