# The hedge-word tell: measured against real College Board and ETS items

Status: **measurement only, nothing repaired.** 2026-07-31.

## Summary

The question was "what rate is correct?", and the honest answer turns out to be
**different for each section** — which is why a single 25% target would have been
wrong.

Two reference corpora were built from officially released material, because the
repo contained none:

- **462 College Board Digital SAT Reading & Writing items** (7 linear practice forms)
- **314 ETS TOEFL iBT items** (144 Reading, 170 Listening) from 7 official ETS documents

Measured on those, with the same regexes `scripts/verify-option-tells.ts` uses,
restricted to items where all four options are ≥5 words (the only population
where these words can appear — official SAT has 44% single/two-word options
against our 26%, so an uncontrolled comparison is meaningless):

| | official key | official distractor | our key | our distractor | z key | z distractor |
|---|---|---|---|---|---|---|
| **SAT R&W** hedge | 20.7% | 21.0% | 20.9% | 11.0% | +0.07 | **−6.34** |
| **SAT R&W** absolute | 6.5% | 6.5% | 10.8% | 16.5% | +1.89 | **+6.46** |
| **TOEFL R** hedge | 23.8% | 11.2% | 25.6% | 13.2% | +0.35 | +0.84 |
| **TOEFL R** absolute | 1.2% | 4.2% | 6.9% | 22.8% | +1.96 | **+6.64** |
| **TOEFL L** hedge | 6.9% | 12.0% | 15.1% | 7.3% | +1.87 | **−2.48** |
| **TOEFL L** absolute | 4.2% | 1.4% | 8.5% | 19.6% | +1.28 | **+6.64** |

Three findings, in order of how much they should change what we do:

1. **Our keys are fine. Every one of the six key-side z-scores is
   non-significant** (largest |z| = 1.96, on TOEFL Reading absolutes, right at
   the .05 boundary and on the smallest cell in the study). The keys were never
   the problem, and no repair should touch them.
2. **Our distractors overuse absolutes everywhere, by 4–14×.** Official
   distractors carry an absolute in 1.4–6.5% of options. Ours: 16.5% / 22.8% /
   19.6%. This is the single largest deviation in the whole study, it is present
   in all three sections, and it is not just a tell — an absolute is the most
   widely taught elimination cue on both exams, so roughly **one wrong answer in
   five is currently eliminable without reading the passage.**
3. **The hedge "tell" on TOEFL Reading is real and we should leave it alone.**
   Official ETS TOEFL Reading genuinely hedges its keys more than its distractors
   (23.8% vs 11.2%); "pick the only hedged option" scores **47.4%** on real ETS
   items. Our 44.3% is, if anything, *below* the real exam. The original
   hypothesis — that hedging is intrinsic to a defensible key — is correct, but
   only for this one section.

So the answer to "what rate is correct" is: **~21% for SAT R&W hedge, ~47% for
TOEFL Reading hedge, ~23% for TOEFL Listening hedge.** Forcing all three to 25%
would have made TOEFL Reading *less* like the real exam, exactly as feared.

---

## Recommendation

**Fix the distractor side only, and only where it deviates. Leave every key alone.**

| target | now | target | why |
|---|---|---|---|
| P(absolute \| distractor), **all three sections** | 16.5 / 22.8 / 19.6% | **≈ 5%** | official range 1.4–6.5%; this is the big one |
| P(hedge \| distractor), SAT R&W | 11.0% | **≈ 21%** | official has key/distractor parity |
| P(hedge \| distractor), TOEFL Listening | 7.3% | **≈ 12%** | official distractors hedge *more* than keys |
| P(hedge \| distractor), TOEFL Reading | 13.2% | **leave** | already within noise of ETS's 11.2% |
| P(hedge \| key), all | — | **leave** | z ≤ +1.87 everywhere |
| P(absolute \| key), all | — | **leave** | z ≤ +1.89 everywhere |

Note the asymmetry that makes "just hit 25%" the wrong instruction: on TOEFL
Listening the real exam has keys hedging **less** than distractors (6.9% vs
12.0%), the opposite of the folk heuristic. Our bank is inverted relative to the
real thing there, not merely exaggerated.

An independence model (`exploit = p_k(1−p_d) / [p_k(1−p_d) + 3(1−p_k)p_d]`)
reproduces observed exploit rates within ~6pp on all six corpora, and confirms
the direction of the fix. For SAT R&W hedge: fixing keys to official moves the
exploit rate 41.7% → 41.4% (nothing); fixing distractors moves it to **24.9%**.
For TOEFL Listening, "fixing" the keys makes it **worse** (43.0% → 52.6%).

**One place where the distractor fix alone is not enough.** Dropping distractor
absolutes to ~5% while our SAT R&W keys sit at 10.8% would flip that tell rather
than remove it — "pick the option with an absolute" would go from 13.9% to
**36.8%**. The rule is **parity with the official key/distractor *ratio***, not a
target level. For SAT R&W absolutes specifically, keys should come down from
10.8% to ~7% alongside the distractor cut.

### The specific words

Our distractors are built from a narrow vocabulary of overstatement that the real
exams barely use, and are starved of the hedges the real exams put in distractors
freely (per-word rates in distractors, length-controlled):

| word | official SAT dis | our SAT | our TOEFL-R | our TOEFL-L | |
|---|---|---|---|---|---|
| `only` | 2.3% | 3.6% | **9.8%** | **7.5%** | ← up to 4× |
| `every` | 0.3% | **3.4%** | 2.3% | 1.5% | ← up to 11× |
| `never` | 0.1% | 1.8% | 1.4% | 1.0% | ← up to 18× |
| `always` | 0.4% | 1.0% | 2.9% | 1.3% | |
| `entirely` | 0.3% | 1.3% | 1.0% | 0.7% | |
| `likely` | **3.4%** | 0.6% | 0.5% | 0.1% | ← up to 34× too *few* |
| `may` | **2.6%** | 0.4% | 1.1% | 0.7% | ← 4–6× too few |
| `some` | 2.3% | 1.1% | 1.4% | 0.2% | |

`only` in our SAT **keys** is 5.9% against College Board's 1.3% — the one word
where the key side is also visibly off.

### How to do it, and how not to

The mechanism is the authoring brief, not a find-and-replace. Our distractors are
overwhelmingly built by taking a defensible statement and breaking it with an
absolute — one wrongness-generator applied over and over, with the overstatement
vocabulary as its fingerprint. Real distractors are wrong for other reasons:
right idea attached to the wrong referent, true of a different paragraph,
plausible but simply unsupported, a distortion of *degree* that is still hedged.
The brief should require a **mix** of wrongness types and cap the overstatement
type at roughly one distractor in six.

Do not implement this as a per-item quota a script enforces. `CLAUDE.md` records
this failure mode three times — key-in-slot-A, complete-ABCD permutations,
identical key prose across lectures — where a rigid spec made the answer
predictable from the spec. "Every set must contain N hedged distractors" is
exactly that shape and would breed the fourth tell. Vary the generator; measure
the marginals afterwards.

**The check that must pass afterwards is not `verify-option-tells.ts`.** Rewriting
a distractor's wording without changing *why it is wrong* will move the statistic
and leave the item equally guessable — the em-dash and length repairs are the
precedent. Re-run a blind, no-passage grader and confirm the solve rate falls.

---

## The reference corpora

### College Board Digital SAT Reading & Writing — 462 items

Seven official linear (nonadaptive) practice forms, tests 4–10, question PDF plus
matching ANSWER EXPLANATIONS PDF, from `satsuite.collegeboard.org/media/pdf/`.
(Tests 1–3 and all pre-2024 paper forms are no longer published at that path.)
7 × 66 items = 462 items / 1,848 options; 232 items in the length-controlled subset.

| all items (n=462) | P(w\|key) | P(w\|distractor) | exploit |
|---|---|---|---|
| hedge | 11.0% [8.5–14.2] | 11.3% [9.7–13.0] | 21.3% [12.9–33.1] of 61 |
| absolute | 3.2% [2.0–5.3] | 3.3% [2.5–4.4] | 30.0% [16.7–47.9] of 30 |

| ≥5-word options (n=232) | P(w\|key) | P(w\|distractor) | exploit |
|---|---|---|---|
| hedge | 20.7% [16.0–26.4] | 21.0% [18.1–24.2] | 21.4% [12.7–33.8] of 56 |
| absolute | 6.5% [4.0–10.4] | 6.5% [4.9–8.5] | 31.0% [17.3–49.2] of 29 |

### ETS TOEFL iBT — 314 items (144 Reading, 170 Listening)

From `ets.org`: the 2026-format full-length practice tests 1 and 2, the three
teacher's-resources practice tests, the 2019 free practice test (Reading only),
and the 2023 reading practice sets.

| Reading, ≥5w (n=80) | P(w\|key) | P(w\|distractor) | exploit |
|---|---|---|---|
| hedge | 23.8% [15.8–34.1] | 11.2% [7.8–15.9] | **47.4% [27.3–68.3] of 19** |
| absolute | 1.2% [0.2–6.7] | 4.2% [2.3–7.5] | 0.0% [0.0–29.9] of 9 |

| Listening, ≥5w (n=72) | P(w\|key) | P(w\|distractor) | exploit |
|---|---|---|---|
| hedge | 6.9% [3.0–15.2] | 12.0% [8.3–17.1] | 23.1% [8.2–50.3] of 13 |
| absolute | 4.2% [1.4–11.5] | 1.4% [0.5–4.0] | 75.0% [30.1–95.4] of 4 |

Brackets are 95% Wilson intervals.

### This repo contained zero official items

A full inventory found: the `EXAMPLE N (verified hard, ...)` anchors in
`src/lib/test-specs.ts` are author-written or model-rewritten from a third-party
Korean DSAT prep mock (`25WT-TEST02`) — **"verified hard" is a difficulty claim,
not a provenance claim**, and reads misleadingly like the latter; the ~523 items
in `scripts/study-bank/*.json` are all Opus-authored; the only genuinely official
artifact in the tree is `src/lib/study/__fixtures__/ets-scored-samples.ts`, which
holds two ETS-scored *essays* with no options at all. Also worth noting:
`src/lib/test-spec-refresh.ts` contains a source whitelist that explicitly forbids
third-party prep material — the hardcoded examples violate the rule the repo
already wrote down.

---

## How the corpora were validated

The result is a ratio between two independently parsed streams, so a misaligned
parse would have produced a confident wrong answer. Every check below was
constructed so it could fail.

**SAT.** Plain `pdftotext` gets option text right but interleaves the two columns
on some pages (test 4 lost 4 of 66 items); half-page cropping fixes order but
truncates words straddling the midline (`"varied widely"` → `"varie"`). The final
extractor assigns each *word* to a column by its own bbox midpoint. Then:

- counts must agree three ways — quads found, keys found, and the count the PDF
  itself declares (`(33 questions)` × 2). 66/66/66 on all seven forms.
- **key↔choices alignment, attacked.** Words-in-context explanations quote the
  key's own wording. Naive matching gave 52% aligned — and **55% under a
  deliberate one-question shift**, because the explanation block also quotes all
  three distractors. That check was worthless. Restricting to the "is the best
  answer" paragraph makes it discriminate:

  | | agreement |
  |---|---|
  | aligned | 40/79 = **51%** |
  | question shifted +1 / −1 / +5 | 15% / 16% / 14% |
  | key letter rotated +1 / +2 / +3 | **1% / 0% / 0%** |

- official key letters come out A=123, B=106, C=112, D=121 — flat, as a real form
  should be.
- per-form marginals track each other on *every individual test* (12.1/10.1,
  6.1/6.1, 15.2/13.1, 12.1/12.1, 15.2/12.1, 9.1/9.1, 7.6/16.2). The pooled number
  is not an average of disagreeing forms.

**TOEFL.** The parse was produced by a subagent, so it was re-verified here
against ETS's own printed answer keys rather than trusted — **314/314 exact key
matches**: 268/268 across all five 2026-format sources (Reading and Listening),
24/24 on the 2019 free practice test Reading, 22/22 on the 2023 reading practice
sets. Only machine-verified sources are in the corpus; the 2019 free practice
test's *Listening* items (23) were excluded because its answer key is a
five-set two-column layout I could not align, and Listening already had 170
verified items without them.

One process note worth keeping. An early run of this verification reported
"12 mismatches" on that 2019 Listening set, which looked like a data defect and
would have justified discarding the whole TOEFL corpus. It was a bug in **my
checker** — listening question numbers restart at 1 in each set, so I was
comparing set A's question 2 against set B's. The lesson matches the one already
in `CLAUDE.md`: when a check fails, attack the check before believing it, in
both directions.

---

## Uncertainty — stated plainly

1. **The TOEFL exploit rates rest on very few usable items** — 19 for the Reading
   hedge cell, 4 for the Listening absolute cell. The **marginals** carry the
   statistical weight (320 and 288 options respectively) and those are what the
   recommendation is built on. Do not quote "47.4%" as a precise TOEFL Reading
   reference; quote "ETS's own Reading keys hedge roughly 2.1× as often as its
   distractors, and ours match."
2. **The TOEFL-Reading "leave it" conclusion is the least robust of the three.**
   It rests on 80 length-controlled official items. It is enough to say our rate
   is *not clearly wrong* (z = +0.35 key, +0.84 distractor) and therefore not
   enough to justify a repair — but it is not enough to prove our rate is right.
   If more official TOEFL Reading becomes available, re-measure before concluding.
   Note also that TOEFL Reading absolutes on the key side came in at z = +1.96 —
   exactly at the significance boundary. It is the one key-side cell that would
   be worth re-checking if the corpus grows.
3. **Linear/practice forms are not live adaptive forms.** Official content built
   to the same specification, but the accommodations and practice versions. No
   public data exists on whether the live item pools differ.
4. **The word lists are a proxy for a semantic property.** `only` inside "the only
   surviving manuscript" is not an overstatement; the regex counts it. This adds
   noise symmetrically to keys and distractors so it does not bias the ratio, but
   per-word rates are upper bounds on genuine overstatement.
5. **`verify-option-tells.ts` also flags comma (46.7%) and semicolon (42.3%) on
   SAT R&W.** Those were not investigated here and are probably the same
   underlying phenomenon as the em-dash tell already repaired (longer, more
   qualified keys), but they are unmeasured against the reference.

## Reproducing

Nothing but this document was added to the repo. The extractors, the alignment
attack, the corpus builders and the measurement script live in this session's
scratchpad (`ref/bbox.py`, `ref/parse_sat.py`, `ref/build_sat.py`,
`ref/measure.py`, `toefl_ref/parse.py`) alongside the downloaded PDFs and the two
built corpora (`ref/sat_official_rw.json`, `ref/toefl_official_verified.json`).

If this becomes a standing check, `build_sat.py` + `measure.py` are worth
promoting into `scripts/`, **with both corpora checked in as fixtures** — the
reference must not depend on College Board's and ETS's URLs staying live, and
tests 1–3 disappearing from the SAT path is proof that they do not.
