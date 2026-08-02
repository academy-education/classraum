-- Repair the TOEFL `domain` values, which disagree with the task the item is
-- actually drawn as. Every overwritten value is preserved first.
--
-- APPLIED 2026-08-02, after 068. Verified after: 2,065 rows repaired and
-- 2,065 carry legacy_domain (1:1), 0 Reading items still labelled Listening,
-- 0 SAT rows touched.
--
--
-- WHY
--
-- `domain` means two different things depending on the test, and only one of
-- them is trustworthy:
--
--   SAT   — names the College Board blueprint domain (Algebra, Craft and
--           Structure, ...). Correct, and the draw's quota logic depends on
--           it. NOT TOUCHED BY THIS MIGRATION.
--   TOEFL — a stale, partly-wrong duplicate of the ETS task type, which now
--           lives in `task`.
--
-- How wrong, measured 2026-08-01:
--
--   task=conversation      -> domain 'Conversation'    124 rows
--                             domain 'multiple_choice'  67 rows
--                             domain 'Announcement'      2 rows  <- wrong task
--   task=academic_talk     -> domain 'Academic Talk'   222 rows
--                             domain 'multiple_choice'  52 rows
--   task=announcement      -> domain 'Announcement'     99 rows
--                             domain 'multiple_choice'  22 rows
--   task=academic_passage  -> domain 'multiple_choice' 386 rows
--                             domain 'Academic'         99 rows
--                             domain 'Listening'         8 rows  <- in READING
--   task=choose_response   -> domain 'Choose a Response' 70 rows
--                             domain 'multiple_choice'    1 row
--
-- Hundreds of disagreements, including 8 Reading items labelled "Listening"
-- and 2 conversations labelled "Announcement". This is why an audit that
-- selected on `domain` silently skipped an item that was being served in
-- real tests.
--
--
-- NO DATA IS LOST
--
-- Every row's current `domain` is copied into verify_meta->>'legacy_domain'
-- BEFORE being changed. verify_meta is a jsonb object on all 4,838 rows and
-- has no `legacy_domain` key today, so nothing is overwritten there either.
-- The original values remain fully recoverable:
--
--   select id, domain, verify_meta->>'legacy_domain' from study_item_bank
--    where verify_meta ? 'legacy_domain';
--
--
-- SAFE TO RUN — EVERY READER OF `domain` IS SAT-ONLY
--
-- Enumerated before writing this, not assumed. There are three:
--
-- 1. src/lib/study/assemble.ts:1281+ — the SAT blueprint draw, bucketing by
--    domain to hit College Board quotas. Reached only for family='sat'.
--    Untouched: this migration changes no SAT row.
--
-- 2. src/app/api/study/practice/generate/route.ts:227 —
--       if (config.domain) bankFilter.eq('domain', config.domain)
--    A LIVE DRAW FILTER, and the one real hazard here: repairing a value
--    that some config still filters on would empty the pool and return
--    no_bank_coverage. Checked both ways and it cannot happen:
--      * code — config.domain originates in src/lib/study-path.ts, where
--        all 14 `domain:` values are College Board domains (Algebra,
--        Craft and Structure, ...). TOEFL_PATH (line 328) sets domain on
--        ZERO of its nodes.
--      * data — only 5 study_sessions rows carry config.domain at all,
--        valued 'Information and Ideas' (4) and 'Craft and Structure' (1).
--        No TOEFL value has ever been written.
--
-- 3. src/app/api/study-item-bank/route.ts:59 — the admin bank browser's
--    filter. Its dropdown is built from MATH_DOMAINS / RW_DOMAINS
--    (src/app/bank/page.tsx:118), so a TOEFL value is never selectable —
--    TOEFL domain is only ever DISPLAYED there (rows at :261 and :374).
--    Repairing improves that display; nulling would have blanked it,
--    which is one reason this repairs rather than nulls.
--
-- QC scripts that read `domain` are being moved to `task`. Until they are,
-- this migration makes their existing behaviour correct rather than subtly
-- wrong — so it is safe to run before or after that move.

begin;

-- ── 1. Preserve, then repair ──────────────────────────────────────────
-- Canonical display label per task, so TOEFL `domain` agrees with `task`
-- instead of contradicting it. Repairing rather than nulling keeps the
-- column readable for anyone browsing the bank, and keeps the existing
-- admin bank browser's domain filter working.

update study_item_bank
   set verify_meta = verify_meta || jsonb_build_object('legacy_domain', domain),
       domain = case task
         when 'choose_response'    then 'Choose a Response'
         when 'conversation'       then 'Conversation'
         when 'announcement'       then 'Announcement'
         when 'academic_talk'      then 'Academic Talk'
         when 'daily_life'         then 'Daily Life'
         when 'academic_passage'   then 'Academic Passage'
         when 'fill_in_blanks'     then 'Complete the Words'
         when 'speaking_repeat'    then 'Listen and Repeat'
         when 'speaking_interview' then 'Interview'
         when 'arrange_words'      then 'Build a Sentence'
         when 'writing_email'      then 'Email'
         when 'writing_discussion' then 'Academic Discussion'
         -- Legacy rows whose task is literally 'multiple_choice' carry no
         -- real task identity. Almost all are archived. Left as-is rather
         -- than invented.
         else domain
       end
 where family = 'toefl'
   and task <> 'multiple_choice';

-- ── 2. Assert the repair is total ─────────────────────────────────────
-- Every live TOEFL row must now have a domain that maps back to its task.
-- If any does not, something about the data changed since this was written
-- and the migration must stop rather than leave a half-repaired column.
do $$
declare bad int;
begin
  select count(*) into bad
    from study_item_bank
   where family = 'toefl'
     and archived = false
     and task <> 'multiple_choice'
     and domain is distinct from case task
       when 'choose_response'    then 'Choose a Response'
       when 'conversation'       then 'Conversation'
       when 'announcement'       then 'Announcement'
       when 'academic_talk'      then 'Academic Talk'
       when 'daily_life'         then 'Daily Life'
       when 'academic_passage'   then 'Academic Passage'
       when 'fill_in_blanks'     then 'Complete the Words'
       when 'speaking_repeat'    then 'Listen and Repeat'
       when 'speaking_interview' then 'Interview'
       when 'arrange_words'      then 'Build a Sentence'
       when 'writing_email'      then 'Email'
       when 'writing_discussion' then 'Academic Discussion'
     end;
  if bad > 0 then
    raise exception
      'TOEFL domain repair incomplete: % live row(s) still disagree with task. A new task value may exist that this migration does not map.', bad;
  end if;
end $$;

-- ── 3. Assert every changed row kept its original ─────────────────────
do $$
declare touched int; backed_up int;
begin
  select count(*) into touched
    from study_item_bank where family = 'toefl' and task <> 'multiple_choice';
  select count(*) into backed_up
    from study_item_bank
   where family = 'toefl' and task <> 'multiple_choice'
     and verify_meta ? 'legacy_domain';
  if touched <> backed_up then
    raise exception
      'backup incomplete: % row(s) repaired but only % have legacy_domain preserved.', touched, backed_up;
  end if;
end $$;

comment on column study_item_bank.domain is
  'SAT: the College Board blueprint domain — real data, the draw''s quota logic depends on it. TOEFL: a display label kept in step with `task` (repaired in migration 069; the pre-repair value is in verify_meta->>legacy_domain). Never filter on this to identify a TOEFL task — use `task`.';

commit;


-- ── Verify after applying ─────────────────────────────────────────────
-- Expect disagreements = 0, and backed_up = the number of TOEFL non-legacy rows.
--
--   select
--     count(*) filter (where family='toefl' and task <> 'multiple_choice'
--                        and verify_meta ? 'legacy_domain') as backed_up,
--     count(*) filter (where family='toefl' and archived=false
--                        and task='academic_passage' and domain <> 'Academic Passage') as disagreements
--   from study_item_bank;
--
-- To inspect what changed:
--   select task, verify_meta->>'legacy_domain' as was, domain as now, count(*)
--     from study_item_bank where verify_meta ? 'legacy_domain'
--    group by 1,2,3 order by 4 desc;
