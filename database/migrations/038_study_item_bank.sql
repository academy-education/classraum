-- SAT item bank — pre-authored, pre-verified questions that adaptive
-- tests are ASSEMBLED from (as opposed to generated live per session).
--
-- Rationale (see design discussion): verifying an item ONCE up front —
-- math key computed in a sandbox, figure checked against the prompt,
-- single-defensible-answer confirmed — then reusing it forever is far
-- cheaper and safer for QA than re-verifying every live generation. It
-- also enables TRUE adaptive routing: module 2 pulls harder/easier
-- items from the bank based on module 1 performance.
--
-- This is CONTENT, not user data: rows contain answer keys, so the
-- table is service-role only (no student-facing RLS policy). All reads
-- happen server-side during assembly; the client never sees this table.
--
-- The `item` jsonb holds the exact post-sanitize Question shape used by
-- the generator + renderer (prompt, choices, correct_answer,
-- explanation, distractor_rationales, graphic, blanks, plus the
-- domain/subskill/topic_tag/word_count metadata added in migration-era
-- schema work). Nothing enters an assembled test unless verified = true.

CREATE TABLE IF NOT EXISTS public.study_item_bank (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Test taxonomy. family stays 'sat' for now but the column exists so
  -- the bank can hold other tests (ksat/toefl/…) later without a schema
  -- change.
  family           text NOT NULL DEFAULT 'sat',
  section          text NOT NULL,                       -- 'reading_writing' | 'math'
  domain           text NOT NULL,                       -- official CB domain, e.g. 'Information and Ideas', 'Algebra'
  subskill         text,                                -- e.g. 'Words in Context', 'Inferences'
  difficulty       text NOT NULL DEFAULT 'medium'
                     CHECK (difficulty IN ('easy','medium','hard')),
  topic_tag        text,                                -- free-form dedup / variety tag
  item_type        text NOT NULL DEFAULT 'multiple_choice',
  -- Shared-passage grouping (SAT R&W items are standalone, but reserved
  -- for cross-text pairs / other tests that share one passage).
  passage_group_id text,
  -- The full Question payload (prompt/choices/correct_answer/
  -- explanation/distractor_rationales/graphic/blanks/metadata).
  item             jsonb NOT NULL,
  -- Dedup key: md5 of the item's normalized CONTENT — passage + prompt
  -- + choices (lowercased, whitespace-collapsed, punctuation-stripped),
  -- computed by the inserter. NOT prompt-only: every Standard English
  -- Conventions item shares the identical stem ("Which choice completes
  -- the text so that it conforms to the conventions of Standard
  -- English?"), so a prompt-only hash would wrongly collide distinct
  -- items (found during the seed run). The UNIQUE index below makes it
  -- physically impossible to bank the same item twice — the #1 quality
  -- risk when generating in batches.
  content_hash     text,
  word_count       integer,
  -- Verification gate. verified flips true only after the harness
  -- passes the item; verify_meta records HOW it was checked:
  --   { computed_answer, figure_ok, single_defensible, method, at }
  verified         boolean NOT NULL DEFAULT false,
  verify_meta      jsonb,
  source           text NOT NULL DEFAULT 'hand'         -- 'hand' | 'generated'
                     CHECK (source IN ('hand','generated')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Assembly query path: "give me N verified items for this
-- family/section/domain at this difficulty." Partial index keeps it to
-- assembly-eligible rows only.
CREATE INDEX IF NOT EXISTS study_item_bank_assembly
  ON public.study_item_bank (family, section, domain, difficulty)
  WHERE verified;

-- Dedup / variety lookups by topic during generation + assembly.
CREATE INDEX IF NOT EXISTS study_item_bank_topic
  ON public.study_item_bank (topic_tag);

-- Hard dedup: no two rows may share a normalized-prompt hash. Partial
-- so rows without a hash (should not happen once the inserter sets it)
-- don't collide on NULL.
CREATE UNIQUE INDEX IF NOT EXISTS study_item_bank_content_hash_once
  ON public.study_item_bank (content_hash)
  WHERE content_hash IS NOT NULL;

-- Content table: lock it down to service-role. Enable RLS with NO
-- policies so anon/authenticated cannot read (answer keys live here);
-- the service role bypasses RLS for server-side assembly.
ALTER TABLE public.study_item_bank ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.study_item_bank IS
  'Pre-verified SAT question bank. Adaptive tests are assembled from here. Service-role only (rows contain answer keys).';
