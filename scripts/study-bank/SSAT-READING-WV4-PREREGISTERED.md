# SSAT Reading pilot 4: whole-passage variants, brief aimed at difficulty. Pre-registered 2026-10-06 (before any item exists)

Owner approved a fourth pilot on 2026-10-06. Pilot 3 (`SSAT-READING-WV3-PREREGISTERED.md`, REGISTER
A78) passed relative naturalness E (candidate median 4 vs live 2) and exclusivity C (12/12), and
FAILED difficulty F (9/12 grader-median easy, bar <= 6). A, B and D never ran. The graders named
three mechanisms:

1. **Absent-entity options.** Some wrong options named things the drawn version never mentions
   (museum; herons; food; beetles), so a reader struck them by scanning.
2. **Flat dismissals.** The options the passage did raise were waved away explicitly ("relief … was
   the wrong word", "earlier tests that failed").
3. **A cross-item tell.** The key was always "what actually happened", never something believed,
   planned or implied.

Pilot 4 changes ONLY the authors' brief and adds a mechanical check for mechanism 1. Method, draw,
bars, instruments and live control are pilot 3's.

## Same as pilot 3 (by reference)

- **Method:** whole-passage five-version units (version k keys choice k on every question),
  `ssat-wv.mjs verify` with every pilot-2 refusal.
- **Freeze -> hash -> draw:** the `*.wv.json` files are committed before the draw; `frozenSha` =
  sha256 of their bytes in sorted path order; `k(passage_id)` = the same formula and seed string
  `ssat-wv-2026-10-06`. Never re-rolled.
- **Bars A, B, C, D, E (relative, neutral prompt, the same 6 live passages frozen in
  `ssat-wv3-pilot/natlive.json`), F (<= 6 of 12 grader-median easy)**, the same 48-item live
  control (`ssat-reading-diag/taskF.json`), the same scorer (`ssat-wv.mjs score`, `--nat3` for E).
  Between-on-A counts as not passing.

## What is new

### 1. Brief: `SSAT-WV4-AUTHOR-BRIEF.md` (committed with this file)

Changes against `SSAT-WV-AUTHOR-BRIEF.md`, each aimed at a pilot-3 mechanism:
- **A.** Every option of every non-vocabulary, non-attitude question concerns people, things or
  events present in EVERY version, in the option's own distinguishing words. (mechanism 1)
- **B.** Wrong options are tempting partial readings: true of part of the passage, a character's
  belief but not the author's conclusion, an overgeneralisation of a stated detail, an inference one
  step too far. Not flat dismissals; at most one explicit rejection per paragraph. (mechanism 2)
- **C.** Mix weighted to inference, purpose/structure, tone and meaning-in-context: exactly 1
  vocabulary, exactly 1 attitude, >= 2 inference, >= 1 purpose, <= 1 detail, <= 1 main-idea.
- **D.** The kind of correct answer varies across questions (a belief, an adopted plan, an author's
  implication, a reason), so "what actually happened" is not a cross-item tell. (mechanism 3)
- **E.** Attitude items: no version names the attitude word of any choice.

### 2. Mechanical check: `ssat-wv.mjs verify`, applied to passage ids `WV4-` and later

Old units (`WV1-`, `WV3-`) verify exactly as before (pilot-3 files still print `verify OK`).
For `WV4-` units verify additionally REFUSES on:
- **Mix:** kind counts outside vocabulary 1, attitude 1, inference 2–6, purpose 1–6, detail 0–1,
  main-idea 0–1.
- **Absent option:** for every non-vocabulary, non-attitude question, every version k and every
  choice j (key included): the choice's *distinctive* content words (content words not present in
  all four other choices, excluding stopwords and generic function verbs such as show/explain/
  describe) are stem-matched (shared first min(5, len) letters, len >= 4) against version k; fewer
  than ceil(n/2) present refuses.
- **Kill quote off-target:** for every rival j of version k, the kill quote must share at least one
  distinctive word of choice j.
- **Named attitude:** for the attitude question, the head (last distinctive) word of every choice
  must be absent from every version.

**Known-answer check, run before this commit** (pilot-3 files relabelled `WV4-`): the rules flag
every absent option the pilot-3 graders named in the drawn versions — museum (P01 v0), herons and
food (P02 v4, main idea), herons and beetles (P02 v4, inference) — and the named attitude "relief"
(P01 v0, v2). The food case is caught only by the kill-quote rule: "follow their food" passes the
presence rule on an incidental "the following spring". **This is a lexical proxy and has false
negatives of exactly that kind.** It is pre-flight, not a bar; D's reviewer additionally records,
per question-version, any choice the version never discusses (recorded, not deciding).

### 3. Authoring protocol

- Two **fresh** Claude author agents, P01 **narrative fiction**, P02 **history feature** (pilots
  1–3 used memoir, history/science feature, narrative fiction, science feature; P02 here is a
  history feature about an invented town or person, not science). Files `ssat-wv4-p01.wv.json`,
  `ssat-wv4-p02.wv.json`, ids `WV4-P01`, `WV4-P02`.
- Each author gets ONLY the brief text and the format spec in its prompt, writes to the scratchpad,
  and is told not to open `scripts/study-bank/` or run anything there. Authors never see
  `ssat-wv.mjs`, any checker, any pilot 1–3 item, or this file. The orchestrator runs `verify` and
  returns its PROBLEM lines verbatim (mechanical only; the deciding bars are never shown).
- Each author is asked at the end to state whether it opened any file other than its own.

### 4. Instruments (frozen now; pilot 3's prompts were not saved, so these are restated)

- **A (iso, three samples) and B (grouped, three samples)**, each a fresh agent:
  > The passages for these reading-test questions have been removed. For each question, pick the
  > answer letter (A–E) you think is most likely correct. Each question has exactly one correct
  > answer. Give a pick for every question. Return JSON {"labels": {"<qid>": {"pick": "<letter>"}, ...}}.
  B agents get `grp-1.json` and `grp-2.json` (one file per passage, all 6 items) and return one
  label file covering both.
- **C+F (two graders)** on `withsource.json`:
  > Below are reading passages, each followed by five-choice questions. Answer each question as a
  > careful expert test-taker. For each give: "pick" (A–E); "second_defensible" (the letter of any
  > other choice a careful reader could also defend from the passage, or "none"); "difficulty"
  > ("easy", "medium" or "hard" for a strong upper-level SSAT student reading this passage); and a
  > one-sentence "note" giving your reason. Return JSON {"labels": {"<qid>": {...}}}.
- **D (one reviewer)** on `cv.json`: for each question-version, `valid: true` only if this version
  makes the claimed answer the unique best answer and refutes or fails to support every other choice
  (passage-supported standard, not "not mentioned"); `reason`; `absent`: choices this version never
  discusses (recorded). Plus one top-level `cross_item` note: is any answer guessable from a pattern
  across the questions of a unit (recorded, not deciding).
- **E (two judges)**: pilot 3's neutral prompt verbatim, on 2 drawn candidates + the 6 frozen live
  passages, shuffled by `build --natlive`.

Claude subagents only (never GPT), at most 2 at a time. The A/B samples are one solver sampled three
times, not independent raters.

## Bars (pilot 4 passes only if ALL pass): identical to pilot 3

A supports (candidate <= 40% AND control <= 40%; control 10–45% else invalid; >= 60% fails; between
is not passing) · B <= 40% · C >= 10/12 · D >= 54/60 · E candidate median >= live median (live
median 1 = invalid, re-run once) · F <= 6 of 12 easy (mean of two grader ranks <= 1.5).
Range checks are pilot 3's and still hold: the live control measured 26.4%, inside 10–45% with
13.6 points of headroom under 40%; live E median measured 2, so E can pass and fail; C, D, F span
their full integer ranges.

**Stop at the first failure.** Order of running (most informative first): C+F, E, D, A, B. No repair
round.

## Batch, if and only if pilot 4 passes

`admission-form-depth.ts` showed SSAT Reading at **3 clean forms** (138 items, 31 groups) on
2026-10-06 before this pilot. Before authoring, replay the real `drawByPassage` with N synthetic
6-item passages added to the live rows to find the smallest N reaching 5 clean forms; the 2 pilot
passages count toward N. Author the rest with fresh agents, at most 2 at a time, same brief, same
protocol. Each round: verify, freeze (commit), draw, then A and B against the same 48 control items
(three samples each), C+F on every drawn item, D on every question-version, E (same 6 live passages,
same prompt). The batch passes on the same bars scaled to its n (C >= 10/12 of items, D >= 90%,
F <= 50% easy, A supports, B <= 40%, E median >= live). Items failing C are dropped; passages left
with fewer than 5 items are dropped. QC ledger entry, insert as cohort `ssat-reading-wv4`, re-run
`admission-form-depth.ts`, report forms before -> after. The human sitting remains the verdict for a
verbal cohort (bank-gate §5).

## Result (2026-10-06): FAILS C (9/12) and F (7/12 easy). Stopped at the first stage. Nothing inserted.

- **Authoring.** Two fresh authors produced P01 (narrative fiction, Grandfather's boat *Linnet*) and
  P02 (history feature, the Gannet Point lighthouse). Verify then refused P01 on 3 problems (two kill
  quotes off-target, one stem word unique to another question's choice) and P02 on 1 (a kill quote
  off-target). One fix round followed, with fresh agents that got only the PROBLEM lines and the
  brief. All four fixes changed only quotes or a choice; no passage text changed. Result: verify OK,
  v4 absent-option hits 0, named-attitude hits 0, and the lexical solver at 6.0/25 and 5.2/25 against
  a 5.0 chance line. Neither author nor fixer reported opening the checker. P02's author wrote its
  own Rule-A checker from the brief text (`p02work/verify.py`, scratchpad).
- **Freeze** `4b6bbfb0` → frozenSha `410a94aa…` (recomputed independently with `shasum`) → **draw**
  P01 v3, P02 v0, committed with the renders in `d9e24f8f` before any grader ran.
- **C+F** (two graders, frozen prompt, `ssat-wv4-pilot/ws-{a,b}.json`). **C 9/12, FAIL (bar ≥ 10).**
  Both graders gave the same three items a second defensible answer:
  - **both attitude items**: P01 "doubtful" vs "wistful" (the two graders even picked different keys),
    and P02 "admiring" vs "sympathetic";
  - **one inference item**: P02 "why the board ordered the bell", where the budget motive is a
    defensible second because the passage says the board "had little money to spend".
  **F 7/12 easy, FAIL (bar ≤ 6)**, with P01 at 4 and P02 at 3. The notes give the mechanisms: keys
  stated outright ("I marked that bevel wrong"; "the board ordered a heavier bell"; "says the two of
  them will rebuild"), a purpose item settled by the topic of a paragraph, and both vocabulary items
  on the transparent word "fair" ("fair distance", "fair wind").
- E, D, A and B were not run (stop at first failure; no repair round).
- **What moved, against pilot 3:** easy fell from 9 to 7, and no grader cited an absent option, so
  rule A did remove mechanism 1. But exclusivity fell from 12/12 to 9/12. The two misses besides
  attitude are the price of rule B: once a rival is present and tempting ("little money to spend"),
  a careful reader can defend it. The remaining easy items are keys the drawn version states as fact.
  **The bind now has a third side:** rivals absent makes items easy, rivals dismissed makes them
  easy, and rivals present and undismissed makes them non-exclusive.
- Grader B flagged a contradiction in P02 ("thirty-two years" vs "thirteen winters"). It is **not
  one**: 13 winters before 1871, plus 1871, plus 18 years after, makes 32.
