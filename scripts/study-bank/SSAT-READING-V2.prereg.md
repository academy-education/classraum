# SSAT Reading drafts 23-28 under brief v2 — pre-registration (2026-10-31, before any plan is written or any passage exists)

## 1. Why

SSAT Reading is the thinnest SSAT section: `npx tsx scripts/study-bank/admission-form-depth.ts --forms 14` gives
**7 clean forms** (330 live items, 63 passage groups) against the 10-form floor (memory: never-couple-left). The
pending verbal-audit release adds about 10 passages; still short. Target: **+5 forms, about 30 passages / 180 items,
authored with margin as 36 passages / 216 items** (6 drafts x 6 passages x 6 items, cohorts
`ssat-reading-draft-23` … `-28`).

## 2. Method: brief v2 (a cut), and what is carried from d19-22

- **Carried from d19-22** (138 of 144 at the agent-review gate, the best agent-era reading result): one passage per
  genre per draft, kind mixes that differ per passage, varied stems, one attitude word per draft, the d19 merge
  refusals (now `scripts/study-bank/ssat-reading-v2/check.mjs`), the quote and location checks, d19.py as the format
  and passage bar, the d19 build/insert route.
- **Brief: `briefs/ssat-reading-v2.md`, a new version cut from v1 (`SSAT-READING-AGENT-BRIEF.md`, md5 350d3265).**
  Reason, under BRIEF-VERSIONING.md rule 3: **Blocking.** The verbal key-visible audit named "vocabulary distractors
  are unrelated dictionary senses" by both graders in consecutive v1 batches d10 and d11, and "attitude key is the one
  moderate word" by both graders in d11 and d14; v1 rule 5 requires the first shape outright. Rule 4: the cut folds in
  every pending lesson (`briefs/ssat-reading.pending.md`, items 1-10). **Every named property is randomized per item at
  its base rate, never required or forbidden** (assignment §3). The cost is stated: a new method starts at L0, so this
  is a bridge batch; nothing from it is released without the Daniel audit sample (A1 release route).
- **Author type: deviation.** d19-22 were written in-session by one Claude; here **six Claude author agents, one per
  draft**, each given the frozen v2 brief by path and its own plan file, never the pending file. Reason: volume (216
  items) and this coordinator is itself an agent. Risk stated now: v1 agent authors (d5-d18) cleared 6-36 per draft;
  the d19-22 gain may have been the merge refusals, the in-session author, or both, and this run cannot separate them.
- Claude only. No GPT model anywhere.

## 3. Construction (fixed now)

`node scripts/study-bank/ssat-reading-v2/assign.mjs --drafts 23-28 --write`, seed `ssat-reading-v2-2026-10-31`, writes
`scratchpad/ssat-v2-work/plans/dN.json`; their sha256s are recorded in the addendum before any author starts.
Per draft: kind totals main-idea 4, detail 9, inference 8, vocabulary 6, attitude 3, purpose 6 (the d19-22 average),
dealt into six passage mixes (>= 4 kinds, <= 3 of a kind, <= 1 main idea and <= 1 attitude per passage, distinct
mixes, <= 1 all-six). Subject areas dealt without replacement per genre. Per item:

| property | draw |
|---|---|
| key length rank | longest 0.2 / shortest 0.2 / middle 0.6 |
| main-idea breadth | key-broadest 0.25 / distractor-broader 0.40 / all-level 0.35 |
| main-idea two-part | n ~ Bin(5, 0.3) two-part options; key among them at n/5 |
| attitude intensity | n ~ Bin(5, 0.4) strong words; key strong at n/5 (check.mjs STRONG list) |
| vocabulary distractor type | each of 4: `context` 0.35 / `sense` 0.65 |
| purpose abstract | n ~ Bin(5, 0.5) abstract options; key among them at n/5 |

`check.mjs --draft N` enforces every drawn property it can read (length rank, intensities by word list, the author's
`broadest` / `two_part` / `dtype` / `abstract` tags against the plan) plus the d19 rules; `--selftest` break-tests six
of them. **The tags are the author's own declaration and are not evidence that an item is clean** (CLAUDE.md: an
author declares the constraints it already satisfied). The graders are the check.

## 4. Pre-flight and freeze (before any grader)

Per draft: check.mjs 0 problems, `check-explanation-quotes.mjs` 0 unmatched, `locrefs.mjs` 0 mismatch, and the d19
`screencheck.ts` (isDraft / hash / validateItemEdit) 36/36 on the built batch. Cross-draft: no two of the 36 passages
share a subject (coordinator reads the 36 titles and subjects), and no attitude set repeats a live or staged set.
Authors may iterate only until these pass. Then `build-rows` writes `scripts/study-bank/ssat-reading-draft-N.batch.json`
and its sha256 is recorded: **frozen**. No item is edited after freeze; a repaired item is a new batch.

## 5. Staging and gate

1. **Stage all 216 `verified=false`** (insert.mjs, dry run first; read back by cohort). Staged rows are ignored by the
   assembler. Staging first is required because `agent-review-build.mjs` reads staged rows (the d19-22 route).
2. **Stage 1 — agent review**, exactly AGENT-REVIEW-SSAT-MAP.prereg.md §2-§3 with Amendment A1:
   `agent-review-build.mjs --cohorts ssat-reading-draft-23,…,-28 --manifest MANIFEST-ssat-reading-d23-28.json --write`;
   COFOUNDER-BRIEF-v2 unchanged (sha256 in the manifest); graders a, b, c (c adversarial), fresh Claude agents that
   read only the brief and their packet. Item drops on any non-`unique` verdict; a drop takes its passage; a pattern
   counts when two graders share >= 3 items (letter patterns excluded, A1.1); union >= 50% holds the cohort, below
   drops those items with their passages (A1.2). Scored only by `agent-review-score.mjs`, out
   `scripts/study-bank/agent-review/results-ssat-d23-28/`.
3. **Stage 2 — key-visible audit**, exactly VERBAL-AUDIT-2026-10-31.prereg.md's brief, graders and decision rule, over
   the stage-1 cleared ids only: `verbal-audit-build.mjs --ids-file <cleared ids> --expect <n> --root
   scratchpad/verbal-audit-ssat-d23-28 --prereg scripts/study-bank/SSAT-READING-V2.prereg.md` (the `--ids-file` mode is
   added for this run; the population and decision code are otherwise unchanged). Every item is a passage-set item, so
   `source_check: required` everywhere: **no_source is a defect.** Graders a (plain) and b (adversarial). An item is
   held on either grader's `key_verified:false` or any flagging issue; **a passage set holds whole if any item holds.**
   Scored by `verbal-audit-score.mjs --root …`; a void packet is re-run with a fresh grader, never scored on one.
4. **Survivors** = stage-1 cleared minus stage-2 held sets. Survivors stay staged `verified=false`. Non-survivors also
   stay staged and are listed as held in the results (the verbal-audit rule: no item is archived on a grader's word;
   the owner decides). Nothing is released by this run.

## 6. Bands (fixed now, in passages of 36)

| survivors | reading |
|---|---|
| >= 30 | target met (+5 forms worth) |
| 18-29 | brief v2 works; short of target, top up with a new v2 batch (no repair) |
| 12-17 | partial; record which rule failed before any top-up |
| < 12, or stage 1 clears < 18 | **stop**: v2 is Broken (BRIEF-VERSIONING rule 3) |

Separately, per named lesson: if both stage-2 graders, or two stage-1 graders, name "vocabulary distractors are
unrelated senses", "attitude key is the one moderate word", "main-idea key is the broadest", or "purpose key is the
only abstract option" on >= 3 shared items in any packet, v2 failed that lesson; it is recorded as a v3 pending lesson
whatever the survivor count. Stage-2 no_source counts are reported by genre (science vs the rest) against v1's audit
(4 of 5 SSAT no_source science items came from science passages).

## 7. Depth

`admission-form-depth.ts --forms 14` live, and with `--include-ids <survivor ids>` (added for this run; refuses on any
id that is not staged), and with the d19-22 cleared staged ids as well, labelled as staged, never as live.

## 8. What this cannot see

No blind number is produced (the gate the owner named is the agent-review instrument plus the key-visible audit).
Graders are one model sampled several times; agreement is not independence. A key-visible grader is anchored by the
key. Agent reading comprehension has under-flagged what the co-founder later found (memory). The Daniel audit sample
is the human check, after this run.

## Addendum 1 (2026-10-31, plans drawn, before any author starts; no rule changed)

Brief v2 frozen: `briefs/ssat-reading-v2.md` sha256 c6559149af4d95b8ae5548a4091b950e4d0ec9149063d9c37c59b110e7a01024
(method id `ssat-rd-v2-agent`). Plans (`scratchpad/ssat-v2-work/plans/`), sha256:
d23 ed44fe6d…af5e, d24 9fee76cc…5d106, d25 4abe716b…bc552, d26 e54d8417…f53f4, d27 9fef1d14…07228, d28 bbefba35…04f68.
Drawn totals over 216 items: key length shortest 50 / middle 125 / longest 41; main-idea breadth key-broadest 5,
distractor-broader 12, all-level 7, two-part key 9 of 24; attitude key strong 9 of 18; vocabulary distractors
context 52 / sense 92 (6 of 36 items all-sense); purpose key abstract 12 of 36. Existing-passage list regenerated
(326 SSAT+ISEE openings, 141 live/staged SSAT attitude sets) by `ssat-reading-v2/existing.mjs`.

## Addendum 2 (2026-10-31, frozen and staged, before any grader; no rule changed)

Six author agents finished; pre-flight clean on all six (check.mjs 0, quotes 0, locrefs 0, screencheck 36/36).
`check.mjs` break-tested on real d24: every plan mutation caught (key length 36/36, intensity 3/3, breadth 4/4,
key_form 4/4, vocab types 5/5, key_abstract 4/4). Coordinator topic pre-flight sent two d25 passages back BEFORE
freeze (hailstone rings = staged ssat d6; town street lamps = isee d11 / worlds-s5); replaced by "Snow Eater" and
"The Sprinkling Wagon", same plan shapes. Frozen batch sha256: d23 9a26d245…91fe, d24 0c315235…8d75, d25 9913e99b…a0b9,
d26 4f3076ed…de05, d27 ed7c9975…4629, d28 315fef4f…286f. Staged 216 verified=false, read back 216/216 false, 36 groups.

## Result (2026-10-31; scored by the pre-registered scripts only)

- **Stage 1 (agent review, A1): 156 of 216 cleared, 26 of 36 passages, 0 cohorts held** (d23 30, d24 36, d25 12, d26
  24, d27 36, d28 18). Two confirmed patterns, both below 50% so subset drops: d25 main-idea key_form (items 4, 12, 31),
  d28 sweeping-generalisation distractor (17, 19, 29). Results `agent-review/results-ssat-d23-28/`.
- **Stage 2 (key-visible audit): scored 156 of 156, 6 of 6 packets; 7 items flagged, 7 sets held (42 items).**
  no_source 3 (all vocabulary items whose `context` distractors were not senses of the word), language_error 2,
  fact_error (internal inconsistency) 2. **Science no_source: 0** (v1 audit: 5 of the SSAT no_source items were on
  science passages). `audit-FLAGGED.json` in the results dir.
- **Survivors: 114 items, 19 of 36 passages** (poetry 5, essay 3, history 3, fiction 3, memoir 3, science 2).
  **Band: 18-29, "brief v2 works; short of target".** Survivors and holds all stay staged verified=false (216 read
  back false, 0 archived); ids in `survivors.ids.json`.
- **Named lessons:** "attitude key is the one moderate word" and "purpose key is the only abstract option" were not
  named by any grader. "Main-idea key is the broadest" recurred only as the d25 key_form cluster. "Vocabulary
  distractors are unrelated senses" was named as style by several graders and the `context` remedy inverted it (3
  no_source holds): **v2 failed the vocabulary lesson** — pending v3 lesson 1.
- **Depth** (`admission-form-depth.ts --forms 14`): live 390 items / 73 groups = **9 clean**; with the 114 staged
  survivors **11**; with survivors plus the 138 staged d19-22 cleared, 14+ (the replay cap). Staged, not live.
