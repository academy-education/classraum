# ssat-verbal-s21-ana — pre-registration (25 analogies, cohort `ssat-verbal-s21-ana`)

Written 2026-10-10, before any item, render or result exists. **The owner approved ONE small
batch with the above-band rule fixed, then stop.** Inherits every gate, tool and stage of
`ssat-verbal-s20.prereg.md` (`043a7b94`) except where a line below says otherwise. **One rule
changes** (the above-band drop). Everything else that differs is size: N, the difficulty mix
scaled to 25, the family balance restated for 25, new seeds, and the held-pair list extended to
s20. The held s18 (80), s19 (75) and s20 (75) analogies are not re-run, repaired, re-decided or
re-used: none of their pairs may recur, and s20 is not re-decided under the new rule.

## Measurement (the reason for the batch)

`ssat-verbal-replay.ts --need 11`, live 2026-10-10: 640 SSAT verbal rows (synonym 347 / 322
groups, analogy 293 / 274 groups). **9 clean forms of 12**; form 10 53/60 (syn 30/30, ana
23/30); form 11 ana 0/30. **Form 10 needs +7 analogies**; form 11 needs +37.

## The one rule change: above band needs BOTH graders to name the same word

s20 (REGISTER §5, finding 1) dropped an item as above band when EITHER grader's `above_band`
list named a word in the stem or key, and also when both graders named the same word anywhere.
Grader 1 flagged 4 items and grader 2 flagged 47; they agreed on 3. **43 of s20's 52 drops had a
single grader's flag as their only reason (42 grader 2, 1 grader 1)**, including words SSAT prep
lists treat as core. One grader's strictness, not the band, decided them.

**s21 rule: an item drops as above band only if BOTH graders name the same word** (case folded,
each list entry split into words, simple inflections folded: `ostlers` / `Ostler (stem)` /
`ostler` match; `wedging` / `wedge` match; "none" is not a word). The single-grader stem/key
clause is deleted. Every other per-item drop rule is unchanged (either grader off key, second
defensible, invalid option, free identification, free elimination with >= 2 certain blind
rejects, both graders no tempting distractor). The rule lives once, in `decide()` in
`ssat-verbal-s21-stages.mjs`; `qc` and the break-test call the same function.

**Break-tested on s20's committed files before this file was committed**
(`ssat-verbal-s21-stages.mjs rule-breaktest` on `ssat-verbal-s20-ana.batch.json`, its oo key,
three solver files and both grader files; writes nothing):

    s20 rule reproduces the committed qc.json     kept 23/75, 0 mismatching items (reasons included)
    s20 drops whose only reason is above band     46: single-grader only 43 (grader 2 42, grader 1 1);
                                                  a two-grader word on 3 (SVA20-02, -67, -69)
    s21 rule                                      single-flag-only kept 43/43; two-grader items still
                                                  dropped 3/3; no other item's decision changes
    planted pairs                                 one grader / different words / neither / "none": keep;
                                                  same word with case, inflection, annotation, phrase,
                                                  -ing vs -e: drop (8/8; the first run returned DROP for
                                                  "none" vs "none", fixed before this file)
    real-data plant                               SVA20-05 with grader 2's word copied to grader 1: DROP

The old rule run as the new one keeps 0/43 of those items, so the test separates the two rules.
s20 under the s21 rule would read kept 66/75, banked easy 9/66 = 13.6%. **That is a planning
number only; s20 is not re-decided** and none of its items is inserted or re-used.

## Size, difficulty, and the family balance at 25

- **25 items**, ids `SVA21-01..25`, the size the owner approved. Kept >= 7 → **10** clean forms;
  under 7 → 9. 11 is not reachable (needs 37). At s20's measured keep under the new rule (66/75
  = 88%, planning only) 25 items give ~22; at s20's actual 31% keep they give ~8. 7 is a keep
  rate of 28%.
- **Difficulty commissioned 0 easy / 8 medium / 17 hard** (s20's 0/25/50 scaled; 25/3 = 8.3
  rounds to 8 medium).
- **Family balance (restated for 25).** s20's balance (every family present 25, 20 pair / 5
  singleton, keyed 4 / 1) needs N = 75k. At 25 there are 100 pair positions and 25 singleton
  positions over 15 families, so equal presence is impossible. **What is kept exact is the key
  rate: every family is keyed in exactly 1/5 of its appearances, in each role.** The seeded
  design picks 5 SINGLETON families (one each from person, thing, process, two from sense);
  they appear only as the singleton, 5 times each, keyed once. The other 10 PAIR families appear
  only in pairs, 10 times each, keyed twice. So an option in a pair is the key 20/100 = 20.0% of
  the time and the singleton 5/25 = 20.0%, and no family is keyed above 20.0% of its
  appearances. Unchanged from s20: the same 15 families in four clusters, five families per item
  in a 2+2+1 layout over three clusters, pairs same-cluster, key letters 5 per letter, and the
  key's same-cluster sibling distractor in the 20 pair-keyed items. **What is lost:** equal
  presence (pair families appear twice as often as singleton families), and the precision family
  gate has less power: at 75 blind picks a 5-appearance family expects ~3 picks, under the gate's
  6-pick minimum, so singleton families will mostly read "not measured". The gate's constants do
  not change.
- Seeds: design **20261130**, probe renders **20261131 / 20261132**, grader renders
  **20261133 / 20261134**.

## Commission and words (unchanged rules, one list extended)

Claude authors only (never GPT), **one file per item** in `ssat-verbal-s21-work/items/`
(excluded from git), 5 items per author run, at most two runs at a time. The s20 author brief,
item shape, `tempting`, `author_rating` and item rules 1-8 apply unchanged. Words exactly as s20
rule 5: no content word of any SSAT verbal row in the bank, live, staged or archived (re-dumped
into `ssat-verbal-s21.live-words.json`; s20's 23 inserted items are now bank rows, so their words
are excluded); each content word once in the cohort, inflections included; a single word used in
a held s18, s19 or s20 analogy may be reused in a NEW pair; **no held s18 (80), s19 (75) or s20
(75) stem or option pair**, order-free, by root. The checker loads all three held files, refuses
unless they hold exactly 80, 75 and 75 items, and refuses below 1,200 distinct held pairs.

## Pre-freeze probe and the one revision round (unchanged)

As s20, at 25: two fresh Claude probe raters on their own unmarked renders; an item is flagged
if either rater calls it easy, names no tempting distractor, picks a non-key or names a second
defensible option; each flagged item is revised once (must pass `check-item`); no re-probe. Not
a gate. (s20 finding 2: revised items survived no better, 9/31 vs 14/44. Carried anyway because
the owner approved s20's stages with one change.)

## Gates, in this order. Stop at the first that fails; no repairs after freeze.

**0. Pre-flight**, as s20: `check-all` PASS (design, words, held pairs, collisions, key slots <=
30%, key strictly longest / shortest each <= 30%, no repeated option string, `tempting` on
25/25); `stem-duplicates` 0; `check-recycled-distractor.mjs` NO MEASUREMENT or at/under its
control; `verbalKind()` analogy for every prompt. FREEZE: `ssat-verbal-s21-ana.batch.json`
committed with its sha256 before any solver or grader. **No commit message names a key, an
option, a stem or any word of an s21 item.**

**1. Options-only — deciding.** Unchanged: `make-oo-render.mjs ... --control 40
--control-subskill analogy --exclude ssat-verbal-s6`, three blind samples of one Claude solver
prompt. **E = M_c − M_l; PASS E <= +10; HOLD E > +10.** Live arm >= 85% → HOLD as saturated.

**1b. Precision family gate.** Unchanged (imported from s19; picks >= 6, lift >= 10 points,
p <= 0.05/F, 20,000 draws, seed 20261109). HOLD iff any family fires.

**2. Elimination.** Unchanged: candidate <= live + 10 points.

**3. With-source.** Two fresh Claude graders on their own unmarked re-shuffled renders (seeds
20261133 / 20261134), s20's grader brief and fields unchanged. Per-item drops as s20 **except
the above-band rule above**. Banked difficulty = the easier of the two labels; **cap: banked easy
<= 48% of kept** (unchanged); per-grader easy rates printed as diagnostics.

**4. Tells on the kept set.** Unchanged: recycled-distractor (at/under control or NO
MEASUREMENT), key strictly longest / shortest (<= 30% each); a failure HOLDs.

**5. Insert** the kept file (`verbal-bank-helper.mjs insert ssat`,
`BANK_COHORT=ssat-verbal-s21-ana`, BANK_BAND=mixed) once the ledger entry for its sha holds every
stage; then `verify-admission-forms.mjs` and `ssat-verbal-replay.ts`.

## Blindness and process (unchanged from s20)

Commit messages carry ids, counts, rates and shas only. Every solver, probe rater and grader
brief says: ignore git history, commit messages and repository context; do not run git; read
only the given file. Options-only samples and graders are fresh agents that never authored,
probed or revised. No subagent may run pkill, killall or any process-killing command; every
brief says so. At most two subagents at a time; completion is judged by files on disk; a
subagent idle 6+ minutes is relaunched from disk. Any new env var is documented in
`.env.example`. `ledger.json` is re-read from HEAD before editing and only this cohort's entry
is staged; REGISTER §5 and the ledger entry land in one commit. Local commits only.

## Success measure

Clean forms before: 9. **Kept >= 7 → 10.** Then stop (owner). If any gate fails, nothing is
inserted and the measured numbers are reported.
