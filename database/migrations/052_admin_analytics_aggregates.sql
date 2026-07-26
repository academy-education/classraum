-- 052: server-side aggregates for the admin analytics + admin list screens
--
-- Motivation, same as 051: several admin screens reduced over ONE .range()
-- page (or over an unbounded .select() silently capped at PostgREST's 1000
-- rows) and rendered the result as a platform-wide "total". A card that says
-- "5,000 events / 43 processed" is not a rounding error, it is a wrong number
-- presented with total confidence. These functions compute the aggregates in
-- the database so the routes can keep paginating while the totals stay exact.
--
-- Access: INVOKER (not SECURITY DEFINER) and execute revoked from
-- anon/authenticated — only service_role (our admin API routes) may call them.

-- ---------------------------------------------------------------------------
-- academy_subscriptions: exact platform-wide subscription metrics
-- ---------------------------------------------------------------------------
-- MRR is the sum of monthly_amount over subscriptions that are currently
-- billing (active + trialing) — a recurring run-rate, NOT the sum of rows
-- created inside some UI time window. monthly_amount is monthly by definition
-- for both billing cycles, so no normalisation factor is invented here.
CREATE OR REPLACE FUNCTION public.admin_subscription_metrics()
RETURNS TABLE (
  total_count      bigint,
  active_count     bigint,
  trialing_count   bigint,
  canceled_count   bigint,
  mrr_won          numeric,
  monthly_mrr_won  numeric,
  annual_mrr_won   numeric,
  new_30d          bigint,
  canceled_30d     bigint
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE status = 'active')::bigint,
    COUNT(*) FILTER (WHERE status = 'trialing')::bigint,
    COUNT(*) FILTER (WHERE status IN ('canceled', 'cancelled'))::bigint,
    COALESCE(SUM(monthly_amount) FILTER (WHERE status IN ('active', 'trialing')), 0),
    COALESCE(SUM(monthly_amount) FILTER (WHERE status IN ('active', 'trialing') AND COALESCE(billing_cycle, 'monthly') <> 'annual'), 0),
    COALESCE(SUM(monthly_amount) FILTER (WHERE status IN ('active', 'trialing') AND billing_cycle = 'annual'), 0),
    COUNT(*) FILTER (WHERE created_at > now() - interval '30 days')::bigint,
    COUNT(*) FILTER (WHERE status IN ('canceled', 'cancelled') AND updated_at > now() - interval '30 days')::bigint
  FROM public.academy_subscriptions;
$$;

CREATE OR REPLACE FUNCTION public.admin_academy_subscription_status_counts()
RETURNS TABLE (status text, cnt bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT s.status, COUNT(*)::bigint
  FROM public.academy_subscriptions s
  GROUP BY s.status
  ORDER BY 2 DESC;
$$;

-- ---------------------------------------------------------------------------
-- subscription_invoices: real collected revenue (what actually got paid)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_invoice_revenue_totals(
  p_start timestamptz,
  p_end   timestamptz
)
RETURNS TABLE (invoice_count bigint, amount_won numeric)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint, COALESCE(SUM(amount), 0)
  FROM public.subscription_invoices
  WHERE status = 'paid' AND paid_at >= p_start AND paid_at < p_end;
$$;

CREATE OR REPLACE FUNCTION public.admin_invoice_revenue_by_month(
  p_start timestamptz,
  p_end   timestamptz
)
RETURNS TABLE (year int, month_index int, amount_won numeric)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    EXTRACT(YEAR  FROM paid_at)::int,
    (EXTRACT(MONTH FROM paid_at)::int - 1),
    COALESCE(SUM(amount), 0)
  FROM public.subscription_invoices
  WHERE status = 'paid' AND paid_at >= p_start AND paid_at < p_end
  GROUP BY 1, 2
  ORDER BY 1, 2;
$$;

CREATE OR REPLACE FUNCTION public.admin_invoice_revenue_by_plan(
  p_start timestamptz,
  p_end   timestamptz
)
RETURNS TABLE (plan_tier text, amount_won numeric)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(plan_tier, 'unknown'), COALESCE(SUM(amount), 0)
  FROM public.subscription_invoices
  WHERE status = 'paid' AND paid_at >= p_start AND paid_at < p_end
  GROUP BY 1
  ORDER BY 2 DESC;
$$;

-- Real monthly/annual split, from the invoice's own billing_cycle — replaces
-- a hardcoded 70/30 guess that was rendered as a revenue breakdown.
CREATE OR REPLACE FUNCTION public.admin_invoice_revenue_by_cycle(
  p_start timestamptz,
  p_end   timestamptz
)
RETURNS TABLE (billing_cycle text, amount_won numeric)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(billing_cycle, 'monthly'), COALESCE(SUM(amount), 0)
  FROM public.subscription_invoices
  WHERE status = 'paid' AND paid_at >= p_start AND paid_at < p_end
  GROUP BY 1;
$$;

-- ---------------------------------------------------------------------------
-- study usage: measured sessions + measured feature events
-- ---------------------------------------------------------------------------
-- avg_duration_minutes is NULL when no session in the window has completed —
-- the route then omits the metric rather than substituting a number.
CREATE OR REPLACE FUNCTION public.admin_study_session_stats(
  p_start timestamptz,
  p_end   timestamptz
)
RETURNS TABLE (session_count bigint, completed_count bigint, avg_duration_minutes numeric)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::bigint,
    AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 60.0)
      FILTER (WHERE completed_at IS NOT NULL AND completed_at > created_at)
  FROM public.study_sessions
  WHERE created_at >= p_start AND created_at < p_end;
$$;

CREATE OR REPLACE FUNCTION public.admin_study_event_counts(
  p_start timestamptz,
  p_end   timestamptz
)
RETURNS TABLE (event text, cnt bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT event, COUNT(*)::bigint
  FROM public.study_analytics_events
  WHERE created_at >= p_start AND created_at < p_end
  GROUP BY event
  ORDER BY 2 DESC;
$$;

-- ---------------------------------------------------------------------------
-- subscription_usage: totals + limit warnings over ALL rows, not one page
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_subscription_usage_totals()
RETURNS TABLE (
  students   bigint,
  teachers   bigint,
  storage_gb numeric,
  classrooms bigint,
  academies  bigint
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(current_student_count), 0)::bigint,
    COALESCE(SUM(current_teacher_count), 0)::bigint,
    COALESCE(SUM(current_storage_gb), 0),
    COALESCE(SUM(current_classroom_count), 0)::bigint,
    COUNT(DISTINCT academy_id)::bigint
  FROM public.subscription_usage;
$$;

-- Scans every academy, not just the current page. A zero/NULL limit is treated
-- as "no limit" rather than division-by-zero → Infinity.
CREATE OR REPLACE FUNCTION public.admin_subscription_usage_approaching_limits(
  p_threshold numeric DEFAULT 0.8
)
RETURNS TABLE (
  academy_id    uuid,
  academy_name  text,
  student_usage numeric,
  teacher_usage numeric,
  storage_usage numeric
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH ratios AS (
    SELECT
      u.academy_id AS aid,
      a.name AS aname,
      CASE WHEN COALESCE(s.student_limit, 0) + COALESCE(s.additional_students, 0) > 0
           THEN COALESCE(u.current_student_count, 0)::numeric
                / (COALESCE(s.student_limit, 0) + COALESCE(s.additional_students, 0))
      END AS student_ratio,
      CASE WHEN COALESCE(s.teacher_limit, 0) + COALESCE(s.additional_teachers, 0) > 0
           THEN COALESCE(u.current_teacher_count, 0)::numeric
                / (COALESCE(s.teacher_limit, 0) + COALESCE(s.additional_teachers, 0))
      END AS teacher_ratio,
      CASE WHEN COALESCE(s.storage_limit_gb, 0) + COALESCE(s.additional_storage_gb, 0) > 0
           THEN COALESCE(u.current_storage_gb, 0)::numeric
                / (COALESCE(s.storage_limit_gb, 0) + COALESCE(s.additional_storage_gb, 0))
      END AS storage_ratio
    FROM public.subscription_usage u
    JOIN public.academy_subscriptions s ON s.academy_id = u.academy_id
    LEFT JOIN public.academies a ON a.id = u.academy_id
  )
  SELECT
    aid,
    COALESCE(aname, 'Unknown'),
    ROUND(COALESCE(student_ratio, 0) * 100, 1),
    ROUND(COALESCE(teacher_ratio, 0) * 100, 1),
    ROUND(COALESCE(storage_ratio, 0) * 100, 1)
  FROM ratios
  WHERE student_ratio > p_threshold
     OR teacher_ratio > p_threshold
     OR storage_ratio > p_threshold
  ORDER BY GREATEST(COALESCE(student_ratio, 0), COALESCE(teacher_ratio, 0), COALESCE(storage_ratio, 0)) DESC;
$$;

-- ---------------------------------------------------------------------------
-- webhook_events: breakdown counts that respect the same filters as `total`
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_webhook_event_stats(
  p_type       text        DEFAULT NULL,
  p_event_type text        DEFAULT NULL,
  p_status     text        DEFAULT NULL,
  p_processed  boolean     DEFAULT NULL,
  p_start      timestamptz DEFAULT NULL,
  p_end        timestamptz DEFAULT NULL
)
RETURNS TABLE (total bigint, processed bigint, unprocessed bigint, errors bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE e.processed)::bigint,
    COUNT(*) FILTER (WHERE NOT COALESCE(e.processed, false))::bigint,
    COUNT(*) FILTER (WHERE e.error_message IS NOT NULL)::bigint
  FROM public.webhook_events e
  WHERE (p_type       IS NULL OR e.type = p_type)
    AND (p_event_type IS NULL OR e.event_type = p_event_type)
    AND (p_status     IS NULL OR e.status = p_status)
    AND (p_processed  IS NULL OR COALESCE(e.processed, false) = p_processed)
    AND (p_start      IS NULL OR e.received_at >= p_start)
    AND (p_end        IS NULL OR e.received_at <= p_end);
$$;

-- Distinct event types for the filter dropdown. Previously a bare .select()
-- of every row, deduped in JS — capped at 1000 rows, so rare event types
-- silently disappeared from the dropdown.
CREATE OR REPLACE FUNCTION public.admin_webhook_event_types()
RETURNS TABLE (event_type text)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT e.event_type
  FROM public.webhook_events e
  WHERE e.event_type IS NOT NULL
  ORDER BY 1;
$$;

-- ---------------------------------------------------------------------------
-- comment_reports / error_logs / study_question_reports
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_comment_report_stats(
  p_report_type text        DEFAULT NULL,
  p_start       timestamptz DEFAULT NULL,
  p_end         timestamptz DEFAULT NULL
)
RETURNS TABLE (total bigint, spam bigint, abuse bigint, other bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE r.report_type = 'spam')::bigint,
    COUNT(*) FILTER (WHERE r.report_type = 'abuse')::bigint,
    COUNT(*) FILTER (WHERE COALESCE(r.report_type, 'other') NOT IN ('spam', 'abuse'))::bigint
  FROM public.comment_reports r
  WHERE (p_report_type IS NULL OR r.report_type = p_report_type)
    AND (p_start IS NULL OR r.created_at >= p_start)
    AND (p_end   IS NULL OR r.created_at <= p_end);
$$;

CREATE OR REPLACE FUNCTION public.admin_error_log_services()
RETURNS TABLE (service_name text)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT l.service_name
  FROM public.error_logs l
  WHERE l.service_name IS NOT NULL
  ORDER BY 1;
$$;

CREATE OR REPLACE FUNCTION public.admin_study_report_status_counts()
RETURNS TABLE (status text, cnt bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT r.status, COUNT(*)::bigint
  FROM public.study_question_reports r
  GROUP BY r.status;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.admin_subscription_metrics()',
    'public.admin_academy_subscription_status_counts()',
    'public.admin_invoice_revenue_totals(timestamptz, timestamptz)',
    'public.admin_invoice_revenue_by_month(timestamptz, timestamptz)',
    'public.admin_invoice_revenue_by_plan(timestamptz, timestamptz)',
    'public.admin_invoice_revenue_by_cycle(timestamptz, timestamptz)',
    'public.admin_study_session_stats(timestamptz, timestamptz)',
    'public.admin_study_event_counts(timestamptz, timestamptz)',
    'public.admin_subscription_usage_totals()',
    'public.admin_subscription_usage_approaching_limits(numeric)',
    'public.admin_webhook_event_stats(text, text, text, boolean, timestamptz, timestamptz)',
    'public.admin_webhook_event_types()',
    'public.admin_comment_report_stats(text, timestamptz, timestamptz)',
    'public.admin_error_log_services()',
    'public.admin_study_report_status_counts()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;
