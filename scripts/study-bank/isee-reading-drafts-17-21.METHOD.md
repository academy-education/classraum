# ISEE Reading drafts 17-21: method (2026-10-31)

Goal: ISEE Reading from 5 to 10 forms. That takes 5 drafts of 6 passages x 6 items (180 items), staged
`verified=false` for the wave-2 agent review (`AGENT-REVIEW-WAVE2.prereg.md` rules, `COFOUNDER-BRIEF-v2.md`).

## What draft-14 did differently from drafts 10-12 and 15-16: less than its 36/36 suggests

Drafts 10-16 were all written to the same brief (`scratchpad/SSAT-READING-AGENT-BRIEF.md`, ISEE variant) with the
same six fixed stems per passage: main idea, detail, vocab, inference, purpose, attitude. Draft 14 used that
template too. The wave-2 grader files show what happened:

- **Grader c flagged draft 14 for `one_template` (all 36 items) and `reused_option_set` (its attitude pool).**
  Graders a and b reported only answer-letter position, which Amendment A1 excludes. A pattern needs 2 graders on
  3 or more shared items, so draft 14 survived because the graders did not agree, not because it had no tell.
  Drafts 10, 11, 12, 15 and 16 lost because a second grader named the same template.
- Running the new cross-item check (`scratchpad/isee-d17-21/merge.mjs`) on the old drafts confirms it. **It fails
  all three of drafts 13, 14 and 16.** Draft 13: the key is the only "how ..." main-idea option in 3/3 items, which
  is the pattern its graders named. Draft 16: the lone "explain ..." purpose option is never the key (0/6), also the
  pattern its graders named. Draft 14: the lone "explain"/"suggest" purpose options are never the key (0/4 and
  0/5), the detail key is the only option quoting the passage in 4/5 items, and attitude words repeat.
- What draft 14 did have was weaker per-stem tells. Its main-idea distractors share the key's frame and scope
  ("a girl who learns ..." twice). Its detail distractors reuse passage wording. No vocab or attitude cast was
  flagged by two graders. Its pre-screen also caught and fixed its only second-defensible item.

So draft 14 is the quality bar for prose, story logic and distractor rationales. **It is not a structure to copy.**
Copying its six-stem template is how drafts 15 and 16 failed.

## The method: vary the load-bearing element per item, and check it mechanically

1. **No fixed stem set.** Each passage gets its own mix of six items from eight ISEE kinds: main idea, detail,
   inference, vocabulary, purpose, attitude/tone, organization, figurative language. The mix is fixed per passage
   in `scratchpad/isee-d17-21/plans.json`. No two passages in a draft have the same mix. Each draft has 4 main-idea
   items, 3 attitude items and 4 vocab items (the three stems that carried every template flag), and at most 2 of
   one kind per passage. Every passage still has 6 items, so the 6x6 draw is unchanged.
2. **Named option casts with caps.** Every item records the `cast` it uses: how its distractors are built. A cast
   may be used at most twice per kind per draft (three times for detail and inference). Examples: main-idea
   distractors that are whole-passage summaries misreading the turn; vocab distractors that are near-synonyms in
   the right domain, against at most one dictionary-senses item per draft; attitude sets that include a
   same-valence neighbour, so polarity alone does not pick the key.
3. **No shared key prose, no reused options.** No 4-word run may appear in two keys in a draft, or across all five
   drafts. No option text may appear twice. Attitude words come from a per-draft pool, disjoint across drafts, used
   once each. No attitude set may share 2 or more words with any of the 244 live or staged ISEE/SSAT attitude sets.
4. **The key's surface form is checked against chance.** For every surface feature carried by exactly one option in
   an item (first word, first two words, hedge, absolute, contrast word, punctuation, quoting the passage, uniquely
   longest or shortest), the merge fails if the key carries it in 75% or more of 3+ such items (chance is 25%), or
   in 0 of 4+ (a free elimination). It runs per kind and batch-wide. No stem opening may appear more than 3 times
   in 36.
5. **Inherited unchanged:** the co-founder's rules (main-idea distractors on topic; inference and purpose keys that
   combine two parts of the passage; story logic checked line by line; every distractor killed by a quotable line);
   one negation per paragraph; no attitude word anywhere in a passage; a length ratio of 1.5 or less; key uniquely
   longest at most 8/36; verbatim `why` quotes; the quote and location-reference checks; topics checked against
   every live and staged reading passage (401, dumped fresh from the DB); subject lanes disjoint across the five
   concurrent authors.

**What this cannot see.** Semantic tells, such as "the key is always the reconciling claim", are invisible to
every structural check (CLAUDE.md: every structural proxy has been too coarse). The cast caps are the brief-side
defence against them, and the agent review is the gate. A clean merge is pre-flight. It is not a clearance.
