# Is the autonomy plan workable? (2026-10-23)

Question from the owner: *"Can you see the history of how the questions were made so far and then see if this is
really workable."* "This" is `scripts/study-bank/AUTONOMY-ALGORITHM-2026-10-23.md` (the plan). Under it, each
stratum earns a trust level (L0 full sitting, L1 spot, L2 pooled spot, L3 autonomous with audits) from the
Clopper-Pearson 90% upper bound U on the rate at which the co-founder rejects items the AI pre-screen passed
(promote at U <= 20% / 5% / 2%; one miss demotes). His notes become grader checks, fixtures and authoring rules,
and four new AI checks are added (fact, passage self-consistency, speech naturalness, batch-level pattern).

**Read-only work.** No DB writes, no git, no bank or queue change. Queries were run with the service key from
`.env.local`, paged past the 1,000-row cap and ordered by id (bank 16,091 rows; reviews 1,125 rows; both counts
are non-multiples of 1,000, so the paging loop ran to completion). Scratch scripts are in this session's
scratchpad (`feas/a1..a13.mjs`), not in the repo.

---

## Verdict (top of page)

**Workable with specific changes, and only up to L2 for now.** The L0-L2 part is a sound sampling plan and is
where the saving is: a spot sitting of 12 instead of a full sitting of 36-150. **L3 (no human before release) is
not supported by the record for any co-founder-gated stratum in 2026**, for four reasons measured below:

1. **The process is not stationary.** Every stratum in today's queue except Choose a Response switched
   authoring method on Oct 20-22, and CR's brief is rewritten every batch. In October, methods or constructions changed roughly every 2-10 days per family. Even an *unchanged*
   brief moved 25 points between two batches (cr-v4 +22.2 vs cr-v6 +47.2). Trust earned on one method has never
   been shown to transfer to the next; the opposite has been shown repeatedly ("each attempt removes the previous
   tell and introduces a new one").
2. **The evidence rate is too slow.** He has reviewed 1,045 items in 81 days: mean 90 a week, median week ~53,
   with three zero weeks. L3 needs 114 current-method items with zero defects per stratum (194 with one).
   Spread over ~9 strata, that is 11-20 weeks of an unchanged method per stratum. No stratum has ever had that.
3. **His verdict is not the ground truth for reading and listening; his notes are.** Verdict-only, SSAT reading is
   0 rejects in 218 items (U = 1.1%, L3 by the numbers) — and two of those 218 carried release-stopping defects
   (offside rule wrong; passage contradicts itself) that he marked "only defensible". The one second human who
   overlapped him passed all 4 of the CR items he flagged.
4. **No post-release safety net exists.** Real students: 16 accounts with attempts, 6,182 attempts since August,
   no item above 7 attempts. The plan's own student-data trigger (>= 30 attempts) is 6-12+ months away for new items.

**Top 3 changes** (full list in Part 3):
1. **Reset on method AND brief change, with a bridge spot.** Remove "appending a rule to a brief is not a new
   method". Any change to an authoring brief, construction, or author type (in-session vs agent) makes the next
   batch an L1 spot regardless of level, and evidence from the old version carries at w = 0.5 only after that spot
   is clean.
2. **Cap at L2 until two things exist**: (a) a second, independent human ground truth (a second reviewer on at
   least 1 in 5 runs) or real-student item statistics at >= 30 attempts, and (b) measured recall of each new
   H-check on real fixtures (not planted ones). Until then "autonomous" means L2 pooled spot, which already cuts
   his load by ~4x versus full sittings.
3. **Make notes, not verdicts, the defect signal, and make the tracker fail loudly.** Count confirmed H notes as
   defects (the plan does), but also never let a verdict-only U promote a reading/listening stratum, and build
   `autonomy-state.mjs` to exit non-zero on any unmapped packet item, missing grade file, or unclassified note.

**Never autonomous (on current evidence):** TOEFL Choose a Response (live miss 1/20, his unscreened flag rate
15-35%), TOEFL Conversation (2 H in 48), SSAT/ISEE reading and MAP comprehension (agent authoring stopped three
times, H defects are factual/logical and invisible to the validated grader), ACT Science (real-world science
facts, blind instrument invalid, still hidden). **Plausible later candidates:** ACT English (1/132), SSAT/ISEE verbal
(vocabulary, arithmetic-like exclusivity), and SAT R&W, which in practice already releases on AI gates alone
(1,513 live, 8.4% ever human-sat).

**Realistic timeline:** L1 for every queued stratum within the current queue (~4-6 weeks at his pace). L2 for 2-4
strata (ACT English, ACT Reading, TOEFL Talk, SSAT verbal are the likeliest) by mid-December *if* their methods are
frozen. L3: not before Q1 2027 for any stratum, and only after change 2 is met. **Residual risk at L2:** about 1 in
20-50 released items in a stratum could carry a defect he would flag (U at L2 is <= 5%), concentrated in factual
and consistency defects the grader was never validated on.

---

## Part 1. How the questions were made

### 1.1 Timeline of authoring methods, with what is still live

Counts are bank rows (`study_item_bank`, all families, archived included), grouped by `cohort` and
`verify_meta.method`. "Live" = verified and not archived. Maths shown only where it bears on the comparison.

| period | method | families | items | live | staged | archived | evidence |
|---|---|---|---|---|---|---|---|
| Jun 23 - Jul 7 | **GPT-4o / gpt-4.1 generation** via `/api/study/test/generate` | SAT R&W, SAT Math | SAT `legacy` 154 R&W + 361 math; `v2` 751 R&W (+ math) | `legacy` 0; `v2` R&W 740 | 0 | `legacy` 515 (all); `v2` R&W 11, math 66 | commits 3e3b46d8, fd1b938f; `source='generated'` 63 rows |
| Jul 7 | Template-computed SAT math (`template-computed`) | SAT Math | 302 | 0 | 0 | 302 | `verify_meta.method` |
| Jul 21 | **"harvest-v1"**: earlier generated TOEFL bank imported | TOEFL all sections | 1,761 (`source='generated'`) | 843 | 4 | 914 (52%) | cohorts `harvest-v1` |
| Jul 21-28 | Claude in-session + Claude blind grade (`v3-claude`, `talk-c1/c2`, `orphan-v1`) | TOEFL | 325 + 163 writing + 42 + 187 | 325 / 163 / 42 / 151 | 0 | orphan 36 | c77b2cce |
| Jul 27 - Aug 11 | CR briefs v1-v6 (four-slot distractor roster, repairs) | TOEFL CR | cr-v1 56, cr-v2 14 (v3-v6 never inserted) | 0 | 0 | 70 (100%) | REGISTER §0 table |
| Aug 17 → | **cr-v7 four symmetric worlds + seeded key** | TOEFL CR | cr-v7..v21: 132+46+36+35+16+... = 542 | 214 | 299 | 29 | `crv7-symmetric-worlds+seeded-key` |
| Jul 28 - Sep | Hand-authored in-session SAT R&W hard cohorts (rw-v6..v9, eoi-v3..6, rsw) | SAT R&W | 453 | 421 | 0 | 32 (eoi-v3) | 624039ff, 4ea50089 |
| Aug 28 - Sep 1 | "Worlds" pilots + bijective sets, Claude-authored + Claude QC | SSAT, ISEE | ssat reading worlds 138, isee reading worlds 117, verbal s2-s6 | ~all | 0 | 4 | `claude-authored+claude-qc` |
| Sep 2-3 | **ACT round 1** (Claude-authored, blind attack failed, agent distractor rewrite, then human sitting B7) | ACT E/R/S/M | act-english-v1 150, act-reading-v1 108, science v1/v2 120 | 378 | 0 | 0 | 566cd86b, d35b9beb; 158 rows carry `repaired_at` |
| Sep 26 → Oct 23 | **Pre-registered agent batches** (PREREG-*.md, 49 files): SEC10-17, WIC7-28, II21-23, SEC22-27; maths ADV/ALG/MF | SAT R&W, SAT Math | SAT R&W rw-v10..v28: ~560 | ~560 | 0 | 0 | ledger, PREREG files |
| Oct 2 - 10 | Multi-author Claude agents, structure-checked (`act-bank-helper`) | ACT English v7-v9, ISEE verbal s15-s23, SSAT verbal s17-s21 | ~1,000 | ~880 | 130 | 1 | ledger |
| Oct 2 - 10 | SSAT reading agent pilots (five-version WV, PD passages, misread), MAP pilots 1-8 | SSAT, MAP | WV6 12 inserted; the rest never inserted | 12 | — | — | memory `ssat-reading-agent-authoring-stopped`, `agent-reading-comprehension-limit` |
| Oct 11-22 | **In-session Claude "drafts" gated by co-founder release sitting** | SSAT reading d1-d4, ISEE reading d1, MAP reading d1, TOEFL conv/talk d1 | 72+36+36+36 / 36 / 48 / 64+20 | 144 / 36 / 24 / 60 | 108 | 0 | release_basis strings, 359 rows |
| Oct 20-23 | **Agent drafts at scale + co-founder-standard grader pre-screen + spot route** | SSAT reading d5-d18, ISEE reading d2-d16, SSAT verbal d1-d5, ACT reading v8-v12, ACT science v5-v9, TOEFL passage d1-d7, talk d2-d7, CR v12-v21 | **3,933 staged verbal items** | 0 | 3,933 | ~20 | `verified=false`, created Oct 20-23 |

What is live today, verbal only (no maths, speaking, writing): **5,646 items, of which 892 (15.8%) have ever been
sat by any human.** By stratum: map/reading 100%, ssat/reading 59.9%, toefl/CR 28.5%, act/reading 27.2%,
toefl/announcement 26.8%, toefl/conversation 26.3%, act/english 25.4%, isee/reading 23.5%, toefl/talk 22.5%,
act/science 17.5%, toefl/passage 14.9%, toefl/daily_life 11.8%, sat/rw 8.4%, ssat/verbal 3.0%, isee/verbal 0.0%
(570 live), toefl/reading other 0.0%. (Join of `study_item_bank` live rows to any `reviewer_kind='human'` review.)

**Takeaways.** (a) The GPT era is fully retired except SAT `v2` (740 live R&W). (b) The process has had at least
six distinct regimes in four months, and the newest (agent drafts at scale, Oct 20-23) produced more staged items
in three days (3,933) than he has reviewed in his whole history (1,045). (c) SAT R&W and the verbal families of
SSAT/ISEE already release on AI gates without a human; the plan's autonomy question is really about the
co-founder-gated strata.

### 1.2 Post-release defects (items that were live, then archived or repaired)

From `verify_meta.archived_reason` / `repair_why` / `live_edit` / `owner_fix` (query a4/a5) plus REGISTER.

| family / stratum | released then pulled or repaired | why | which check had passed it | caught by |
|---|---|---|---|---|
| SAT R&W + Math `legacy` (GPT) | 515 archived | too easy / generation defects | GPT self-QC, adversarial-3vote | later audits |
| SAT Math `v2` | 117 hub-repaired live + 6 archived | derivational-hub distractors (98.3% in the affected cohort vs 8.0% elsewhere) | sandbox key check (keys right; distractors leaked) | exact hub checker, 2026-08-06 |
| SAT R&W `v2` | 96 length-rebalanced live; 11 archived | key-longest tell | GPT QC, then the blind attack | co-founder notes (33 "key is longest" notes, Aug) |
| TOEFL `harvest-v1` | 914 archived (248 listening, 405 reading, 216 speaking, 25 writing); 15 phrase fixes | spec violations (133 Listen-and-Repeat), near-duplicates (19), key-backwards (Biology 102, REGISTER ~l.1851) | generation pipeline | audits, repair work |
| TOEFL CR cr-v1/v2 | 70 archived | four-slot distractor roster; human blind 55% | AI blind grade of the time | **co-founder blind sitting** (11/20) |
| TOEFL CR cr-v7 | 10 archived after release | 6 second answer + 4 broken ("live because that sitting released") | **four-world AI attack +1.4 (CLEARED)** | co-founder sitting, 10/40 = 25% |
| TOEFL CR cr-v10 | 3 archived after release | second answer | AI attack | co-founder, 3/20 |
| TOEFL orphan-v1 | **33 archived by mistake** ("over-repair: the orphan export was capped at 1000 rows by PostgREST") + 2 co-founder flags | truncated input made multi-question passages look single-question | the repair script's own check | later audit |
| TOEFL harvest/orphan reading | 2 co-founder "alternative" flags | second answer | none (pre-gate) | co-founder |
| TOEFL conv draft-1 (v6 set) | 12 rows live-edited the day after release | **2 self-contradicting transcripts + no contractions** | release rule (keys unique) | co-founder notes; the rule released them anyway (REGISTER l.260, l.194) |
| ACT English v7 | 1 archived after release | second answer | act-bank-helper + blind split + key grade | co-founder |
| SSAT reading d3 | 12 held at release (not live) + owner fix | offside rule wrong; goldfish passage contradicts itself | in-session author check, 36/36 "only defensible" | **co-founder notes** (REGISTER l.235) |
| ISEE verbal s12, SSAT verbal s2/s3, math | 2 + 2 + ~6 archived | duplicates, misc | sandbox / QC | audits |

Repairs that were **pre-release** (not counted as misses): ACT v1's 158 distractor rewrites (repaired 2026-09-02
10:34-10:44 UTC, sitting 15:35-16:15 UTC the same day, shipped 09-03).

**Miss rate of the past process, by gate era** (released items later pulled for a content defect, excluding bulk
retirements of the GPT/harvest era):

| gate in force | released | later pulled or fixed for content | rate |
|---|---|---|---|
| AI attack only (cr-v7, cr-v10, before his sitting decided release) | 132 + 35 | 13 | 7.8% (n=167) |
| Human sitting, verdict-only release rule (359 rows with a `release_basis`, Oct 9-23, plus ACT English v7/v8, 240) | ~600 | 1 ACT archived; 12 conv rows (2 sets) live-edited; 12 SSAT rows held only because a human read the notes | 25/~600 = ~4% of rows released or releasable with a defect the rule ignored |
| AI gates only, no human (October: SAT R&W rw-v10..v28 ~560, SSAT verbal s17-s21 352, ISEE verbal s15-s23 379) | ~1,300 | **unknown: never sampled by a human after release** | not measured |

The last row is the honest headline: **for the largest body of AI-gated releases, the post-release miss rate has
never been measured**, because nobody samples it. The plan's L3 audits would be the first time.

### 1.3 Every recorded case of a check that passed and was wrong

Sources: CLAUDE.md corollaries (cited by heading), REGISTER §5 (line numbers), memory notes, DB. Type labels:
**ST** semantic tell, **PT** positional/structural tell, **TPL** template across a batch, **FACT** factual error,
**ALT** second defensible answer, **KEY** key wrong, **CON** self-contradicting source, **TRUNC** truncated or
unread input, **INV** instrument invalid (saturation), **CTL** control/arithmetic/bar error, **DUP** duplicate of
live, **COV** check did not exercise the path, **NAT** unnatural speech.

| # | date | what passed | what was wrong | type | caught by |
|---|---|---|---|---|---|
| 1 | 07-28 | submit test green | scoring rule deleted; assertion never hit it | COV | attack on the check (CLAUDE.md "Verification standard") |
| 2 | 07-28 | blind grade 175/175 "solved to key" | key in slot A on 163/175; graders read position | PT | attack on the check |
| 3 | 07-28 | verifier "0 problems" | bank truncated at 1,000 rows | TRUNC | attack on the check |
| 4 | 07-31 | `verify-answer-key-spread`, `verify-option-tells` green on CR | bank 94% guessable from options (model) | ST | blind attack (memory `toefl-mc-bank-guessable`) |
| 5 | 08-01 | "at or below fixed-letter control" bar | official ETS/CB items fail it too; SEC condemned wrongly | CTL | calibration on 183 official items |
| 6 | 08-01..08-19 | model attack "93-100%" on 5 TOEFL MC types | humans at chance on 4 of 5 (15-31%) | INV | co-founder sittings |
| 7 | 08-06 | dedup unique index passed 3,341 keys | `string_agg ... order by 1` sorted by a constant; missed both duplicates | CTL | REGISTER l.1847 |
| 8 | 08-06 | human sitting passed cohort | flyer item pickable from stem (key only supplies option) | ST | repair work (REGISTER l.1852) — **a co-founder miss** |
| 9 | 08-06 | Daily Life gates | Biology 102 item keyed backwards | KEY | repair work (REGISTER l.1851) |
| 10 | 08-06 | 34 "human" reviews | entered through the human UI with a model answering (79.4% vs 19.7% by hand) | INV | implausible score (REGISTER §1, migration 079) |
| 11 | Aug | merge caps absent | 33 co-founder notes "key is the longest" (SAT 22, TOEFL 11) | PT | co-founder |
| 12 | 08-03..08-11 | CR briefs v3-v6 each passed authoring rules | each new brief installed a new roster tell; v4's brief held exactly gave +47.2 (v6) after +22.2 | ST/TPL | blind attack (REGISTER §0) |
| 13 | 08-18 | **cr-v7 attack +1.4, CLEARED** | 10/40 second answer or broken | ALT | co-founder |
| 14 | 08-06 | "SAT Math hub bank-wide 64.4%" | 98.3% in one cohort, 8.0% elsewhere; checker counted +1 as a relation | CTL | exact whole-population check |
| 15 | 09-02 | ACT agent rewrite round 1 and 2 | round 2 mirrored round 1's tell (memory `agent-rewrite-inverts-tell`) | ST | blind attack |
| 16 | 09-04 | 3 bank facts from ad-hoc queries | wrong columns (`blind_pick` vs `blind_at`, model_assisted read as human) | CTL | CLAUDE.md "bank-state.mjs" |
| 17 | 09-04 | six checkers: absolute-tell, math-hub, batch-variety, key-rank-spread, math-bank-helper 25%, lexical-anchor | all returned verdicts on input they never read | TRUNC/CTL | someone noticed item counts (CLAUDE.md corollary) |
| 18 | 09-04 | "SEC punctuation leaks, SEC form doesn't" rule | built from a never-inserted batch; live split 7.2 pts, not significant | CTL | measurement on live bank |
| 19 | 09-04 | leak predictor "prose options" | RS split 80 points by cohort with identical option shape | ST | seventh measurement |
| 20 | to 09-04 | five structural proxies (letter spread, length rank, punctuation, concessive pivot, option-family balance) | each caught its tell and missed the next | ST | blind attack (CLAUDE.md, REGISTER §6) |
| 21 | ~09 | per-cohort key histogram 25/25/25/25 | every 4-question set a full ABCD permutation (78%) | PT | per-group check |
| 22 | ~09 | both letter checks passed | **identical key prose across 8 lectures (32 items)** | TPL | grader remark; no automated guard |
| 23 | 09-21 | ACT Science/Reading blind attack 71.7%/88.9% | shipped control 88.9%/96.3%; human 28.6%; model scoring science knowledge | INV | paired control + human sitting |
| 24 | 09-21 | pre-registered "reject if +30" | control 96.3% left 3.7 pts; bar unreachable | CTL | CLAUDE.md "ceiling" corollary |
| 25 | 09-24 | SAT Algebra options-only 30.0% vs 30.0% | 4 of 10 items had free eliminations with the stem | ST | with-source grader |
| 26 | 09-24 | 20 author-declared bounds | killed zero options; live eliminations in the undeclared set | ST | with-source grader |
| 27 | 09-25 | "three independent solvers" | pairwise agreement 68-72% vs 27-36% if independent | INV | CLAUDE.md "one solver sampled three times" |
| 28 | 09-21..09-25 | `tsc` clean, tests green | `next lint` errors broke 52 commits of deploys for 4 days | COV | Vercel failure |
| 29 | 10-02..10-06 | SSAT reading pilots passed their pre-flights | options-only 80-94% (model) | ST | blind attack; later INV for this family (human 16.7%) |
| 30 | 10-04 | SAT assembler | read only the first 1,000 rows (served students from a truncated bank) | TRUNC | BANK-INTEGRITY audit (REGISTER l.1887) |
| 31 | 10-04 | `verify-sat-hard-route.ts` | could overwrite and delete real students' exposure history | COV | REGISTER l.1887 |
| 32 | 10-07 | MAP CoE options-only | model 96.3% vs human 1/5 | INV | human sitting (memory `agent-reading-comprehension-limit`) |
| 33 | ~10 | renderer LCG shuffle | biased (chi-square 26.9); a grader reported it as an item defect | CTL | REGISTER A44 (l.4950) |
| 34 | 10-21 | `check-essay-shape` | deleting the "Others ..." sentence still passes | COV | break test (REGISTER l.291) |
| 35 | 10-21 | conv d1 release rule, 36/36 "only defensible" | 2 self-contradicting transcripts, no contractions, released | CON/NAT | co-founder notes (REGISTER l.260) |
| 36 | 10-22 | SSAT d3 36/36 "only defensible", in-session author check | offside rule wrong; goldfish passage contradicts itself | FACT/CON | co-founder notes (REGISTER l.235) |
| 37 | 10-22 | ISEE math `stem-duplicates`, `math-mechanism-dup`: 0 | ~44 of 60 duplicate live items | DUP | agent read + hand read (REGISTER l.247) |
| 38 | 10-22 | depth snapshot "6+" stored as 6 | true depth 10-14; monitor printed false "2 left" | CTL | REGISTER l.248 |
| 39 | 10-22 | co-founder-standard grader recall 20/23 on CR | **0/6 on non-CR rejects** | ALT | held-out trial (plan §1.1) |
| 40 | 10-23 | cr-v14 grader-cleared, 12/12 passed pre-screen | 1 second answer | ALT | co-founder spot |
| 41 | 10-23 | SEC26 tell simulation, all bars met | probe readers named templates that live in words; 19 of 40 held by template cover | TPL | probe readers + panel |
| 42 | 10-23 | SEC27 semantic-template check, all bars met | 11 of 40 still held by template cover | TPL | grader panel |
| 43 | 10-23 | release guard (blind >= 50%) | fired on a 1-item run (artifact); relaxed by Amendment 2 | CTL | REGISTER l.5964 |

**By type (n = 43 cases; 4 carry two labels):** control/bar/arithmetic 10, semantic tell 9, instrument invalid 5,
template 4, coverage 4, truncated or unread 3, positional 3, second answer 3, contradiction 2, factual 1, key
wrong 1, duplicate 1, naturalness 1. **Who caught them:** the co-founder 6 (cases 6, 11, 13, 35, 36, 40 —
including every release-stopping factual/contradiction defect); a later grader, probe or agent 8; an attack on
the check, a whole-population measurement or a noticed count mismatch most of the rest; production failures 2
(28, 30).

Two patterns matter for the plan. **(1) The checks that failed were not only content checks: 17 of 43 were
infrastructure** (truncation, unreachable bars, wrong controls, mislabelled human rows) and would corrupt a trust
tracker in the same way. **(2) The co-founder caught the defects no AI check was looking for** (factual,
contradiction, naturalness, second answer outside CR), and AI checks caught the defects he cannot see
(position, cross-item templates, guessability where a human is not the right instrument, duplicates).

### 1.4 Human sittings over time, per family

`study_item_reviews`, reviewer `6ca6edaf` (support@, the co-founder), `reviewer_kind='human'`: **1,045 rows,
44 runs, 23 active days, 2026-08-04 to 2026-10-23**. "Blind" is his options-only pick scored against `key_slot`
(4-choice chance 25%, 5-choice 20%). "Hard flags" = verdict alternative/broken.

| stratum | items sat | hard flags | flag rate | notes | blind | model attack on same family | source |
|---|---|---|---|---|---|---|---|
| toefl/choose_response | 129 | 33 | **25.6%** | 39 | 29.4% (n=126) | 94.3% (cr-v1), +1.4 over control (cr-v7) | a8 |
| sat/reading_writing | 120 | 7 | 5.8% | 31 | 26.4% (n=110) | 96.9-100% (C&S, I&I, EoI), 75% SEC | a8; memory |
| toefl/conversation | 71 | 2 | 2.8% | 15 | 18.6% (n=70) | 100% (Jul) / 86.8% | a8; REGISTER §1 |
| toefl/academic_passage | 67 | 3 | 4.5% | 10 | 27.6% (n=29) | 99.2-100% | a8 |
| toefl/academic_talk | 66 | 1 | 1.5% | 10 | 29.8% (n=47) | 100% | a8 |
| toefl/announcement | 40 | 0 | 0 | 4 | 27.5% (n=40) | 92.7-100% (83-94% later) | a8 |
| toefl/daily_life | 35 | 1 | 2.9% | 11 | 28.6% (n=35) | 100% | a8 |
| ssat/reading | 218 | **0** | 0 | 25 (2 H) | 23.4% (n=218, 5-choice) | 83.9% on draft 1 | a8; REGISTER l.357 |
| act/english | 152 | 1 | 0.7% | 3 | 25.7% (n=152) | 76-90% | a8; memory `act-shipped-b7` |
| act/reading | 44 | 0 | 0 | 1 | 20.5% (n=44) | 79-98%; shipped control 96.3% | a8; CLAUDE.md |
| act/science | 21 | 0 | 0 | 0 | 28.6% (n=21) | 71.7% cand / 88.9% shipped control | a8; CLAUDE.md |
| isee/reading | 36 | 0 | 0 | 9 | 33.3% (n=36) | — | a8 |
| map/reading | 24 | 0 | 0 | 1 | 20.8% (n=24) | CoE 96.3% vs his 1/5 | a8; memory |
| ssat/verbal | 20 | 0 | 0 | 0 | 20.0% (n=20) | n/a | a8 |

**His CR flag rate by batch:** cr-v1/v2 11/31 (35%), cr-v7 10/40 (25%) + 5/13 adjudication, cr-v10 3/20 (15%),
cr-v11 grader-cleared 0/8 (plus 3/5 on grader-flagged kept items), cr-v14 grader-cleared 1/12. **Everything
else since September: 1 hard flag in 595 items** (ACT English v7; CR since September: 7/45). **Model vs human on the shipped bank:** ACT
10% human vs 76-79% model (B7); announcements 15% vs 83-94%; SSAT reading 16.7% vs 83.9%; MAP CoE 1/5 vs 96.3%;
model-assisted rows entered through the human UI 79.4% vs 19.7% by hand. Eight-plus cohorts, all in the same
direction, by 55-80 points.

**Where his blind pick was above chance** (one reader beats the options): CR original 11/20 (55%), crv14-spot1
6/12 (50%), ISEE draft 1 12/36 (33%), SSAT d3 13/36 and d1-release 13/36 (36%, 5-choice). The first was a real
leak; the rest sit inside the noise of 12-36 items.

**Pace:** by week (Monday start) Aug 3: 72, Aug 10: 280, Aug 17: 53, Aug 24: 0, Aug 31: 60, Sep 7: 40, Sep 14: 45,
Sep 21: 0, Sep 28: 0, Oct 5: 132, Oct 12: 36, Oct 19: 327. **Mean 87/week over 12 weeks, median 53, three zero
weeks.** By month: Aug 405, Sep 145, Oct 495.

### 1.5 How often methods or briefs changed

From git (commit-subject classification, ~1,460 commits touching `scripts/study-bank`, `src/lib/study`,
`.claude/skills`; approximate), the 49 PREREG files and the ledger (352 batches).

Named method/construction shifts per family per month:

| family | Jun | Jul | Aug | Sep | Oct |
|---|---|---|---|---|---|
| SAT R&W | 1 | 3 | 2 | 3 | **~14** (SEC10-17 one rule each; SEC22-27 six constructions; WIC four-world; II23) |
| SAT Math | 1 | 2 | 2 | 2 | ~6 |
| ACT | – | – | – | 3 | ~4 (English v7-v9 stable; Reading/Science "draft route" Oct 22) |
| TOEFL Listening | 1 | 3 | 5 | 0 | ~5 (conv/talk drafts, cr-v14 strict-kill, cr-v16/v20) |
| TOEFL Reading | – | 1 | 1 | 1 | 1 (passage drafts Oct 22) |
| SSAT | – | – | 2 | 2 | **~10** (pilots 1-5, WV5-13, PD v1/v2, in-session drafts, agent drafts) |
| ISEE | – | – | 2 | 0 | 3 |
| MAP | – | – | – | – | ~8 (pilots 1-8, all failed; drafts) |

Other change signals: `AUTHORING-BRIEF.md` 27 revisions in September; the CR authoring brief is revised **every
batch** (crv14..crv21; plan §1.3); 49 pre-registrations, 46 of them in October; REGISTER §5 logged 62 findings in
August, 142 in September and 225 in October (one per ~2 hours of work in October).

---

## Part 2. Testing each assumption against the record

### 2.1 Stationarity — FAILS as designed

The plan assumes trust earned on past batches predicts the next batch, and exempts brief appends from a reset.

**What the record shows:**

- **An unchanged brief is not stable.** cr-v4's brief re-run exactly (cr-v6, fresh scenarios): +22.2 then +47.2
  (n=36 each). The REGISTER conclusion: "cr-v4's +22.2 was a draw, not a method."
- **Every repair brief installed a new tell**: CR v3→v6, ACT English round 1→2→3 ("the third brief made the third
  tell", 528523e6), WIC round 2 (0/16 shipped), SSAT verbal s4 (80%, "the brief caused it"), SAT top-up (+40.5
  despite naming known tells). CLAUDE.md states it as a law: "a batch built to one brief develops a cross-item
  tell".
- **A method change moved defect rates by tens of points in both directions**: WIC20→WIC23 (cloning the method)
  E -6.6 → +17.0; WIC24→WIC25 (four-world) +12.3 → -8.2; II21→II22 -69.4 → -44.4 (2x2 banned); SEC26→SEC27 template
  holds 19/40 → 11/40 and probe hard reads 11/80 → 21/80. SEC26 vs SEC27 is an improvement, but SEC26 itself
  showed the trap: its new check (tell simulation) passed every bar and the readers still found templates "that
  live in words".
- **The co-founder-side evidence is from a different method than the one in the queue.** Every queued stratum
  changed method on Oct 20-22: SSAT reading went from in-session (d1-d4, 180 items sat) to agents (d5-d18, 6 items
  sat). ISEE reading from in-session d1 (36 sat) to agents (0 sat). ACT reading/science to the "draft route" (0
  sat). TOEFL passage, talk d2-d7, conv d2: new, 0 sat. CR: four-world method stable since Aug 17, but the brief
  changed every batch and was tuned to the grader's drops, and his rate on grader-cleared items (1/20) is not the
  grader's rate.
- **Authors converge on one template inside a revision round** whatever the method (WIC28, SEC26, SEC27; git
  agent finding). That is a within-batch non-stationarity a per-item sample is not designed to see.

**Should trust reset on every brief change? Yes, partially.** The record has no case of a brief change that was
provably neutral, and many where it was not. But a full reset on every brief edit would freeze every stratum at
L1, because briefs change every 2-10 days. The workable compromise is a **bridge spot**: any brief, construction or
author-type change sends the next batch to an L1 spot (12 items) regardless of level; old evidence carries at
w = 0.5 only once that spot is clean, and drops to w = 0 if it is not.

**How long would a stratum stay at a level?** To hold L2 a stratum needs >= 45 current-method items at x = 0. At
his mean pace spread over the ~9 strata in the queue (~10 items per stratum per week), that is ~4.5 weeks of an
unchanged method. In October no family went 4.5 weeks without a method change. Under the plan's literal rule
(brief appends exempt) CR could hold; under the bridge rule it would hold only if its brief stops changing every
batch. **Expect strata to sit at L1 most of the time unless authoring is deliberately frozen once a stratum is
promoted** — which is itself a recommendation: promotion should freeze the brief.

### 2.2 Data volume — L2 is reachable, L3 is not on his pace

| | value | source |
|---|---|---|
| items he has reviewed | 1,045 (997 unique items in the plan's count) | `study_item_reviews` |
| span / active days | 81 days / 23 days | a7 |
| pace | mean 87/week, median 53, max 327 (Oct 19 week), three zero weeks | a7 |
| staged verbal items waiting | **3,933** (created mostly Oct 20-23) | a13 |
| queue entries / items to sit under Amendment 1 | 89 / 1,116 | `cofounder-queue.json` |
| plan's projection for the open queue | 810-1,260 items | plan §4 |

**Items needed per stratum** (CP90): L1 11 (x=0) / 18 (x=1); L2 45 / 77; L3 114 / 194 / 265 (x=0/1/2).
**Current-method items he has sat with w=1:** CR 20 (x=1), SSAT reading agent 6, conv draft-1 48 (x=2), talk
draft-1 12, ACT English v7-v9 132 (x=1, but no new batches queued), everything else 0.

**Time to level at his historical pace** (mean 87/week; queue spread over ~9 strata; zero further defects; no
method change; the plan's own per-stratum totals from §4):

| target | his items needed (all 9 queued strata) | at mean 87/week | at median 53/week |
|---|---|---|---|
| all queued strata at L1 | ~9 x 12 = 108 (+ L0 sittings for act/science, ssat/verbal, toefl/passage: ~100) | ~2.5 weeks | ~4 weeks |
| L2 (U <= 5%, 3 clean L1 spots) | ~45-77 each, ~500-700 total | ~6-8 weeks | ~10-13 weeks |
| L3 (plan §4, best case) | 1,155 total (90-222 each) | ~13 weeks | ~22 weeks |

Each defect adds ~6 L1 batches (~72 items) to its stratum (plan §4). With the observed post-screen rates (CR
1/20, conv 2/48), CR and conversation never reach L3, which the plan already concedes. **Add the method changes of
2.1, and the realistic L3 date for even the cleanest queued stratum is February 2027 or later.** The saving that is
real and near is L0→L1: the 36-150 item full sitting becomes a 12-item spot.

### 2.3 Ground truth — reliable for exclusivity in CR, not a complete standard elsewhere

What supports him as ground truth:
- He does not read tells: his blind picks sit at chance where models score 76-100% (Part 1.4), so his "only
  defensible" is not contaminated by option-set guessing.
- He is self-consistent where measurable: the 3 items he sat twice got the same verdict (n=3, too small to rate).

What undermines it:
- **His verdict misses what his notes catch.** Outside Choose a Response he has hard-flagged 1 item in 595 since
  September 1, yet the only release-stopping defects since September came from his notes on items he marked
  "only defensible" (2 SSAT d3, 2 conv v6). A verdict-only U would put SSAT reading at L3 today (0/218, U = 1.1%).
  So U is only meaningful if notes are classified, and the plan's H classification needs the owner every time.
- **Inter-rater agreement is unknown and the one sample disagrees.** On 29 items overlapping another human,
  verdicts agreed on 25; **all 4 disagreements were his CR flags that the second reviewer passed** (run
  `choose-a-response-2026-08-05-mirror`). One human standard, never replicated, is being turned into a rate with a
  2% bound.
- **He misses things too**: the flyer item pickable from the stem in a cohort that passed his sitting (REGISTER
  l.1852); the Biology 102 item keyed backwards was found by repair work, not a sitting (l.1851). His notes say
  "lucky guess" on items whose options copy the passage (plan §2 type 17) without flagging them.
- **His channel can be model-assisted.** 40 rows from his account are `model_assisted` (two August runs, 79.4%
  vs 19.7% by hand). They were caught only because the score was implausible; nothing structural stops it.
- **Drift is possible and unmeasured.** His CR flag rate fell 35% → 25% → 15% over unscreened batches. That is
  consistent with better authoring, with a changing standard, or with fatigue; no repeat-item sample exists to
  separate them.
- **TOEFL MC (memory `toefl-mc-bank-guessable`, corrected 2026-08-19):** humans at chance on 4 of 5 types (15-31%)
  where the model read 93-100%. This makes him the right instrument for "can a person shortcut it", but it also
  means the blind half of the AI gate is invalid on those families, so the only remaining automated gate there is
  the with-source grader, whose non-CR recall is 0/6.
- **The same memory leaves open that coached Korean students may exploit taught tells (eliminate absolutes,
  prefer the hedged option) better than he does.** His blind score is not a student's.

**Conclusion:** he is a reliable judge of second answers in Choose a Response and a good but incomplete detector
elsewhere, and only when his notes are read. A 2% bound computed against a single, unreplicated human is not a
2% risk. That is the argument for a second reviewer on a fraction of runs before any L3.

### 2.4 Can the four new checks catch the defects that actually occurred?

| real case | n | fact | consistency | naturalness | batch pattern | judgment |
|---|---|---|---|---|---|---|
| Offside judged on the forward's own kick (SSAT d3) | 1 passage | **likely** — the rule is standard knowledge; the in-session author's check verified science but never looked at sport | — | — | — | Plausible catch. The model had the knowledge and did not apply it unasked; a pass that lists every checkable claim targets exactly that gap. Unvalidated (1 fixture). |
| Goldfish "origin a mystery" vs "invented to justify" (SSAT d3) | 1 | — | **likely** | — | — | Explicit sentence-level contradiction; models catch these when asked. The grader brief told readers to accept small logic gaps, which is why it passed. |
| v6-04 / v6-12 transcripts contradict themselves (conv) | 2 | — | **likely** (request-handling rule; winter gowns) | — | — | Same shape. Watch for over-flagging on dialogue, where speakers legitimately correct themselves. |
| No contractions, scripted speech (26/48 rated artificial) | 6 sets | — | — | **near-certain** | — | Countable by a regex (contraction rate per turn). The model check is overkill for the core of it; gender/label issues need the model. |
| Identical key prose across 8 lectures (32 items) | 1 batch | — | — | — | **likely** | This is lexical, not semantic: n-gram overlap across keys would flag it, and a model reading all keys side by side should too. |
| SEC26/SEC27 word-level templates ("since" means perfect; time word settles tense) | 19 + 11 held | — | — | — | **partial** | The probe readers and graders (model readers) did find them, after the scripted checks passed. So a model reader can see cross-item templates; but SEC27's dedicated semantic check also passed all bars and 11/40 were still held. |
| Second answer outside CR (TOEFL rd/lis, SAT, ACT) | 6 rejects | — | — | — | — | **Not addressed.** Grader recall 0/6. No new check targets it. |
| Imprecise key / easy distractors / odd-one-out (12 + 19 + 15 notes) | 46 | — | — | — | partial for odd-one-out | Quality defects; no check proposed. |

**Does "cheap proxies for semantic tells failed five times" doom the batch-pattern check?** No, with a caveat. The
five failures were *scripts* measuring one surface feature per item for a tell that lives in meaning. The
batch-pattern check is a *model reader* given all keys at once and asked to name a shared shape, which is the
instrument that actually found the SEC26/SEC27 templates, the 2x2 and "group G" templates (II21), and the
identical key prose. The caveats are real: (a) the readers, authors and graders are one model family, and the
three-solver data shows one model sampled three times shares priors it cannot introspect (pairwise agreement
68-72% vs 27-36% if independent) — a template the author model finds natural is the one its twin is least likely
to call a template; (b) SEC27's dedicated template check passed all bars and still let 11 template items through
to the panel. So expect the batch check to catch lexical and obvious structural templates (identical prose,
reused attitude sets, ABCD permutations) and to miss some semantic ones. It should be a screen, never a release
criterion.

**Net:** the four checks target 9 of the 160 note records (types 8, 12, 16 plus the template case) but cover
the **4 H records that actually stopped releases**. They leave untouched the largest reject class outside CR
(second answer, 0/6 recall). Each check's recall is currently n = 1-3 real cases; the plan's own fixture gate
(>= 80% recall, or planted >= 90% on 10) cannot be satisfied with real fixtures for months.

### 2.5 Silent-failure risk — high, and it applies to the tracker itself

Of the 43 recorded passing-but-wrong checks, **at least 17 returned a confident result on bad or unread input**
(cases 2, 3, 5, 7, 10, 14, 16, 17, 18, 23, 24, 27, 30, 33, 37, 38, 43; 22 if case 17's six checkers count
separately; plus the 33 orphan items archived on a truncated export): truncated
reads (1,000-row cap, four separate times including the student assembler), controls hardcoded or unreachable,
mislabelled human rows, a biased shuffler reported as an item defect, a floor stored as a measurement. **None was
caught by reading its verdict**; each was caught by someone noticing a count did not match.

Implications for the trust tracker (`autonomy-state.mjs`):
- It joins three fragile inputs: reviews (1,000-row cap, stale-row semantics), grade packets (no bank ids;
  matched by prompt + sorted choices) and note classifications (a human step). **The plan's own mapping already
  drops a biased subset**: the 63 unmatched packet items were the grader-flagged ones that were dropped or
  rewritten. A tracker that silently ignores unmatched items computes U on survivors.
- It promotes on the *absence* of defects, which is exactly the output a broken input produces (an empty join
  reads as 0/n).
- Parameters have already moved under pressure: Amendment 2 relaxed the blind guard a day after it fired.
  Amendments that relax must reset evidence, as the plan already says for grader briefs; extend it to the release
  rules themselves.

So: the tracker must print every denominator, refuse on any unmapped item, missing grade file or unclassified
note, ship with break tests (planted defect demotes; missing file exits non-zero; an all-zero join refuses), and
be re-derived from scratch weekly by `bank-state.mjs`, not cached.

### 2.6 Student signal — none usable for 6-12+ months

- **Real students:** 16 accounts with attempts and 17 with any session after excluding `study_test_accounts`
  (a12). The runout monitor counts registered real accounts (the brief's ~80); only ~16-17 have used the study
  product.
- **Real attempts:** 6,182 since August (Aug 1,360, Sep 2,773, Oct 2,049 to date); the calibration view counts
  5,924 attempts across 3,178 items. **No item has 10 attempts; the maximum is 7** (`study_item_calibration`,
  a10/a11). 7,200 of 10,378 calibration rows have zero.
- **Rate for a new batch:** SSAT reading, the most-used reading family, averaged ~3 attempts per item over ~2
  months (398 attempts, 134 items). At that rate a newly released item reaches the plan's 30-attempt trigger in
  roughly 1.5-2 years; even concentrated traffic on a new batch puts it at 6-12 months. Point-biserial at n=30 is
  also noisy for single-item decisions.
- The memory note `attempts-data-contaminated` (July: 100% internal) is superseded: real attempts now exist, and
  the infrastructure (`item_id`, test-account view, first-seen exposure) is in place. The volume is the blocker.

**Implication:** no post-release safety net exists for L3 in the plan's timeframe. Student data can serve as a
weak aggregate signal (cohort-level p-values pooled across a batch) much sooner than as an item-level one, and
that is worth building, but not as a reason to release without a human.

---

## Part 3. Verdict and changes

### Verdict: workable with specific changes, capped at L2 until the ground truth widens

The algorithm's statistics are correct and conservative where they apply (CP bounds, double sampling, risk
sampling with an unbiased half). The failure is in its inputs: a non-stationary authoring process, one
unreplicated human whose real standard lives in free-text notes, new checks with 1-3 real validation cases, and
no student signal.

### Changes, in priority order

1. **Reset rule.** Delete "appending a rule to a brief is not a new method." Define a version as (authoring brief
   sha, construction, author type: in-session / agent / model). Any version change: the next batch gets an L1
   spot at any level; prior evidence carries at w = 0.5 only after that spot is clean, w = 0 if not. Promotion to
   L2 freezes the authoring brief for that stratum; edits to it are batched and introduced through a bridge spot.
2. **L2 cap.** No L3 until (a) a second independent human reviews >= 20% of runs (or >= 1 run per stratum per
   month) and his-vs-them agreement on verdict and on H notes is measured (kappa on >= 50 shared items), or real
   student data reaches >= 30 non-internal attempts on a random audit sample; and (b) each H-check (fact,
   consistency, naturalness, batch pattern) has >= 10 real fixtures with recall >= 80%. Planted fixtures do not
   count toward (b).
3. **Notes are the signal.** A reading/listening stratum cannot be promoted on verdicts alone; every note is
   classified (two agents blind + owner for H) before U is computed, and U refuses if any note in the window is
   unclassified. Add "imprecise key" and "second answer outside CR" as explicit grader-brief targets, because
   non-CR recall is 0/6 and no new check covers it.
4. **Tracker hygiene** (Part 2.5): refuse on unmapped packet items (count them as flagged, not missing), write bank
   ids into `index.json`, refuse on an empty join, break-test each rule, and treat any relaxation of a release
   rule as an evidence reset.
5. **Per-family ceilings.**
   - **Never autonomous on current evidence:** TOEFL Choose a Response (live 1/20 post-screen; 15-35% unscreened;
     brief tuned to the grader), TOEFL Conversation (2 H/48; naturalness and consistency defects), SSAT/ISEE
     reading and MAP comprehension (three stopped agent rounds; factual/logic defects; blind instrument invalid),
     ACT Science (real-world science facts; blind instrument invalid; still hidden).
   - **L2 candidates once a method is frozen:** ACT English, ACT Reading, TOEFL Talk, TOEFL Passage, SSAT verbal.
   - **Already autonomous in practice, and should be audited first:** SAT R&W and SSAT/ISEE verbal release on AI
     gates with ~0-8% ever human-sat. Point the plan's L3 audit (4% random, >= 6 per stratum per 2 weeks) at them
     now; it is the only way to learn the real post-release miss rate of AI-only gating.
6. **Spend his time on information, not volume.** At ~87 items a week, the 3,933 staged items cannot all be
   sat. Pause new agent drafts in strata whose last batch is unsat (SSAT reading has 14 agent batches and 6 items
   of evidence), so his sittings measure a method before it changes.
7. **Start the cohort-level student signal now** (pooled p-values per batch versus the stratum, non-internal
   accounts, first exposure only). It will not support item decisions for a year, but it is the only
   independent instrument on the horizon.

### Realistic timeline (with changes 1-6)

| milestone | when | assumptions |
|---|---|---|
| every queued stratum at L1 (spot route) | ~3-5 weeks | his mean pace; L0 sittings for act/science, ssat/verbal, toefl/passage |
| first strata at L2 | mid-December 2026 | ACT English (needs new batches), ACT Reading, TOEFL Talk, SSAT verbal; methods frozen; zero defects in 3 spots |
| second reviewer agreement measured | 4-8 weeks after a second reviewer starts | ~50 shared items |
| first L3 eligible | Q1 2027 at the earliest | changes 1-3 met; 114+ current-method items at x=0; audits clean |
| CR / conversation | L1 indefinitely | observed miss rates 5% and 4% |

### Residual risk

- **At L1/L2**, a released batch can carry defects at up to the U bound (<= 20% at L1, <= 5% at L2) in classes
  the screen is blind to: factual, internal consistency, and second answers outside CR. A 12-item spot catches a
  batch at >= 20% defects with 93% probability and a batch at 5% only 46% of the time.
- **Correlated misses**: authors, graders, probe readers and the new H-checks are one model family; the three
  "independent" solvers behave as one. A defect class the model does not perceive will pass every AI layer at once.
- **One human standard.** Until a second reviewer exists, "his rate" is the definition of quality, and his own
  misses (flyer, key-backwards) and drift are invisible.
- **Unmeasured AI-only releases.** ~1,300 (October alone) SAT R&W and SSAT/ISEE verbal items are already live on AI gates with no
  post-release sample. That is the largest current exposure, and the plan's audit would be the first measurement.

---

## Sources and queries

- Plan: `scripts/study-bank/AUTONOMY-ALGORITHM-2026-10-23.md` (§1.1 recall table, §1.2 flag table, §2 note
  taxonomy, §3.2 n table, §4 projection).
- Rules in force: `scripts/study-bank/COFOUNDER-GRADER-2026-10-22.PREREG.md` (Result; Amendments 1, 2);
  `scripts/study-bank/cofounder-queue.json` (89 entries, 1,116 items).
- REGISTER: §0 CR table (l.38-66), §1 cohort table (l.67-150), §5 entries cited by line; l.194, 235, 247, 248,
  256, 258, 260, 262, 290, 291, 357, 1225, 1847-1852, 1887, 4950, 5963-5964.
- Ledger: `scripts/study-bank/ledger.json` (352 batches; SEC22-27 notes).
- PREREG-SEC26/27, PREREG-* (49 files), summarized from git.
- CLAUDE.md sections: Verification standard; bank-state.mjs; every corollary.
- Memory: `toefl-mc-bank-guessable`, `act-shipped-b7`, `attempts-data-contaminated`, `agent-rewrite-inverts-tell`,
  `ssat-reading-agent-authoring-stopped`, `agent-reading-comprehension-limit`, `cofounder-reviews-only`.
- DB (read-only, paged by id, service key):
  - `node scripts/study-bank/bank-state.mjs sittings` (1,125 review rows: 1,043 fresh, 82 stale).
  - `study_item_bank` select id, family, section, cohort, verified, archived, verify_meta, source, created_at,
    item->>listeningTask, item->>readingTask (16,091 rows) → method/cohort/archive tables (a2-a5, a13).
  - `study_item_reviews` all columns (1,125 rows) → per-run, per-stratum, pace, repeats, cross-reviewer (a6-a8).
  - `study_item_calibration` (10,378 rows) → attempts per item (a10, a11).
  - `study_sessions` + `study_attempts` minus `study_test_accounts` → real students and attempts by month (a12).
