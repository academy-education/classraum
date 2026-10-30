-- iTEP SLATE topic rows (2026-10-31, ITEP-SLATE-BLUEPRINT.md §5.3).
--
-- Purely additive: six INSERTs, no DDL, nothing existing is touched. The
-- shape matches the live test-isee rows (root at level 1 under test-prep,
-- category 'test_prep'; sections at level 2).
--
-- The rows are HIDDEN, not live. Visibility is decided in code, not here:
--   - test-itep is in LOCKED_TOPIC_SLUGS (topic page) and
--     COMING_SOON_HIDDEN_SLUGS (landing strip + search);
--   - every itep-* slug is in HIDDEN_SUBTOPIC_SLUGS and the builder copy;
--   - 'itep' is not in SHIPPED_TEST_FAMILIES, so the assemble API refuses it.
--
-- The ids are fixed so SECTION_TOPIC (src/lib/study/section-topics.ts) can
-- name them; scripts/study-bank/verify-section-topics.mjs checks they agree.
-- Writing and Speaking rows exist for the catalog but have no blueprint
-- block yet (phase 3).

begin;

insert into public.study_topics (id, parent_id, slug, name_en, name_ko, level, category, sort_order)
select 'd82b6647-6bc8-4615-bed5-8f39726ad516', p.id, 'test-itep', 'iTEP SLATE', 'iTEP SLATE', 1, 'test_prep', 97
from public.study_topics p where p.slug = 'test-prep'
on conflict (slug) do nothing;

insert into public.study_topics (id, parent_id, slug, name_en, name_ko, level, category, sort_order) values
  ('28b02a14-4711-4e03-ac24-16764c9e280c', 'd82b6647-6bc8-4615-bed5-8f39726ad516', 'itep-grammar',   'Grammar',   '문법',   2, 'test_prep', 10),
  ('1f5a9b4b-5a97-4ed4-a0ee-00bad3efbef1', 'd82b6647-6bc8-4615-bed5-8f39726ad516', 'itep-listening', 'Listening', '듣기',   2, 'test_prep', 20),
  ('f6a1e755-9acd-4c03-bd04-7eefc37c322a', 'd82b6647-6bc8-4615-bed5-8f39726ad516', 'itep-reading',   'Reading',   '독해',   2, 'test_prep', 30),
  ('1d73faaf-ed9f-441f-86a4-4c5dc402351f', 'd82b6647-6bc8-4615-bed5-8f39726ad516', 'itep-writing',   'Writing',   '쓰기',   2, 'test_prep', 40),
  ('4468dd14-2547-4dbd-ad99-72b2e797203e', 'd82b6647-6bc8-4615-bed5-8f39726ad516', 'itep-speaking',  'Speaking',  '말하기', 2, 'test_prep', 50)
on conflict (slug) do nothing;

commit;
