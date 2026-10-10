# SSAT Upper Reading batch WV13 (2026-10-11): pre-registration

Committed **alone, before any WV13 author runs.** The result goes in `READING-BATCH-WV13-2026-10-11.md`.
Every new rule below was break-tested before this commit; the break-test artefacts are committed with it.

## The owner's decision (via the coordinator)

Keep authoring SSAT reading fully by AI with the WV6 method, the only agent method a human has passed
(co-founder, 2026-10-10, `ssat-wv6-cofounder-2026-10-07`, `reviewer_kind='human'`: 12/12 "only
defensible"; blind 3/12 = 25.0% against a 25.0% control). `bank-state.mjs` (2026-10-11): SSAT Reading 150
drawable; one open run, `act-en9-cofounder-2026-10-10` (40 of 40 unseen), so no new sitting can be drawn.

## What WV11 and WV12 showed, and what WV13 changes

- **Attitude passed its pre-check.** WV12's author/narrator form with two licensing sentences: 14/15 in round
  0, 15/15 after one fix. The character-action form: 15/15 (WV11) and 5/5 (WV12) in round 0. **WV13 keeps the
  author form, unchanged, in 4 of 5 units; character action in at most one (P05).**
- **The binding failure is the vocabulary sense pre-check** (6 of 7 sets refused in round 0), for three
  reasons, each with a WV13 fix:

| WV11/WV12 failure | example | WV13 fix |
|---|---|---|
| fresh judges flip on IDENTICAL sets | WV12 P01 "struck", P02 "pitch" refused after the fix round on pairs that had not changed | the same two judge sessions throughout; a fix round re-judges only pairs with a changed gloss |
| real overlaps in a new gloss | WV12 P04 "bank" = "store of supplies"; WV10 "raised" hoisted/reared | unchanged: both-judge refusal, now by judges who keep their own earlier calls |
| a fixer re-keyed another version | WV12 P03 v4 | `fixguard` scope rule + the fixer prompt; R7; licensing re-run on every changed unit |
| two authors picked the brief's example word | "pitch" (WV11 x2) | no example headword in the brief; five disjoint assigned headword lists |

## Design

### 1. Attitude (unchanged from WV12)

- Author/narrator attitude toward a subject named in the stem, licensed by >= 2 separate sentences in every
  version (`why` + `why2`; R3, R5), in non-fiction or reflective passages. P01-P04 are author form.
- P05 is the one character-action unit (WV11 frames, full-sentence action). R8 (new, mechanical) refuses a
  check call with more than one character-form unit.
- Kept: full-sentence action, no irony or teasing (WV12 licensing prompt, verbatim), irony words refused (R4),
  varied stems (one frame per unit; no two units share an attitude or a vocabulary frame).

### 2. Vocabulary sense check: same judges, re-judge only what changed (`ssat-wv13-senses.mjs`)

- **Two persistent judge sessions, SJ-A and SJ-B**, spawned once for round 0 and **resumed** (SendMessage) for
  the fix round, never respawned. `merge` refuses if a round's judge ids differ from the previous round's.
- **Round 0:** every pair of every set (10 per set), prompt = WV11's `SENSE-PROMPT.md`, verbatim, paths changed,
  plus "open only this file, no web, no other repository file".
- **Fix round:** `build --prev` asks only pairs in which at least one gloss TEXT changed (pairs are matched by
  their two gloss texts within one question and headword, so reordering re-asks nothing and any edit re-asks
  that gloss's pairs). Every other pair keeps BOTH judges' round-0 verdicts. Ratings a judge gives to a pair it
  was not asked are ignored and listed. Fixed resume prompt (below).
- **Refusal unchanged:** a set is refused if any pair is "overlap" by BOTH judges (`ssat-wv.mjs verify --senses
  <round>/merged`, the WV11 code path, untouched).
- **If a judge session cannot be resumed:** both judges are replaced and every pair of every set is re-judged by
  the new pair (WV12's procedure), recorded as a deviation. No other substitute.

**Why this is not a quiet loosening.**
1. Refusal still needs both judges, as in WV11/WV12.
2. Every pair is judged by both judges once. That is exactly the scrutiny WV11/WV12 gave a unit that needed no
   fix. Under WV12 a unit sent to the fix round for an unrelated kill quote got its unchanged pairs re-judged
   by fresh judges, a second chance to be refused for something it was never asked to fix; how strict the
   check was depended on an unrelated defect.
3. Real overlaps are still caught, by the same judges, in the break test below: "raised" hoisted/reared, and
   WV12 P04's new "store of supplies" against row of objects AND financial firm (the two pairs WV12 refused).
4. **What it does give up, stated:** a pair passed in round 0 by one judge's "distinct" is not asked again. If
   that call was a miss, WV13 will not catch it in the fix round. The vocabulary item is still checked in
   context afterwards: per-version licensing (both judges must pick gloss k in version k and name no second
   sense), Stage 1 C (exclusivity, two fresh graders), and the co-founder sitting.

**Break test (run before this commit; `ssat-wv13-batch/breaktest-senses/`; two fresh sessions BT-A/BT-B,
resumed for round 1):** round 0 = WV12's round-0 sets plus WV10-P02's "raised"; round 1 = WV12's round-1
sets, 15 changed pairs asked, 35 carried.

| set | WV12 (fresh judges each round) | WV13 procedure, round 0 (all pairs) | WV13 procedure, round 1 |
|---|---|---|---|
| WV10 "raised" | refused (WV11 break test) | **refused**: hoisted/reared, hoisted/increased, mentioned/increased, increased/collected (both) | unchanged, carried: **refused** |
| P01 "struck" (unchanged) | r0 pass; **r1 refused** (crashed into/occurred to) | pass (0-3 one judge) | **nothing asked; carried: pass** |
| P02 "pitch" (sales talk -> selling spot) | r0 refused; **r1 refused on musical tone/steepness, an unchanged pair** | refused: sales talk/musical tone (both) | 4 pairs asked, all distinct; musical tone/steepness carried (distinct, distinct): **pass** |
| P03 "pitch" (glosses 0 and 2 changed) | r0 refused; r1 refused mechanically (not sense-judged) | refused: tone of voice/speech to persuade | 7 pairs asked: **refused**, highness of a sound/speech to persuade and tar/slope of a roof (both) |
| P04 "bank" (mass of cloud -> store of supplies) | r0 refused; **r1 refused**, store/row and store/financial firm | refused: mass of cloud/edge of a river | 4 pairs asked: **refused, store/row and store/financial firm (both)** |

- All three required outcomes hold: "bank" = "store of supplies" refused; "raised" hoisted/reared refused; an
  unchanged set cannot change verdict (P01 kept round 0's pass; `--selftest` also feeds an all-overlap re-rating
  of an unchanged set by both judges and the verdict stays exactly the round-0 one, 20 ratings ignored).
- The procedure changes the WV12 outcome on exactly two sets, P01 and P02, and both changes are on pairs whose
  glosses did not change: the noise case the owner named. On every changed gloss it agrees with WV12.
- Round 0 reproduced WV12's round-0 set verdicts exactly (P01 pass; P02, P03, P04 refused).
- `node ssat-wv13-senses.mjs --selftest` 21/21. **Mutations** (scratch copies): carrying by question instead of by
  gloss text fails 1 case; re-judging unchanged pairs fails 2; either-judge refusal fails 3; no judge-identity
  check fails 1. A wrong judge id on the real round 1 refuses (exit 2).
- `verify --senses` on WV12's round-1 units with the round-1 merged state: P01 and P02 sense-clean; P03 and P04
  refused on exactly the pairs above. WV12's own files still give WV12's verdicts (46 problems, the same three
  sense refusals): older ids are unchanged.

### 3. Vocabulary authoring

- **No example headword in the brief** (`SSAT-WV13-AUTHOR-BRIEF.md`; WV12's "pitch" example and its near-sense
  examples removed; a scan of the brief finds no listed or earlier headword used as an example).
- **Five disjoint headword lists** (`ssat-wv13-rules.mjs HEADWORDS`), each word with four or more clearly separate
  senses of the kind a learner's dictionary lists, none an earlier WV vocabulary word (bank, break, carried,
  charge, cover, draft, drew, fair, figure, fixed, held, kept, pitch, raised, ran, set, settled, stand, struck).
  Each author is given ONLY its own list, in its prompt.

| unit | list |
|---|---|
| P01 | trunk, bolt, bill, scale, range, cell |
| P02 | spring, bar, plot, seal, file, tip |
| P03 | post, board, plant, stock, club, deck |
| P04 | jam, row, volume, mint, ring, lodge |
| P05 | capital, match, note, train, court, suit |

- **R6** headword on the unit's list. **R7** the stem names paragraph N; the headword is in paragraph N of every
  version; version k's vocabulary `why` is a verbatim span of paragraph N containing the headword.
- **`fixguard <pre> <post> <PROBLEMS>`** after every fix: version k's vocabulary sentence may change only if a
  PROBLEM line names that question's version k or quotes gloss k, or gloss k itself changed; gloss j may change
  only if a PROBLEM line quotes it or names version j. A fixer may not touch another version's sense.
  **That every version still keys its own gloss** is then enforced by `verify` (support for version k keys
  choice k and kills the other four, verbatim), R7, and the licensing judges, re-run on every changed unit
  (both must pick gloss k in version k, no second sense).
- **Break tests:** `node ssat-wv13-rules.mjs --selftest` 17/17 (lists disjoint and new; R6 refuses another list's
  word and "pitch"; R7 refuses a wrong paragraph in all 5 versions, a why without the headword, a why from
  another paragraph; R8; fixguard refuses a re-key of an unnamed version, an unnamed gloss change, a clarifying
  edit to an unnamed version, a deleted headword, and passes a named gloss swap with its own sentence).
  Mutations: dropping the list check fails 2, the sentence guard 2, the gloss guard 1, the paragraph rule 1.
  **On WV12's real fixes:** P01, P02 OK; P04 refused (its fixer edited v4's "financial firm" sentence, which no
  PROBLEM named: a harmless clarification that WV13 does not allow); **P03 passes fixguard** because its PROBLEM
  lines quoted gloss 4, so the v4 rewrite was in scope. P03's re-key is refused by `verify` (v4 "kills its own
  choice", "kill for choice 2 missing"), as it was in WV12. fixguard limits WHERE a fixer may edit; it cannot
  read meaning, so it is not the check that a version still keys its gloss.

### 4. Everything else as WV6/WV12

- Five-version method; one question of each of the six kinds; seed formula `k = sha256("ssat-wv-2026-10-06|" +
  frozenSha + "|" + passage_id)[0:8] mod 5` after a freeze commit, never re-rolled.
- Stage 0 pre-flight per unit: `ssat-wv.mjs verify` (WV12 branch, now WV12|WV13 ids; one new WV13-only vocabulary
  phrasing `in-para` from a live SSAT stem, "In the third paragraph, \"moved\" most nearly means", so five units
  have five phrasings; WV11/WV12 ids unchanged) + `ssat-wv12-rules.mjs check` (R1-R5, now WV12|WV13 ids) +
  `ssat-wv13-rules.mjs check` + A1 (two fresh judges) + licensing (WV12 prompt verbatim, two fresh judges per
  version file) + senses (persistent judges). One fix round with fresh fixers (PROBLEM lines + brief only).
  Any edit to passage text or a choice makes that unit's A1 and licensing stale: re-run fresh on the changed
  unit, as WV12. A unit still refused after the fix round fails stage 0.
- Grouped screen (three fresh samples; pilot 4 prompt): refuse a unit if any version receives >= 8/18 picks. No
  repair after it.
- **The batch is the first THREE units by id that pass all of pre-flight. P05 is used only if needed.** Spares
  stay on file, never used. With fewer than three passing units, stage 0 fails and the batch stops.
- Stages, stop at the first deciding failure: Stage 1 C+F+Q (two fresh graders, `misread/prompts.md` §8
  verbatim, path changed; `reading-cal.mjs wv5 <dir> ws 18`); Stage 2 E (two fresh judges, SSAT pilot 3's
  neutral prompt, count set to 10: 3 candidates + Stage A's 7 live passages; `score --nat3`); Stage 3 A (the 15
  non-vocabulary candidates among the 48 live control items; three fresh samples, pilot 4 prompt;
  `reading-cal.mjs wv5 <dir> iso`); Stage 4 B (`grp-1..3.json`, three fresh samples; `score --grp`).

| bar | live (Stage A) | candidate bar (`node reading-cal.mjs relbars 18`) | status |
|---|---|---|---|
| C exclusivity | 33/33 | **>= 17/18** | deciding |
| Q distractor >= plausible | 16/264 = 6.1% | **>= 7/144** | deciding |
| dead-by-both | 15/33 = 45.5% | **<= 10/18** | deciding |
| E naturalness | same judges, 7 live passages | candidate median **>=** live median; INVALID if live median 1 | deciding |
| A options-only isolated | in-run control, 48 live items | **<= control + 10 pts**; INVALID unless control 10-45% | deciding |
| B options-only grouped | n/a | **<= 40%** (<= 21/54) | deciding |
| F easy, pilot-pass | 32/33, 1/33 | <= 18/18, >= 0/18 | reported only (cannot fail at n = 18) |

**Reachability (the ceiling rule).** C passes at 17-18 and fails at <= 16. Q passes at >= 7 of 144 and fails at
<= 6. Dead-by-both fails at >= 11. E: if the live median is 1 the bar cannot fail (INVALID, pre-declared); at a
live median of 5 the candidate can still meet it (a pooled median of 5), so both outcomes stay reachable. A: the
control's attainable range is 0-100% but the bar is only valid at 10-45% (earlier in-run controls 23.6-29.9%);
there the pass line is 20-55%, inside the candidate's 0-100% over 45 picks, with both outcomes reachable and at
least 45 points of headroom above it. B: 0-100% over 54 picks, line at 40%. The grouped screen: 0-18 per
version, limit 7.

**The attitude stop rule (WV10-WV12, kept):** a post-draw Stage 1 grader who picks off key, or names a second
answer, on ANY attitude item stops the batch: nothing is inserted, even if C clears 17/18.

### 5. Size, units, topics

Five units of six items; the batch is the first three that clear pre-flight. Genres and topics new to every WV
batch (WV1-WV12 used narrative fiction, science/community/history features, memoir, biographical sketch, arts
feature, reflective essay, nature piece):

| unit | genre | topic | attitude form | attitude frame | vocabulary frame |
|---|---|---|---|---|---|
| WV13-P01 | travel essay | a narrow-gauge railway climbing to a mountain village | author | `attitude-best` | `as-used` |
| WV13-P02 | review essay | an architecture critic on a town's rebuilt open-air swimming pool | author | `regard` | `closest` |
| WV13-P03 | opinion essay (newspaper column) | a city painting its grey footbridges in bright colours | author | `conveys` | `likely-means` |
| WV13-P04 | sports essay | a village's annual uphill bicycle race | author | `feeling-best` | `context` |
| WV13-P05 | diary fiction | a teenager repairing an old typewriter for a letter-writing contest | character | `which` | `in-para` |

Every frame differs, so any three units satisfy the variety rule.

## Fixed prompts (all agents: open only the named file(s), no web access, no other repository file)

- **Author** (fresh, at most three at once): "You are writing unit WV13-P0n of an SSAT Upper Level reading batch.
  Open only `<scratch>/authors/P0n/BRIEF.md` (a copy of `SSAT-WV13-AUTHOR-BRIEF.md`) and follow it exactly.
  Your unit is WV13-P0n (its row in 'Your unit'). Your vocabulary headword list: <the unit's six words>. Write
  the unit as JSON to `<scratch>/authors/P0n/WV13-P0n.wv.json`. Do not open any other file, any repository
  file, or any web page, and do not run any script in the repository. At the end, state which files you
  opened."
- **Fixer** (fresh, one round): "Open only `<scratch>/fixers/P0n/BRIEF.md` and
  `<scratch>/fixers/P0n/WV13-P0n.in.wv.json`. A mechanical checker and two reader panels refused this unit for
  the PROBLEM lines below. Fix every PROBLEM with the smallest change that satisfies the brief; when a quote
  must contain a choice's word, use the exact listed word. Do not change anything a PROBLEM does not require.
  **Vocabulary question: in version k, the sentence using the headword must keep meaning gloss k. Do not edit
  any version's vocabulary sentence, nor any gloss, unless a PROBLEM line names that version of the vocabulary
  question or quotes that gloss. If you replace gloss j, rewrite only version j's vocabulary sentence (and its
  support) so that it means the new gloss j and nothing else.** Your headword list is: <list> (keep the same
  headword). Write the whole fixed unit to `<scratch>/fixers/P0n/WV13-P0n.wv.json`. Do not open any other
  file, any repository file, or any web page. At the end, list what you changed and which files you opened.
  PROBLEM lines: <verbatim>"
- **Sense judges, round 0:** `SENSE-PROMPT.md` verbatim (paths changed), opened with "You will be asked for more
  than one round of judgements in this session; answer each round only from the file named in it."
- **Sense judges, fix round (SendMessage to the same session):** "Round 1 of your sense-overlap judgements. Same
  instructions as round 0. Open only `<file>`. Some glosses have been revised since round 0. Each entry lists
  all five current glosses, but rate ONLY the pairs listed for that entry: every other pair of these sets keeps
  your earlier rating and is not asked again. [definition as round 0] Return JSON ... to `<out>`. Do not open
  any other file, in the repository or anywhere else, and no web page; do not run any script. At the end,
  state which files you opened." (as sent in the break test)
- A1, licensing, grouped screen, Stage 1-4, consistency: the WV12 prereg's prompts, verbatim, paths changed.

## REPORT-ONLY: the consistency channel (`ssat-wv-consistency.mjs`; never a gate)

As WV12: after the renders are committed, two fresh judges rate KK / DX / DS pairs for the 3 drawn units, the
48 live control items and PD pilot v2 (reference). Reported: fit rates, KK - DX per population, candidate
KK - DS. It never changes a verdict, a drop or an insert. If the batch stops before a draw, it is run on the
units that completed stage 0 with WV12's pseudo-draw, stated as a deviation.

## Order

1. This prereg, committed alone. 2. Authors; stage 0; fix round; grouped screen. 3. **Freeze commit** (the three
batch units, `ssat-wv13-p0n.wv.json`). 4. `ssat-wv.mjs draw` (`--a1 --lic --senses`), `build --natlive
reading-cal/ssat/natlive.json`, consistency render: **committed before any grader or solver**. 5. Stages 1-4.
6. **Result commit** with `READING-BATCH-WV13-2026-10-11.md`, the REGISTER §5 line and ledger entry
`ssat-reading-wv13-2026-10-11`, whatever the outcome.

## If every deciding stage passes

- Insert STAGED (`verified=false`) with `insert-ssat-wv.mjs` as cohort **`ssat-reading-wv13`**, `verify_meta`
  citing this file. Never `verified=true`.
- Prepare a co-founder sitting note and sitting prereg in the WV6 shape (`SSAT-WV13-SITTING.md`,
  `ssat-reading-wv13.SITTING.PREREG.md`). **Do NOT draw it:** the co-founder has an open ACT English run.

## Predictions (recorded so they can be wrong)

1. Round 0 still refuses some vocabulary sets (each of WV11/WV12 had most refused), but with assigned lists and
   no carry-over noise, >= 4 of 5 units clear the sense check after the fix round.
2. The likeliest stop moves off vocabulary: to the grouped screen (WV11 refused one of two units there) or to
   Stage 1 C on an attitude item, which no author-form item has yet faced.
3. Consistency channel: candidate KK - DS within +/-15; live KK - DX larger than PD v2's again.
