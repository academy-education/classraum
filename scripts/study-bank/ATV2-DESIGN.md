# ATV2 — Academic Talk rebuild, Phase 1 design (pre-registered 2026-08-18)

Status: DESIGN + PILOT ONLY. Nothing banked, nothing archived, blueprint
untouched, no commits. The live 275 Academic Talk items stay live.

## Why the current bank fails (MC-ATTACK-2026-08-18.md)

Blind attack 2026-08-18: 120-item stratified sample, 3 Claude solvers,
options+stem only — 99.2% mean, control 29.2%, margin +70.0. EVERY
cohort ≥93%, and the newest (v3-claude) is 100%: re-authoring under the
current pipeline reproduces the defect, the same lesson as cr-v1→v6.
The defect class: **the key is the textbook-true fact and the
distractors are false/absolute/anachronistic facts**, so world
knowledge + hedging solves the item with the audio withheld. Verbatim
solver tells: "Syntrophy/exchange version is the hedged, nuanced
survivor; A/B/D are stated too absolutely"; "'This isn't the only
change' standardly signals more effects to come".

Per-item repair cannot fix this (narrow-repair lesson: predicted 28.4%,
got 74.4%). The fix is the cr-v7 method: **remove the key's provenance
instead of hiding it.**

## Core mechanism — independent pivots, seeded world selection

CR-V7 authored four mutually exclusive worlds per ITEM. Academic Talk
delivers in 4-question sets sharing one lecture, so the unit is the
LECTURE, and the adaptation is:

1. **Each lecture is built on 4 INDEPENDENT PIVOTS, one per question.**
   A pivot is a factual/rhetorical dimension the lecture must resolve
   and that world knowledge CANNOT resolve: which of the plausible
   mechanisms the (fictionalized) study supported, what the lecturer's
   verdict on a named hypothesis is, what rhetorical job a mentioned
   example does, what the team is implied to do next. Every pivot has
   **4 mutually exclusive settings**; each setting's option text is
   authored symmetrically (same register, same hedging level, no
   absolutes, comparable length and specificity). The 4 settings of a
   pivot are the 4 options of that pivot's question.
2. **Pivots within a lecture are orthogonal**: every combination of
   settings across the 4 pivots (4^4 = 256 possible worlds) must be a
   writable, coherent lecture. Therefore no question's options can
   confirm or refute another question's key — the sibling-leakage
   killer is structural, not cosmetic (checks below).
3. **Freeze, then select.** All stems and all 96 option texts are
   frozen (sha256 recorded). Only then does a seeded RNG pick one
   setting per pivot — 24 independent draws. The chosen tuple is the
   spoken world. **Seed: the fixed literal `atv2-20260818`** (stream
   per lecture-pivot: `atv2-20260818:<lectureId>:<pivotId>`; letter
   deal stream `atv2-20260818:letters`). No Date.now anywhere.
4. **Key letters are dealt flat**: exactly 6/6/6/6 across the 24 items
   via seeded shuffle of the letter multiset, so the fixed-letter
   control is 25.0% by construction.
5. **Transcripts are authored AFTER selection** (they are the audio
   source, so they can only exist for the spoken world). For each
   pivot, the transcript must (a) assert the chosen setting in a
   quotable span and (b) contain, for EACH of the 3 non-chosen
   settings, a verbatim span that kills it — an explicit contrast or
   assertion incompatible with it, not mere absence. 6 lectures × 4
   pivots × 3 kills = 72 kill quotes, machine-verified.
6. **No post-selection edits to option text or stems.** If the pilot
   fails the attack, the batch dies whole and the design is revised —
   the cr-v7 invariant. (Transcript-side typo fixes that leave options
   byte-identical are permitted and logged.)

Why this defeats the tell: the key is statistically independent of
every text feature by construction — hedging, length, world-knowledge
truth, intuitive-soundingness. A solver whose heuristic is "pick the
hedged/true/textbook option" scores 25% in expectation, because the RNG
that picked the spoken world never saw the text. "Sometimes the
intuitive-sounding option IS the key" is automatic, not a quota.

## Anti-rigid-brief requirements (CLAUDE.md corollary)

The cr-v3 lesson: a rigid brief moves the roster up a level. The
load-bearing element must VARY across lectures:

- **Question types vary and rotate position**: detail / function /
  attitude-verdict / inference / main-emphasis, mixed differently in
  each lecture, never in a fixed slot order.
- **Pivot kinds vary**: which-mechanism-did-the-study-support, what-
  did-the-analysis-show, why-mention-X, verdict-on-named-hypothesis,
  what-happens-next, which-reading-of-the-evidence — no single
  counterfactual recipe repeated across all lectures.
- **No shared key prose shape**: settings within a pivot are all
  hedged alike (or all plain alike); across lectures the "committed"
  party, the surviving reading, and the verdict's direction all vary.
  The cr-v7 "identical key prose across lectures" tell is checked by
  asking each blind solver explicitly whether answers are guessable
  from CROSS-item patterns, and by the pre-flight n-gram scan.
- **Topics span disciplines** (archaeology, neuroscience, art history,
  ecology, linguistics, history of science in the pilot) and the
  entities are fictionalized (invented sites, studies, names) so no
  setting is refutable or confirmable by general knowledge.

## Sibling-leakage machine checks (requirement: state how)

1. **Structural (by construction)**: pivot orthogonality — reviewed by
   a Claude checker BEFORE freeze: for every lecture, every pair of
   questions (q,p) and settings (s_q, s_p), flag any pair that cannot
   coexist in one coherent lecture, and any option that echoes,
   confirms, or presupposes a specific setting of a sibling pivot.
2. **Lexical (post-freeze script, `atv2-checks.mjs`)**: within a
   lecture, no shared content 3-gram between any option of question q
   and any option of question p (q≠p); flag shared rare content words.
3. **The attack itself**: solvers receive all 24 items with topic tags
   visible, so sibling grouping is transparent — the harshest version
   of the cross-reference attack the Announcement finding described.
   Each solver is explicitly asked whether siblings reveal each other.

## Other pre-flight machine checks (all in `atv2-checks.mjs`)

- Kill-quote anchoring: every distractor_rationale reason must contain
  a quoted span (straight or curly quotes) of ≥3 words that appears
  verbatim in that lecture's transcript after quote/apostrophe/dash
  normalization. **The checker is break-tested on a known-bad fixture
  before its green counts** (CLAUDE.md: break the check).
- Letter spread: exactly 6/6/6/6 (assert, not just report).
- Key length rank: no slot (longest…shortest) above 40% of keys.
- Hedge-word and absolute-word rates, keys vs distractors: no
  imbalance beyond noise; hard fail if absolutes appear in distractors
  but never keys.
- Cross-lecture near-duplicate options (Jaccard ≥ 0.6): none.
- Count check on every file read (no silent truncation).

## Pilot shape and live row fidelity

6 lectures × 4 questions = 24 items, matching the delivery unit in
`src/lib/study/assemble.ts` (academic_talk draws even counts from sets;
live bank holds 2/3/4-question sets, blueprint n=16 m1=4 upper=12).
Pilot rows are authored in the EXACT live `study_item_bank.item` shape
(observed 2026-08-18 on live v3-claude rows):

    type: "multiple_choice", blanks: null,
    prompt: "[Academic Talk — <Topic>] <question>",
    choices: [4 strings, dealt letters],
    graphic: null,
    passage: "Transcript: <full transcript>",
    difficulty: easy|medium|hard  (pilot: 16 medium, 8 hard),
    explanation: <why the key is right, from the transcript>,
    listeningTask: "academic_talk",
    correct_answer: <full text of key>,
    passageGroupId: "atv2-p1".."atv2-p6"  (also the row-level
      passage_group_id column at banking time),
    correct_answers: null, acceptable_answers: null,
    distractor_rationales: [{choice, reason-with-verbatim-kill-quote} ×3]

Cohort at banking time (Phase 2 only): `at-v2`. **Andy's standing rule
holds: delivered counts never change** — this rebuild swaps items under
the same blueprint numbers; the 16/4/0/12 row in assemble.ts is not
touched.

## PRE-REGISTERED attack protocol and kill rule (fixed before any item exists)

- **Instrument**: 3 independent Claude solver subagents (NEVER
  GPT/OpenAI — production gpt-4.1 is a separate concern). Each gets
  ONLY `atv2-pilot.blind.json`: stem + options, letters as dealt.
  Transcripts never cross the line. Forced choice on all 24, one-line
  reason each, confidence flag, then a pattern report that MUST answer:
  (a) any structural tell within items, and (b) **are answers guessable
  from patterns ACROSS items — including siblings from the same
  lecture?**
- **Control**: best fixed letter over the key file = 25.0% by the flat
  deal (verified, not assumed).
- **Scorer**: `atv2-score.mjs`, break-tested with `--shift N` (a
  rotated key must score near chance) before any real score counts.
- **Kill rule** (identical to the standing cr-v7 pre-registration):
  margin = mean solver % − control %.
  - margin ≥ +30 → **killed**: the batch dies whole, no option-text
    repair, design revised.
  - margin ≤ +25 → **clear** at pilot n=24; proceed toward Phase 2
    (scale with multiple authors + a fresh S2 sample attack, then the
    human sitting per B4 — the human remains the verdict instrument).
  - +25 < margin < +30 → inconclusive at this n; author 12 more
    lectures under the same frozen design and re-attack the union.
- Additionally, any solver-named heuristic loud enough to report is
  COUNTED against the full population (the cr-v7 rule: the hypothesis
  is counted, not just out-scored).

## Execution order (no step may be reordered)

1. This design doc (this file).
2. Author `atv2-quads.json`: 6 lectures × (4 pivots × 4 settings) +
   stems. Pre-freeze checker pass (plausibility: no setting refutable
   by general knowledge; orthogonality: every setting pair coexists).
   Edits allowed HERE only.
3. Freeze: record sha256 of atv2-quads.json in ATV2-PILOT-RESULT.md.
4. `atv2-render.mjs select` — seeded world selection + flat letter
   deal → `atv2-selection.json` (seed `atv2-20260818` recorded in
   output).
5. Author transcripts + explanations + kill rationales for the SELECTED
   worlds only (`atv2-spoken.json`).
6. `atv2-render.mjs assemble` → `atv2-items.json` (live shape);
   `atv2-checks.mjs` (all checks above; kill-quote checker break-tested
   first).
7. Blind render → `atv2-pilot.blind.json` / `.key.json` (seeded item
   order shuffle; topic tags stay visible).
8. Blind attack (3 Claude solvers) → `atv2-pilot.solver-{a,b,c}.json`.
9. `atv2-score.mjs` (after its own break-test) → verdict under the
   pre-registered rule → `ATV2-PILOT-RESULT.md`.

## What the pilot does NOT establish

Clearing the blind attack does not establish the items are good WITH
the audio — naturalness of the transcript, felt (not just provable)
wrongness of distractors, two-defensible-answer defects. Those remain
for the with-source checker pass (exclusivity check, cr-v7 cohesion
lesson) and ultimately the human sitting. Phase 2 must also decide TTS
duration budget: live transcripts run ~210–260 words; ATV2 transcripts
must stay in that band so section timing is unchanged.
