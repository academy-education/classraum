# iTEP SLATE Listening v3 (Part 2 top-up: conversations only) — pre-registration

Written 2026-10-31, BEFORE any v3 script, item, assignment, checker or author exists, and before any v3 author,
probe, grader or solver has been spawned.

**Why.** After v1 + v2 the staged bank holds Part 1 42 dialogues, **Part 2 8 conversations**, Part 3 11 lectures:
`verify-itep-draw.ts --section listening` gives **8 disjoint full forms, Part 2 binds**. Ten forms need 10
conversations, so the shortfall is **2 conversations**. v2 conversations cleared 4 of 9 (44%), so this round authors
**8 conversations (32 items)**: at v2's rate that is about 3.6 survivors, and 2 survive unless the rate falls under
25%.

## 0. Format: unchanged from v1 §0 (Part 2 only)

Part 2 = a conversation between a woman and a man, 10-20 turns, 300-420 words, 4 questions, `medium`, four options.
Domain `Part 2: Conversation` (4 per group). Kinds as v1/v2: main-idea, detail, inference, intent-next, purpose,
relationship, attitude.

## 1. Brief: NO CUT. Frozen v1 is used unchanged. The "broken for conversations" question, decided now.

The owner asked whether pending lessons 9-13 make the brief **broken for conversations specifically**
(`BRIEF-VERSIONING.md` rule 3). Decision, recorded before any author exists:

- **Broken: no, by the rule as written.** "Broken" is the gate yield falling into the prereg's stop band, and v2's
  bands were defined on the cohort: 91/126 = 72.2%, the middle band. Read per part, Part 2 at 16/36 = 44.4% WOULD
  sit under v2's 50% stop line, so the question is a fair one. It is answered by the causes of the five lost
  conversations, every one of which is named in the v2 results:
  - **C, B, E** (3 of 5): counted a+c `key_in_near_duplicate_pair`, produced by the **assignment** value
    `whole-script options: 2`, which makes the key one of a twin pair by construction (lesson 12). Fixed below by
    not drawing it. No brief text is involved.
  - **G** (1 of 5): the **revision round** rewrote a key ("Ask" -> "Get their father's permission"), lesson 9. Fixed
    below by process: no key text may change in revision.
  - **I** (1 of 5): I-C-3, one grader (c) alone. An ordinary author-level miss.
  So 4 of 5 losses had assignment or process causes that v3 removes without brief text, and the one remaining loss
  is the base rate the brief already produces on Part 1 and Part 3. Lesson 13 (woman wins all 9) is an assignment
  cause too (prevails cycled over all parts). Lessons 10 and 11 were named on Part 1 dialogues, not conversations.
  A cut would add nothing to any of these causes, and rule 4 would force it to fold in lessons 3-7 (Part 1 and
  lecture text) at the same time.
- **Earned: no** (no human bridge for iTEP). **Blocking: no**: no tell has yet been named by two graders in two
  consecutive batches. `one_template` (lesson 10) was named by b+c in v2; **if two graders name it again here, that
  is its second consecutive batch and the next round cuts v2 (blocking)**, whatever the yield.
- **The stop band is fixed now, per part, for this round:** v3 is conversations only, so its cohort band IS the
  Part 2 band. **Under 4 of 8 conversations (under half), or the cohort held = "broken for conversations": the next
  Part 2 round cuts v2 for Part 2 before more conversations are written**, folding in every pending lesson.

So the author brief is `briefs/itep-slate-listening-v1.md`, byte-identical (sha256 `7d14a30f…e279`, re-checked by
`assign.mjs`, which refuses on a mismatch); authors never read the pending file. Method id
**`itep-listening-v1-agent8+cfg-v1`** (same brief and grader brief, eight authors).

**What v3 applies from the pending lessons, through the assignment and the process only:**

1. **Lesson 12: `whole-script options` is drawn as `4` only** for main-idea items (all four options whole-script
   summaries, three with the outcome wrong). `2` made the key a twin by construction (v2: 4 counted items); `1`
   made the key the only whole-script option, which probe 1 and probe 2 both named (6/6, broadest keyed 9/9). `4` is
   one of the brief's own values (rule M).
2. **Lessons 1 and 13: every shape is drawn within this part**: key length per author 1 longest / 1 shortest / 2
   middle; script words 2 / 2; `opens` 4 woman / 4 man; `prevails` woman 3 / man 3 / neither 2; `about` balanced
   over the speaker-naming items.
3. **Lesson 10 (blocked first plan never keyed): a per-conversation `first plan` field** (a script shape like v2's
   `common belief`; brief R8 "follow the shapes in your assignment exactly"), drawn jointly with `prevails`:
   woman/holds x2, woman/replaced x1, man/holds x1, man/replaced x2, neither/left open x2 (holds 3, replaced 3, left
   open 2). Defined in the assignment in one line: the first plan or suggestion made in the conversation is the one
   that is followed (`holds`), is dropped for a later one (`replaced`), or is still undecided at the end
   (`left open`).
4. **Lesson 9 + the owner's instruction: the revision round may change NO key.** Revision changes distractors,
   prompts, rationales and explanations only. `correct_answer` and the key's text in `choices` must be byte-identical
   before and after; `revision-diff.mjs` (new) compares every v3 item against its pre-revision copy, prints every
   changed field, and exits 1 if any key text changed. **If a probe or dedupe finding can only be fixed by changing
   a key, that conversation is dropped before the gate instead** (the author says so; the coordinator records it).
   A conversation whose key changed anyway is dropped, not sent back.
5. **Lesson 3: one revision round, minimal, then the author re-reads every revised set as a student would**,
   checking that no prompt or option answers a sibling. No second revision round whatever probe 2 finds.
6. **Lesson 8: each author has its own scratch directory**; the packet plan below came from `planPackets` on a mock.

Lessons 4-7 and 11 are **queued, not applied** (they need brief text). Probe and graders watch for them.

## 2. Population (fixed now)

- **32 items in 8 units: 8 Part 2 conversations x 4 items.** Eight fresh Claude author agents **A..H**, one
  conversation each. Set ids `ITL3-<X>-C`, qids `ITL3-<X>-C-<n>`.
- **Assignment** `itep-listening-v3-work/assign.mjs` (sha256 in `v3-work/MANIFEST.json`) -> `ASSIGNED.json`,
  `authors/<X>.md`, `authors/<X>.plan.json`, deterministic from seed `itep-listening-v3-assign`. Eight topic lanes and
  eight conversation role pairs, none used for a v1 or v2 conversation: A family events, holidays and travel plans
  (two cousins); B volunteering and neighbourhood projects (a teen volunteer and the volunteer coordinator);
  C the school newspaper and interviewing (a student reporter and the student being interviewed); D home, repairs
  and pets (a teenager and an adult neighbour in the same building); E camping, hiking and outdoor activities
  (a camper and a summer-camp counsellor); F languages, food and customs (a high-school student and an exchange
  student staying with the family); G science-fair projects and experiments (a science-fair entrant and a
  volunteer judge); H university life and moving away (a younger sibling in high school and an older sibling at
  university). Disjoint name initials (A-B, C-D, E-F, G-H, J-K, L-M, N-P, R-S). Kinds: Part 2 multisets drawn under
  v1's caps and weights (main-idea, inference, intent-next, purpose, relationship, attitude at most 1; detail at most
  2, at least 1), unique within the round (35 possible, 8 drawn).
- **Inputs to authors:** the frozen brief, their own `authors/<X>.md` and `.plan.json`, and refreshed
  `existing-transcripts.txt` / `existing-names.json` (`dump-existing.mjs`: every listening transcript in the bank,
  staged included, so all v1 and v2 survivors; plus every v1 and v2 listening authored set, dropped ones included,
  and every iTEP reading draft's opening and names). **Nobody opens `scratchpad/itep-ref`; no real item is read or
  copied.**
- **Nothing is edited after the packet is built.** A dropped item stays dropped.

## 3. Pre-flight, dedupe, break test (structural, not the gate)

- `itep-listening-v3-work/itep-listening-check.mjs` = v2's check with the id pattern `ITL3-[A-H]-C` and nothing else
  changed: `PROBLEMS 0` per author (`--expect 4 --plan ... --existing-names`) and over all eight (`--expect 32
  --batch`) before the probe. Exits 2 on unreadable / empty / miscounted input.
- **Break test** (`breaktest-check.mjs`, v2's mutations that apply to a conversation-only file: why not verbatim,
  third speaker label, stray "Plan B:", wrong speaker first, length ratio, key length rank, key script-words rank,
  prompt about the wrong speaker; plus an inference without why2 by relabelling) must catch all before the probe.
- **Dedupe** `dedupe.mjs` (exits 2 unless it reads 32 v3 items in 8 sets, 126 v2 items in 54 sets and 56 v1 items in
  24 sets): v3 pairs and every v3 set against every v1 and v2 set: (a) transcript content-word Jaccard >= 0.20,
  (b) a shared invented name, (c) a key 4-gram shared with any other key, (d) an option text repeated verbatim.
  Break-tested before use: a pasted v2 transcript must fire (a), a copied v2 key must fire (c).
- **Revision diff** `revision-diff.mjs` (new): break-tested before the revision round on a copy with one key's text
  changed (must exit 1) and one distractor changed (must exit 0 and list it).

## 3b. Cross-item probe (v2 §3b rule, unchanged)

One fresh Claude agent reads `probe/PROBE.md` + `probe/items.json` (all 32 items with keys, and for context the 16
cleared v2 conversation items, marked as already shipped, so cross-round patterns are visible) and writes
`probe/probe1.json`. **Finding:** a property named on 3+ v3 items with the key carrying it in >= 75% or 0% of the v3
items where it varies; stored answer-letter position is never one. Findings plus dedupe flags -> ONE revision round
(§1 items 4-5). A finding the assignment fixed is recorded, not sent. Pre-flight, dedupe and revision-diff re-run; a
second probe (fresh agent, same prompt) is run and **recorded, never revised**.

## 4. Gate (v1/v2 §4, unchanged instrument)

- **Packets:** one cohort `itep-listening-v3` through `agent-review-core.mjs` `planPackets` / `dealPacket`, default
  limits. **Computed now on a mock 32-item population: 1 packet, 32 items / 8 groups.** `build-packet.mjs` refuses
  any other plan (or, if conversations were dropped before the gate under §1 item 4, the plan `planPackets` gives
  for the survivors, which it prints and records).
- **Graders:** three fresh Claude agents, a and b plain, c adversarial, `COFOUNDER-BRIEF-v2.md` (sha256
  `3d032066…2ad0`), the v2 prompts word for word (cohort and paths changed only).
- **Decision rules (A1 via agent-review-core, no change):** any non-`unique` verdict drops the item; a dropped item
  takes its whole set; **the whole set holds on a non-unique item** (one non-unique verdict on any of a
  conversation's four items drops all four); a batch pattern named by two graders on 3+ shared items counts (letter
  patterns excluded) and drops its items with their sets; a counted union of 50%+ of 32 holds the cohort; no repair
  inside the gate. Scored only by `score.mjs` (exits 2 writing nothing on a missing/malformed/short grader file).
- **Yield bands (conversations):** 6+ of 8 = "brief works for conversations"; 4-5 = "queue the pending lessons";
  under 4, or the cohort held = "broken for conversations" (§1: the next Part 2 round cuts v2). **Separately
  reported:** whether the staged bank reaches 10 disjoint forms (needs 2 survivors).

## 5. No-transcript attack: RECORDED ONLY (v1/v2 §5)

Same instrument and bars: `oo-render.mjs` deals 4 files, item k of each conversation -> file k (8 candidates per
file, 32 in all), each interleaved with the SAME 10 live TOEFL listening control groups as v1/v2 (seed
`itep-listening-v1-ctl`, 40 control items). Stem shown, transcript withheld. Three fresh Claude solvers per file
(three samples, not three solvers). Margin +25 is written up as a signal and never applied; control at 75%+ = "no
headroom, uninformative" (v1 100%, v2 96.7%, so this outcome is expected and is not a pass).

## 6. After the gate

Survivors -> `itep-listening-v3.batch.json` (`build-batch.mjs`: cohort `itep-listening-v3`, `verified=false`,
`passage_group_id` `itep-listening-v3-<set_id>`, method id above, `created_at` increasing after v2's). Staged by
`itep-bank-helper.ts stage --expect <n> --apply`, read back by id (all verified=false, 0 true), then
`verify-itep-draw.ts --section listening`: report disjoint forms. No audio generated; nothing released. No app or
player code is touched.

## 7. Known risks

- Three samples, not three solvers. Graders read; students listen.
- 8 conversations in one 32-item packet: a two-grader pattern needs 3 shared items, which 1 conversation cannot
  supply alone, so a counted pattern always spans conversations.
- Using only `whole-script options: 4` puts four whole-script summaries in every main-idea item: the three wrong ones
  must get the outcome wrong, not be merely vaguer, or graders will find a second answer.
- The `first plan` x `prevails` draw is new; if authors realise `left open` the same way every time, that is a new
  template. The probe is the check.
- Dropping a conversation for a needed key change shrinks the population before the gate; with 8 authored, losing
  more than 4 that way plus a normal gate rate could leave fewer than 2.

## Results

(2026-10-31, recorded after scoring; no rule above changed)

- **Authoring:** 8 Claude authors, 32 items, per-author pre-flight PASS on hand-in. Batch pre-flight 4 problems (prompt
  openings "what is the conversation" x5, "what can be inferred" x6, "what does the man" x5, cap 4; lone negative never
  keyed 0/5). Dedupe 0 flags (highest Jaccard 0.195, ITL3-C-C ~ ITL1-B-C: time capsule vs bee count). Break tests:
  pre-flight 9/9 (after fixing the script-words mutation to pick an item whose key share is under 1: a tie at 1.0
  cannot be broken, so v2's mutation silently missed on this file); dedupe fired (a) Jaccard 1.000 on a pasted v2
  transcript and (c) on a copied v2 key; revision-diff exit 1 on a changed key, exit 0 listing a changed distractor.
- **Probe 1** (`probe/probe1.json`, input `probe/items-r1.json`, pre-revision files `probe/<X>.r1.json`): 4 patterns.
  Sent with the pre-flight problems in ONE round (`probe/revision-r1.json`): intent-next key is the small errand before
  the main activity 4/5 (A2, B4, D1, E4: one distractor made another small errand the script rules out); hedged key
  3/3 (B3, C4: second hedged distractor; H4: first). **Not sent, assignment-caused (§3b):** the higher-status speaker's
  side is keyed 6/6 (B, C, D, E, G): `prevails` was drawn by gender and the role flip put the senior role on the
  prevailing side in every status-gap conversation; fixing it needs new outcomes, i.e. key changes. "To suggest"
  purpose distractors never keyed: 2 v3 items, under the bar.
- **Revision:** 20 non-key field changes in 8 files; `revision-diff.mjs` **0 key and 0 transcript changes** (exit 0).
  No conversation dropped before the gate. Batch pre-flight PASS, dedupe 0 flags.
- **Probe 2** (`probe/probe2.json`, recorded, NOT revised): sibling items eliminate main-idea/relationship options
  6/6 (A, B, C, G, H); senior speaker's side keyed 5/6; Mr. Dunmow options never keyed 0/3 (B only); the one more
  abstract option keyed 4/5; intent-next key carries a sequence link 3/4.
- **Packet:** 1 x 32 / 8 groups as computed. 3 graders, 96 verdicts: a 32 unique; b 32 unique; c 31 unique.
- **Gate** (`score.mjs`): **8 of 32 cleared, 2 of 8 conversations (B, H) = under 4 = "broken for conversations"
  (§1, §4).** No hold (pattern share 15.6%). Drops: **counted b+c `one_template` on all 5 main-idea items** (A-C-3,
  C-C-3, D-C-3, F-C-1, G-C-3: four whole-conversation options that open with the same clause and differ only in the
  outcome) -> A, C, D, F, G conversations; **E-C-2 broken by c** (`key_wrong`: "had been looking for a team" claims a
  search the script never states; the author named this item as least sure at hand-in). Both graders who named the
  template said it does not by itself pick the key; A1 counts a two-grader pattern regardless. a+b+c `key_position`
  excluded (A1.1).
- **The cause is this prereg's own §1 item 1.** `whole-script options: 4` was chosen to remove v2's twin-pair tell
  and produced a template tell on every main-idea item; all three values of the shape have now produced a tell
  (1: broadest option keyed; 2: twin pair, counted; 4: one template, counted). The 3 conversations without a
  main-idea item (B, E, H) were not touched by the pattern; 2 of them cleared.
- **Brief consequences (BRIEF-VERSIONING rule 3):** `one_template` is now named by two graders in **two consecutive
  batches** (v2 Part 1 b+c; v3 Part 2 b+c) = **blocking**, and the yield is in §1's stop band = **broken for
  conversations**. **The next listening round cuts v2**, folding in every pending lesson (1-18). Not cut here: the
  prereg fixed the frozen brief for this round.
- **No-transcript attack (recorded only):** candidate 61/96 = 63.5% (32 items) vs the identical 40 v1/v2 controls
  117/120 = 97.5%; margin -34.0; control >= 75%, so "no headroom, uninformative".
- **Staged:** `itep-listening-v3.batch.json` (8 rows) -> `itep-bank-helper.ts stage --expect 8 --apply`, 0 hash
  clashes, read back 8 of 8: verified=false 8, verified=true 0. `verify-itep-draw.ts --section listening`: pools P1 42,
  P2 40 (10 conversations), P3 66 (11 lectures); full 14/14 draw, sets whole and in authored order, live path refuses,
  every script voiceable. **Disjoint full forms: 10** (no margin: Part 2 binds at exactly 10). No audio generated;
  nothing released.
- Lessons 14-18 in `briefs/itep-slate-listening-v1.pending.md`.
