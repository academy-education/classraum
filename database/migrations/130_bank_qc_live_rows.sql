-- /api/admin/bank-qc/live: one read instead of ~18 paged reads of the whole bank (2026-10-29).
--
-- The route paged study_item_bank with .range() (OFFSET/LIMIT) selecting the full `item` and `verify_meta`
-- JSON. An OFFSET page still computes the projection for every row it skips, so page 17 detoasted ~17,000
-- item blobs to return 1,000 (2.0 s measured with EXPLAIN ANALYZE), the pages scaled roughly quadratically,
-- and ~45 MB crossed the wire. Datadog: p50 23 s, p95 50 s, 12x 500 and 3x 504 in 2.5 days.
--
-- The route only ever needed four facts from those blobs: whether `item.choices` is an array, and
-- verify_meta's method / harvested_from / key names. This computes them in SQL and returns the live bank as
-- ONE json value (so PostgREST's 1000-row cap cannot truncate it), with `count` so the caller can refuse a
-- partial read. Measured 517 ms over 15,085 live rows.
--
-- Read-only (STABLE), SECURITY INVOKER, callable by the service role only.

create or replace function public.bank_qc_live_rows()
returns json
language sql
stable
security invoker
set search_path = public
as $$
  with b as (
    select id, family, domain, source, cohort, created_at,
           jsonb_typeof(item -> 'choices') = 'array' as mc,
           verify_meta
    from public.study_item_bank
    where archived is not true
  )
  select json_build_object(
    'count', (select count(*) from b),
    -- [id, family, domain, source, cohort, created_at, mc, method, harvested_from], ordered by id
    -- (the route takes each cohort's FIRST member's method, as the paged read did).
    'rows', (select coalesce(json_agg(json_build_array(
               id, family, domain, source, cohort, created_at, coalesce(mc, false),
               verify_meta ->> 'method', verify_meta ->> 'harvested_from') order by id), '[]'::json)
             from b),
    -- cohort -> sorted distinct verify_meta key names across its members
    'keys', (select coalesce(json_object_agg(c, ks), '{}'::json) from (
               select coalesce(cohort, '(none)') as c, array_agg(distinct k order by k) as ks
               from b, jsonb_object_keys(case when jsonb_typeof(verify_meta) = 'object' then verify_meta else '{}'::jsonb end) as k
               group by coalesce(cohort, '(none)')) x)
  );
$$;

revoke all on function public.bank_qc_live_rows() from public, anon, authenticated;
grant execute on function public.bank_qc_live_rows() to service_role;
