-- 051: server-side aggregates for the admin study lists
--
-- The admin Payments / Subscriptions tabs previously fetched a capped slab
-- of rows (limit 1000 / 2000) and paginated + summed in JS. Past the cap
-- rows silently vanished from the list AND the revenue total silently went
-- wrong — the worst failure mode for a money screen. These functions let the
-- routes page with .range() while keeping counts and revenue exact.
--
-- Access: INVOKER (not SECURITY DEFINER) and execute is revoked from
-- anon/authenticated — only service_role (our admin API routes) may call
-- them, so revenue totals are never reachable with a public key.

CREATE OR REPLACE FUNCTION public.admin_study_payment_totals(
  p_kind        text     DEFAULT NULL,
  p_student_ids uuid[]   DEFAULT NULL
)
RETURNS TABLE (total_count bigint, net_won bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    COUNT(*)::bigint,
    -- Net revenue: refunded rows contribute nothing.
    COALESCE(SUM(CASE WHEN refunded_at IS NULL THEN amount_won ELSE 0 END), 0)::bigint
  FROM public.study_payments
  WHERE (p_kind IS NULL OR kind = p_kind)
    AND (p_student_ids IS NULL OR student_id = ANY(p_student_ids));
$$;

CREATE OR REPLACE FUNCTION public.admin_study_subscription_status_counts()
RETURNS TABLE (status text, cnt bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT status, COUNT(*)::bigint
  FROM public.study_subscriptions
  GROUP BY status;
$$;

REVOKE ALL ON FUNCTION public.admin_study_payment_totals(text, uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_study_subscription_status_counts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_study_payment_totals(text, uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_study_subscription_status_counts() TO service_role;
