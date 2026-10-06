# ACT Reading pilot: whole-passage variants (four versions). Pre-registered 2026-10-06 (before any item exists)

Owner, 2026-10-06: "keep going with ACT tests". ACT capacity (`form-capacity.mjs`, 2026-10-06):
English 3 (5 once the co-founder sitting releases `act-english-v7`), Math 14, **Reading 4**,
Science 3. Reading is the next binding verbal section. Live verified ACT Reading is 18 passages /
162 rows: literary_narrative 5, social_science 4, humanities 4, natural_science 5. The assembler
draws one passage per genre in published order and reports SHORT rather than back-filling, so
**social_science and humanities bind at 4**.

## Why this method

ACT Reading agent authoring failed the blind attack twice in September (76% / 79%) and a second
rewrite inverted the tell (REGISTER A21, `ACT-ATTACK-RESULT.md`). On ACT the model options-only
attack also SATURATES on the shipped bank (CLAUDE.md "the attack itself is invalid on some
families": live control 88.9-96.3% by model, 10.0% by the co-founder on `act-reading-v1`), so a
model number cannot clear a batch. The SSAT whole-passage-variant method (A77/A78, pilot-4 brief)
makes the key independent of the option text BY CONSTRUCTION: every choice is the key in exactly
one complete version, and which version ships is drawn by hash after freeze. That removes the
authoring channel the September tells came through. SSAT pilots showed the method's remaining
failure is DIFFICULTY (A78, 9/12 easy), so the SSAT pilot-4 difficulty brief is applied from the
start.

## Method (adapted to ACT)

- **Unit:** one `passage_id`, **four** complete versions (four choices), **nine** questions x four
  choices. Version k makes choice k the key of EVERY question.
- **Shape (enhanced ACT):** unpaired versions 680-880 words (target 720-840), ratio <= 1.2, 5-10
  paragraphs; paired versions "Passage A" + "Passage B" headers, each part 300-470 words, 2-6
  paragraphs. Identical paragraphing across versions. Stems cite paragraphs or quote phrases,
  never line numbers.
- **Mix per unit:** Key Ideas and Details 4 (inference 2-4, detail <= 1, main-idea <= 1), Craft and
  Structure 3 (vocabulary 1, attitude 1, purpose 1), Integration of Knowledge and Ideas 2
  (argument / comparison; a paired unit has >= 1 comparison). Six units at 4/3/2 add 24/18/12,
  against the 6-form need of +19/+11/+6 (`next-form.mjs` per-form 16/10/7).
- **Brief:** `ACT-WV-AUTHOR-BRIEF.md` (committed with this file) = the SSAT pilot-4 brief
  (`SSAT-WV4-AUTHOR-BRIEF.md`) adapted: inference/purpose/structure weighted; wrong options are
  tempting partial readings (part-true, a person's belief not the author's conclusion,
  overgeneralised detail, one step too far, the other passage's claim); no absent-entity options;
  no flat dismissals (<= 1 explicit rejection and <= 2 negations per paragraph); vary what kind of
  answer is correct; attitude never named.
- **Mechanical gate:** `act-wv.mjs verify` (committed with this file): shape, mix, domains,
  verbatim why/kill quotes, the SSAT pilot-4 lexical rules (absent option, kill quote on target,
  named attitude; imported from `ssat-wv.mjs` `distinctive`), vocabulary target exactly once per
  version, no line numbers, paragraph references valid in every version, stem words unique to
  another question's choice. It is pre-flight, not a bar; it has the SSAT pilot-4 false-negative
  class (an incidental word match). Break-tested on the first real unit before any bar is run
  (fake quote, absent option, a 3-version unit, a line-number stem, a named attitude each must
  refuse).
- **Freeze -> hash -> draw:** the `*.wv.json` files are committed before the draw; `frozenSha` =
  sha256 of their bytes in sorted path order; `k(pid) = int(sha256("act-wv-2026-10-06|" + frozenSha
  + "|" + pid)[0:8], 16) mod 4`. `draw` refuses if a `draw.json` already exists. Never re-rolled.
  The stored choice order is dealt flat at draw time (never "choice index = version").

## Pilot

- **Two units, two fresh Claude author agents** (one each), running at the same time (max 2):
  `AWV1-P01` **social_science**, unpaired; `AWV1-P02` **humanities**, PAIRED. Both are the genres
  that bind, so a passing pilot unit counts toward the batch.
- Each author gets ONLY the brief text, its genre/paired/id, and the format; writes to the
  scratchpad; is told not to open `scripts/study-bank/` or run anything there. Authors never see
  `act-wv.mjs`, any checker, any prior item, or this file. The orchestrator runs `verify` and returns
  its PROBLEM lines verbatim (mechanical only; the deciding bars are never shown). Up to three
  verify round-trips. Each author states at the end whether it opened any file other than its own.
  Files land at `act-wv1-p01.wv.json`, `act-wv1-p02.wv.json`.

## Instruments (prompts frozen now)

Claude subagents only (never GPT), at most 2 at a time, each a fresh agent that is told to open
ONLY its own input file.

- **C+F, three with-source graders**, each on `withsource.json` (drawn versions, keys dealt flat):
  > Below are ACT Reading passages, each followed by four-choice questions. Answer each question as a
  > careful expert test-taker. For each give: "pick" (A-D); "second_defensible" (the letter of any
  > other choice a careful reader could also defend from the passage, or "none"); "difficulty"
  > ("easy", "medium" or "hard" for a strong ACT student reading this passage under time); and a
  > one-sentence "note" giving your reason. Return JSON {"labels": {"<qid>": {...}}}.
- **E, two naturalness judges**, each on `naturalness.json` (the 2 drawn candidates + 6 live
  verified ACT Reading passages chosen by `sha256("act-wv-2026-10-06|nat|" + group)` order,
  shuffled, unlabelled). Neutral prompt, pilot 3's adapted only in audience and count:
  > Below are 8 reading passages. For each, rate how natural and coherent the prose reads as a
  > published reading passage for high school students, on a scale of 1 (very unnatural or
  > incoherent) to 5 (reads exactly like a well-written published passage). Judge each passage on
  > its own. Give an integer rating and a one- or two-sentence reason for each. Return JSON:
  > {"labels": {"N1": {"rating": <1-5>, "reason": "..."}, ...}}
  No mention of answer choices, test construction, candidates, or ruling-out.
- **D, one version reviewer** on `cv.json` (every question x every version, 72): `valid: true`
  only if this version makes the claimed answer the unique best answer and refutes or fails to
  support every other choice (passage-supported standard); `reason`; `absent`: choices this version
  never discusses (recorded). Plus a top-level `cross_item` note (recorded, not deciding).
- **A, options-only isolated:** non-vocabulary items of both drawn units (16) + the non-vocabulary
  items of **4 complete passages of `act-reading-v1`** (the cohort a human sat at 10.0%), chosen by
  `sha256("act-wv-2026-10-06|ctl|" + group)` order. Rendered into **sibling-free files** (at most one
  item per passage per file; options only, no stem, no passage; keys dealt flat globally across both
  arms; arm recorded only in the key). **One fresh solver per file**, prompt:
  > The passages and questions for these reading-test items have been removed; only the four answer
  > choices remain. For each item, pick the letter (A-D) you think is most likely correct. Each item
  > has exactly one correct answer. Give a pick for every item. Return JSON
  > {"labels": {"<qid>": {"pick": "<letter>"}}, "heuristics": "<what you used and how many picks it decided>"}.
- **B, options-only grouped:** the same 6 passages' non-vocabulary items as passage blocks in one
  file (`grp.json`, blocks unlabelled and shuffled), same prompt with "Items in the same block share
  one passage." Three samples (three fresh agents).

## Bars (the pilot passes only if C, D, E, F pass and A, B do not fail)

| bar | rule | range check |
|---|---|---|
| **C** exclusivity | an item passes when all 3 graders pick the key and none names a second defensible choice; **>= 15/18** | 0-18 reachable both ways |
| **F** difficulty | an item is easy when the mean of the 3 graders' ranks (easy 1, medium 2, hard 3) <= 1.5; **<= 9/18 easy** | 0-18 reachable |
| **D** version validity | **>= 65/72** (90%) question-versions valid | 0-72 |
| **E** relative naturalness | pooled candidate median (2 judges x 2) **>=** pooled live median (2 x 6); a judge that omits a rating/reason or rates all 8 alike is discarded and re-run fresh once; live median 1 = INVALID (re-run once) | live medians 2-5 leave both outcomes reachable; at live 5 the bar is still reachable (candidate 5) |
| **A** iso screen | candidate - control <= **+10** points | **If the control is > 90%, a +10 excess is unreachable: the bar CANNOT FIRE, is reported as such (never as a pass), and does not block** — the with-source half decides (CLAUDE.md, ACT saturates). Below 90% it can fire |
| **B** grouped screen | same, pooled over 3 samples | same ceiling rule |

The candidate's options-only number is also noisy by construction (the key of each unit is one
draw of four; 2 units): `act-wv.mjs null` reports the exact distribution over all 4^2 draws with
picks held fixed. Reported, not a bar.

**Order of running (most informative first), stop at the first failure:** C+F, E, D, A, B. No
repair round. If a stage's instrument is invalid (judge discarded twice; a solver refuses), it is
recorded and the pilot does not pass.

## Batch, if and only if the pilot passes

Target **+2 ACT Reading forms (4 -> 6)**: genres need social_science +2, humanities +2,
literary_narrative +1, natural_science +1 = 6 units; the two pilot units supply social_science 1
and humanities 1. So **4 more units**: literary_narrative (unpaired), natural_science (unpaired),
social_science (unpaired), humanities (unpaired) — two fresh authors at a time, same brief, same
protocol, ids `AWV2-P01..P04`, files `act-wv2-p0N.wv.json`. Each round: verify, freeze (commit),
draw, then the same instruments. The batch gate (all units incl. the pilot two):

- **Per unit (passage rule: the inserter refuses a partial group):** a unit is kept only if **all 9**
  of its items pass C and its D is >= 90% (>= 33/36). No repair; a failing unit is dropped.
- **Batch:** F <= 50% easy over kept items; E pooled median >= live (same 6 live passages, same
  prompt, the new drawn units as candidates); A and B screens not failing (same rule, same 4 control
  passages).

Kept units go through `act-bank-helper.mjs check reading`, a ledger entry (cohort
**`act-reading-wv1`**), and are inserted **STAGED** (`BANK_VERIFIED=false`). ACT verbal goes live
only after a human sitting. Then `verify-act-draw.ts` and a projection of forms with the staged
rows counted.

## Human sitting (pre-registered here; drawn only if the batch inserts)

A separate `act-reading-wv1.SITTING.PREREG.md` is committed before the run is drawn, on the
`act-en7` pattern: reviewer `support@classraum.com` (`6ca6edaf-4044-4eed-84e0-137ebd79a81d`), the
`/admin/bank-qc` options-only instrument, keys dealt flat per domain, B7 bars as integer cutoffs per
domain (~40% clean / ~60% archive / between = second reader), release = `verified=true` on the
cohort. **Nothing is sent to anyone.** If the reviewer has an open run, the sitting is prepared but
not drawn.
