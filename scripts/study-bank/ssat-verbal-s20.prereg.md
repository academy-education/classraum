# ssat-verbal-s20-ana — pre-registration (75 analogies, cohort `ssat-verbal-s20-ana`)

Written 2026-10-10, before any item, render or result exists. **The owner approved ONE LAST
try: if this batch fails any gate, AI analogy authoring for SSAT stops.** Inherits every gate,
tool and stage of `ssat-verbal-s19.prereg.md` (`cad126b5`) except where a line below says
otherwise. Four things change: (1) the difficulty gate is stated under the banking rule that is
applied, (2) items are made hard at the source with a declared tempting distractor and a
pre-freeze probe with one revision round, (3) the word rule (held s18/s19 words may be reused in
new pairs), (4) blindness instructions. The held s18 (80) and s19 (75) analogies are not
re-run, repaired, re-decided or inserted.

## Measurement (the reason for the batch)

`ssat-verbal-replay.ts --need 11`, live 2026-10-10: 617 SSAT verbal rows (synonym 347 / 322
groups, analogy 270 / 251 groups). **9 clean forms of 12**; forms 10-11 syn 30/30, ana 0/30;
`--need 11` = synonyms +0, **analogies +60**. Unchanged since s19.

## Size, and why it is 75 rather than 80

- **Balance fixes the size.** The s19 design keys every family 4 times in pair role (of 20) and
  once as the singleton (of 5), so a family's key rate is 20.0% overall and in each role.
  With 15 families that role balance is exact only at N = 75k (at 90 a family would be keyed
  4.8 times in pair role). 75 is the balanced size nearest the requested ~80; 150 is out of
  reach of the word pool and the time budget.
- **The word pool supports 75, measured.** An item uses ~12 content words (s19: 902 distinct
  words over 75 items). Under rule 5 below the pool open to s20 is the s19 starting pool
  exactly: s20 gets back the 902 words s19 used (s19 drew 685 fresh words and 217 held-s18
  words), and the held s18+s19 union is **1,648 distinct words** before any fresh word. That
  pool produced 75 items once. 75 is therefore not sized down; 90 would be.
- **Reachable forms, stated before authoring.** Kept >= 60 → **11** clean forms; 30-59 → **10**;
  under 30 → 9. At s19's keep rate (48/75 = 64%) 75 items give ~48 → 10 forms; 11 needs a keep
  rate of 80%, which only the two at-source changes below could deliver. No bar moves and no
  blueprint count changes to reach it.

## Commission

75 analogies, ids `SVA20-01..75`, Claude authors only (never GPT), **one file per item** in
`ssat-verbal-s20-work/items/` (excluded from git), 5-7 items per author run, at most two runs
at a time; every run checks every item against the bank's words and every item file already on
disk (`ssat-verbal-s20-tools.mjs check-item`).

**Difficulty commissioned 0 easy / 25 medium / 50 hard** (s19: 10/35/30; live analogies
95/130/45). "Hard" means a strong Upper Level student is genuinely tempted by one distractor,
not a rare word: s19 authored-hard items were banked easy 9/30, and graders said the near miss
read as an obviously different relation.

**Seeded design** (`ssat-verbal-s20-tools.mjs design`, seed **20261112**, committed with the
tooling before any author runs), identical construction to s19: per slot the key letter (15 per
letter), difficulty, key family, and four distractor families; the same **15 families in four
clusters**, five different families per item laid out **2 + 2 + 1**, every family present 25
(20 pair / 5 singleton) and keyed 5 (4 / 1), 20.0% in every role; the key's same-cluster
**sibling** distractor in the 60 pair-keyed items.

    person   worker/tool, worker/workplace, creator/creation
    thing    part/whole, container/contents, object/material, category/instance
    process  cause/effect, tool/function, preparation/act
    sense    degree, synonyms, antonyms, lack, symbol/symbolized

**Item rules.** s19 rules 1-4 and 6 unchanged (noun : noun, valid crisp instance of its
declared family, canonical order, no broken twin, no reversed key relation; options from
different everyday domains, key not from the stem's domain; vocabulary spread, the key never
the uniquely rarest option, at least two distractors at the key's word level; Upper Level band,
never GRE-tier; declared `stem_relation`, `option_relations`, `distractor_rationales`).
Changed:

- **5. Words (changed).** No content word of any SSAT verbal row in the bank, live, staged or
  archived (re-dumped with the tooling into `ssat-verbal-s20.live-words.json`; `roots()`
  over-matches on purpose), each content word once in the cohort, inflections included.
  **Explicitly allowed: a single word used in a held s18 or s19 analogy may be reused, in a NEW
  pair.** Never allowed: any of the held s18 (80 items) or s19 (75 items) stem or option PAIRS,
  order-free, by root (`pairKey`), as stem or as option. The checker loads both held files,
  refuses unless they hold exactly 80 and 75 items, and fails any item that re-uses a held
  pair. The held s18/s19 analogies are not in the bank, so this cannot repeat a pair a student
  can meet.
- **7. The tempting distractor (new, replaces s19's `near_miss`).** EVERY item declares
  `tempting: { option, loose_reading, why_wrong }`: the distractor the author built to tempt a
  strong student, the one-sentence loose statement of the stem relation that the tempting
  option and the key both satisfy, and the precise statement that only the key satisfies. The
  checker refuses an item whose `tempting.option` is not one of its four distractors or whose
  two sentences are missing. In pair-keyed slots the sibling is the default candidate; the
  author may instead declare any distractor whose family is genuinely confusable with the key's
  (e.g. degree vs synonyms, lack vs antonyms, cause/effect vs preparation/act, part/whole vs
  object/material). The tempting option must sit at the key's vocabulary level and must still
  be plainly wrong under the precise relation (a second defensible option drops the item).
- **8. Author self-check (new).** Before writing each file, the author states in the file which
  distractor tempts and why (rule 7) and rates the item easy/medium/hard against SSAT Upper
  Level; an item the author itself rates easy in a medium/hard slot is rewritten before it is
  written.

## Pre-freeze probe and the ONE revision round (new)

After all 75 items pass `check-all`, two fresh Claude **probe raters** (no author, never a
later solver or grader) each read their own unmarked, re-shuffled with-source render
(`probe-render`, seeds 20261115 / 20261116; stem and five options, no key, no authored field)
and return per item `pick`, `second_defensible`, `difficulty` (easy|medium|hard vs SSAT Upper
Level), `tempting_distractor` (or "none"), `notes`.

An item goes to the revision round if **either** probe rater (a) rates it easy, (b) answers
`tempting_distractor` = none, (c) picks a non-key, or (d) names a second defensible option
(`probe-triage`; written to the work folder before any revision starts). **Exactly one round**:
each flagged item is revised once by a Claude author run (slot constraints unchanged, must pass
`check-item`), with the probe's notes on that item as the brief. No second probe, no second
round; unflagged items are not touched. The probe is not a gate: it cannot drop, hold or
re-label anything, and its labels are never used for banking. Reported: flagged count by
reason, and revised count.

## Gates, in this order. Stop at the first that fails; no repairs after freeze.

**0. Pre-flight (fixable before freeze only).** As s19: `check-all` PASS on the merged file
(design, words, held pairs, cross-item collisions, key slots <= 30%, key strictly longest /
shortest each <= 30%, no option string repeated, `tempting` declared on 75/75); `stem-duplicates`
0; `check-recycled-distractor.mjs` NO MEASUREMENT or at/under its control; `verbalKind()`
analogy for every prompt. Then FREEZE: `ssat-verbal-s20-ana.batch.json` committed with its
sha256 before any solver or grader sees it. **The freeze commit message carries counts and the
sha only — no item text, no key, no word.**

**1. Options-only (`nosource`) — deciding.** Unchanged from s19:
`make-oo-render.mjs ... --control 40 --control-subskill analogy --exclude ssat-verbal-s6`,
three blind samples of one Claude solver prompt, every item judged by reading it. **E = M_c −
M_l. PASS E <= +10; HOLD E > +10.** Live arm >= 85% → HOLD as saturated. Floor rule as s19.

**1b. Precision family gate.** Unchanged (`precisionGate`, same constants: picks >= 6,
precision >= base + 10 points, permutation p <= 0.05/F, 20,000 draws, seed 20261109). HOLD iff
any family fires.

**2. Elimination.** Unchanged: candidate <= live + 10 points.

**3. With-source (`withsource`).** Two fresh Claude graders on their own unmarked re-shuffled
renders (`grade-render`, seeds **20261113 / 20261114**), the s19 grader fields unchanged
(`pick`, `second_defensible`, `difficulty` + reason, `above_band`, `free_elimination`,
`invalid_option`, `free_identification`, `tempting_distractor`, `notes`). Per-item DROP rules
unchanged from s19, including **both graders `tempting_distractor` = none → drop**.

Banked difficulty = the **EASIER** of the two grader labels (unchanged), BANK_BAND=mixed.

**The difficulty gate, restated under the rule that is applied (changed).** The intended bar
was that a batch must not make the analogy bank much easier: about 40% easy *as one grader
labels it*. s19 applied 40% to the easier-of-two label, which counts an item easy when either
grader says so. On s19's 48 kept items each grader alone was under 40% (17/48 = 35.4%,
18/48 = 37.5%) while the easier-of-two label read 22/48 = 45.8% (13 easy by both, 9 by one).
Translating a per-grader 40% to the easier-of-two rule with s19's measured inflation:

    ratio:    40% x (22 / 18) = 48.9%      (easier-of-two easy / the higher single grader)
    additive: 40% + (45.8 - 37.5) = 48.3%

**Cap: banked easy (easier-of-two) <= 48% of the kept items** — the lower of the two
translations, rounded down. Over 48% HOLDs the arm. The per-grader easy rates on the kept
set are printed beside it as diagnostics, never as the decision. Under this cap s19's 45.8%
would have passed; **s19 is not re-decided** — it was decided under its own pre-registered rule
and stays held. Reported beside the gate: authored → banked label for every graded item, both
graders' labels, and the no-tempting-distractor rate.

**4. Tells on the kept set.** Recycled-distractor (at/under control or NO MEASUREMENT) and key
strictly longest / shortest (<= 30% each) re-run on the kept file; a failure HOLDs the arm.
Family key rate on the kept items reported.

**5. Insert** the kept file (`verbal-bank-helper.mjs insert ssat`, `BANK_COHORT=ssat-verbal-s20-ana`,
BANK_BAND=mixed) once the ledger entry for its sha holds every stage; then
`verify-admission-forms.mjs` and `ssat-verbal-replay.ts`.

## Blindness (changed)

- **No commit message names a key, an option, a stem or any word of an s20 item**, at any
  stage (s19 finding 3: subagents carry recent commit messages). Messages carry ids, counts,
  rates and shas only.
- Every solver, probe rater and grader brief says: ignore any git history, commit messages or
  repository context you may have seen; do not run git; read only the file you are given.
- Options-only samples and graders are fresh agents that never authored, probed or revised.

## Process rules

Claude agents only. No subagent may run pkill, killall or any process-killing command, and
every brief says so. At most two subagents at a time; completion judged by files on disk;
a subagent idle 6+ minutes is relaunched. Any new env var is documented in `.env.example`.
`ledger.json` is re-read from HEAD before editing and only this cohort's entry is staged.
REGISTER §5 and the ledger entry land in one commit. Local commits only.

## Success measure

Clean forms before: 9. Target 11 (+60 kept). 30-59 kept → 10. If any gate fails, nothing is
inserted, the measured numbers are reported, and **AI analogy authoring for SSAT stops** (owner
decision).
