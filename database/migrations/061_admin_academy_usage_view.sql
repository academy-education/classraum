-- 061: compute admin usage monitoring from live data, not a dead snapshot
--
-- The "사용량 모니터링" admin page read public.subscription_usage, a snapshot
-- table that nothing populates — it held ZERO rows on 2026-07-27 while the
-- platform had 173 active students, 8 teachers and 55 classrooms across 10
-- academies. So the page, and both aggregate RPCs from migration 052,
-- reported 0 for everything: not an empty state, a wrong answer on the one
-- screen you'd use to spot an academy about to breach its plan limits.
--
-- Same root cause as the /api/subscription/downgrade outage fixed earlier
-- today (getAcademyUsage returned null because `.single()` on an empty
-- table errors). Headcounts have a live source; a snapshot nobody refreshes
-- is strictly worse than counting.
--
-- This view counts per academy and keeps the subscription_usage column
-- NAMES so the API response shape and the UI are unchanged. Storage has no
-- live source (no metering exists), so it still comes from the snapshot
-- when one exists, else 0 — honestly zero rather than invented.

CREATE OR REPLACE VIEW public.admin_academy_usage
WITH (security_invoker = true) AS
SELECT
  a.id                                    AS id,
  a.id                                    AS academy_id,
  a.name                                  AS academy_name,
  a.subscription_tier                     AS subscription_tier,
  COALESCE(st.cnt, 0)::integer            AS current_student_count,
  COALESCE(te.cnt, 0)::integer            AS current_teacher_count,
  COALESCE(cl.cnt, 0)::integer            AS current_classroom_count,
  COALESCE(su.current_storage_gb, 0)      AS current_storage_gb,
  -- Peaks only ever existed in the snapshot. Fall back to the live count so
  -- the column is never a smaller number than "current", which would read
  -- as a data error in the UI.
  GREATEST(COALESCE(su.peak_student_count, 0), COALESCE(st.cnt, 0))::integer AS peak_student_count,
  GREATEST(COALESCE(su.peak_teacher_count, 0), COALESCE(te.cnt, 0))::integer AS peak_teacher_count,
  -- Counted live, so "as of" is now, not whenever a snapshot last ran.
  now()                                   AS calculated_at
FROM public.academies a
LEFT JOIN (
  SELECT academy_id, COUNT(*) AS cnt FROM public.students
  WHERE active IS TRUE GROUP BY academy_id
) st ON st.academy_id = a.id
LEFT JOIN (
  SELECT academy_id, COUNT(*) AS cnt FROM public.teachers
  WHERE active IS TRUE GROUP BY academy_id
) te ON te.academy_id = a.id
LEFT JOIN (
  SELECT academy_id, COUNT(*) AS cnt FROM public.classrooms
  WHERE deleted_at IS NULL GROUP BY academy_id
) cl ON cl.academy_id = a.id
LEFT JOIN public.subscription_usage su ON su.academy_id = a.id;

COMMENT ON VIEW public.admin_academy_usage IS
  'Live per-academy resource usage for the admin usage-monitoring page. Replaces reads of subscription_usage, which is never populated. Column names match subscription_usage so callers are unchanged.';

-- Admin-only. security_invoker means the caller''s RLS applies to the
-- underlying tables, and the API route uses the service-role client; there
-- is no reason for anon/authenticated to read platform-wide headcounts.
REVOKE ALL ON public.admin_academy_usage FROM anon, authenticated;
GRANT SELECT ON public.admin_academy_usage TO service_role;

-- Point migration 052's aggregates at the view. Signatures and return
-- shapes are unchanged, so /api/admin/subscription-usage keeps calling them
-- exactly as before — they simply stop summing an empty table.
CREATE OR REPLACE FUNCTION public.admin_subscription_usage_totals()
 RETURNS TABLE(students bigint, teachers bigint, storage_gb numeric, classrooms bigint, academies bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE(SUM(current_student_count), 0)::bigint,
    COALESCE(SUM(current_teacher_count), 0)::bigint,
    COALESCE(SUM(current_storage_gb), 0),
    COALESCE(SUM(current_classroom_count), 0)::bigint,
    COUNT(DISTINCT academy_id)::bigint
  FROM public.admin_academy_usage;
$function$;

CREATE OR REPLACE FUNCTION public.admin_subscription_usage_approaching_limits(p_threshold numeric DEFAULT 0.8)
 RETURNS TABLE(academy_id uuid, academy_name text, student_usage numeric, teacher_usage numeric, storage_usage numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH ratios AS (
    SELECT
      u.academy_id AS aid,
      u.academy_name AS aname,
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
    FROM public.admin_academy_usage u
    JOIN public.academy_subscriptions s ON s.academy_id = u.academy_id
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
$function$;
