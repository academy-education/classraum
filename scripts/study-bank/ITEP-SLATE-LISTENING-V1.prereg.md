# iTEP SLATE Listening v1 (pilot: 4 forms) — pre-registration

Written 2026-10-31, BEFORE any listening script, item, assignment, checker or author exists, and before any author,
probe, grader or solver has been spawned.

**Why.** Listening is the last iTEP MC section with no items. Grammar and Reading are staged (Reading at 10 disjoint
forms after v2). This pilot authors four forms' worth so the method can be judged before it is scaled.

## 0. Format (blueprint §2B; categories only, no real item read)

Per form: Part 1 = 4 short two-speaker conversations (a woman and a man, 2-3 turns), 1 question each; Part 2 = one
2-3 minute conversation, 4 questions; Part 3 = one ~4 minute lecture, 6 questions. 14 items, four options each, audio
heard once. Domains exactly as `ITEP_PART_QUOTAS.listening`: `Part 1: Short Conversations` (standalone),
`Part 2: Conversation` (4 per group), `Part 3: Lecture` (6 per group). Difficulty: Part 1 `easy`, Part 2 `medium`,
Part 3 `medium` for main-idea and detail, `hard` otherwise. Kinds (blueprint question categories): main-idea, detail,
inference, intent-next, purpose, relationship, attitude.

Lengths fixed by the brief: Part 1 20-55 words, 2-3 turns; Part 2 300-420 words, 10-20 turns (2-3 min at about 150
spoken words a minute); Part 3 480-580 words (about 3.5-4 min), and at most 3,900 characters because
`/api/study/listening/tts` refuses a segment over 4,000 and a monologue is one segment.

## 1. Brief: v1

`briefs/itep-slate-listening-v1.md` (sha256 recorded in `itep-listening-v1-work/MANIFEST.json` at the commit that
adds the assignment, before any author is spawned). First brief for this stratum. It applies, from the start, every
lesson that transfers from neighbouring strata:

1. **Shapes at random, never required or forbidden** (Reading v1 -> v2; `briefs/itep-slate-reading-v1.pending.md`):
   key-length rank per item; main-idea `whole-script options` 1 / 2 / 4 as its own axis (Reading v2 pending lesson 1);
   script-word overlap per item, `key-most` / `key-not-most` (Reading v2 pending lesson 8); question-kind order per
   script.
2. **Vary which party is right** (CLAUDE.md "identical key prose across lectures", TOEFL): per dialogue and
   conversation `opens` (woman / man) and `prevails` (woman / man / neither), per item `about` (the woman / the man),
   per lecture `stance` (supports / rejects / unsettled) and an `idea shape` (Reading v2 pending lesson 5: one plot
   template across passages).
3. **No tone-built distractors** (Choose-a-Response tell, memory `choose-response-tell`: stilted / rude /
   misread-as-resolved distractors made 94% of the CR bank blind-solvable). R3: all four options equally believable
   with the script covered, one register.
4. **Authored specific facts, flat prior** (TOEFL Daily Life: real-world priors and hedged "imply" options were the
   leak; `DL-FRESH-PREREGISTERED.md`).
5. **Sibling leaks** (bank-toefl-listening skill §1): R7, no option or prompt answers a sibling.
6. Reading v2 pending lessons 2-4 and 7 as rules: frequency words checked against schedules; "by time T" stems
   (R9); purpose stems name whose purpose; a reworded prompt keeps the options' frame.
7. **Speech naturalness and gender** (COFOUNDER-BRIEF-v2 `unnatural_speech`; voices): contractions, `W:` / `M:` turns,
   lecture speaker never gendered.

- **Method id** `itep-listening-v1-agent4+cfg-v1`. Lessons from this round go to
  `briefs/itep-slate-listening-v1.pending.md`; authors never read it.

## 2. Population (fixed now)

- **56 items in 24 units: 16 Part 1 dialogues (16 items), 4 Part 2 conversations (16), 4 Part 3 lectures (24).** Four
  fresh Claude author agents **A..D**, each writing 4 dialogues, 1 conversation and 1 lecture (14 items). Set ids
  `ITL1-<X>-D1..D4 | C | L`, qids `<set_id>-<n>`.
- **Assignment** `itep-listening-v1-work/assign.mjs` (sha256 in MANIFEST) -> `ASSIGNED.json`, `authors/<X>.md` and
  `authors/<X>.plan.json` (the author's own plan, which is what the author passes to the checker; authors never open
  `ASSIGNED.json`, the REGISTER finding from Reading v2), deterministic from seed `itep-listening-v1-assign`.
  Disjoint topic lanes (A school life, clubs, sport and health; B nature, animals, weather, earth science; C towns,
  travel, shops, jobs, history; D music, art, technology, inventions, space), disjoint name initials, 16 different
  Part 1 settings, four different conversation role pairs (A classmates; B a student and a teacher; C a teenager and
  a parent or older relative; D a student and a school staff member who is not a teacher), four different lecture
  idea shapes (change over time; a problem and its solution; a surprising result; two competing explanations).
  Kinds: Part 1 shuffled over the 16 dialogues (detail 4, inference 4, intent-next 4, relationship 2, purpose 2);
  Part 2 multisets drawn under caps (each kind at most 1 except detail at most 2, at least 1 detail), Part 3 under
  caps (main-idea, attitude at most 1; detail, inference, purpose at most 2; at least 1 detail; no relationship or
  intent-next), unique within a part, order shuffled. Per item: key length per author over all items floor(n/4)
  longest, floor(n/4) shortest, rest middle; script words balanced key-most / key-not-most per author; `about`
  balanced over the speaker-naming Part 1/2 items; per set `opens` and `prevails` from balanced cycles; lecture
  `stance` from a cycle of the three values; main-idea `whole-script options` cycled 1 / 2 / 4.
- Authors read the brief, their own two assignment files, `itep-listening-v1-work/existing-transcripts.txt` and
  `existing-names.json` (dumped by `dump-existing.mjs`: every listening transcript and passage opening in the bank,
  every capitalised word, plus the iTEP Reading v1/v2 draft names), and may run the pre-flight on their own file.
- **Nothing is edited after the packet is built.** A dropped item stays dropped; a repaired item is a new batch.

## 3. Pre-flight (structural, not the gate)

`itep-listening-v1-work/itep-listening-check.mjs` (sha256 in MANIFEST) must print `PROBLEMS 0` per author
(`--expect 14 --plan authors/<X>.plan.json --existing-names`) and over all four files (`--expect 56 --batch`) before
the probe. Exits 2 on unreadable / empty / miscounted input. It checks Reading v2's item rules (four distinct choices,
verbatim `why`/`why2`, rationales, letters, ratio <= 1.5, quotations verbatim, assigned key-length rank, gendered
pronouns, lone surface features, prompt-opening caps, shared key 4-grams, repeated options) plus, for listening:

- the transcript parses with the player's own turn regex (`parseTurns`, `src/lib/study/conversation-gate.ts`) into
  exactly the authored lines, speakers only `W` and `M`, alternating, the assigned speaker first, turn and word
  counts per part; a lecture parses as a monologue (zero turns) and is at most 3,900 characters; no stray
  `<capital>:` anywhere; no symbols or stage directions;
- `why`/`why2` verbatim inside a single turn; the assigned `script words` overlap rank; Part 1/2 prompts name the
  assigned speaker; lecture options never use he/she/him/her/his.

**Break test before the probe** (`breaktest-check.mjs`; each mutation of a real author file must fail): a
non-verbatim `why`; an inference without `why2`; a third speaker label; a stray "Plan B:" in a turn; a lecture over
3,900 characters; the wrong speaker first; a length ratio over 1.5; a key that breaks its assigned length rank; a key
that breaks its assigned script-words rank; a "she" in a lecture option; a prompt about the wrong speaker.

## 3b. Cross-item probe (before any gate grader; Reading v2's rule, unchanged)

One fresh Claude agent reads `probe/PROBE.md` and `probe/items.json` (all 56 items grouped by author and script, with
kind, transcript, choices and key marked; built by `build-probe.mjs`) and writes `probe/probe1.json`. **Decision rule,
fixed now:** a property named on 3+ items with the key carrying it in >= 75% or in 0% of the items where it varies is
a **finding**; answer-letter position in stored order is not one (stored order never reaches a grader or student,
A1.1). Each finding's items go back to their original author for one revision round (told the property and the items
only); the per-author and batch pre-flight re-run; a second probe (fresh agent, same prompt) is run and recorded.
Second-pass findings are recorded and NOT revised. If the probe names nothing, the files freeze as they are.

## 4. Gate

- **Packets:** the 56 items as ONE cohort `itep-listening-v1`, built from the frozen files by `build-packet.mjs`
  through `agent-review-core.mjs` `planPackets` / `dealPacket` with default limits. The item's `passage` is the
  stored form (`Transcript: ` + the script), exactly what the player will read. Simulated now from the population
  (16 standalone dialogues, 8 groups of 4 or 6): **2 packets, 26 / 30 items** (all 16 dialogues plus A's two sets;
  B-D's sets). build-packet refuses any other plan.
- **Graders:** three fresh Claude agents per packet, a and b plain, c adversarial (manifest prompts as Reading v2,
  plus one sentence telling every grader that students hear the transcript once and do not see it),
  `COFOUNDER-BRIEF-v2.md` (sha256 `3d032066…2ad0`). Each reads only the brief and its packet.
- **Decision rules** (`AGENT-REVIEW-SSAT-MAP.prereg.md` §3 + Amendment A1 via `agent-review-core.mjs`, no change):
  1. any grader's non-`unique` verdict drops the item;
  2. **a dropped item takes its whole set** (a Part 1 dialogue is its own set);
  3. a batch pattern named by two graders on 3+ shared items of one packet counts (letter patterns excluded, A1.1);
     its items drop with their sets; a counted union of 50%+ of the cohort's 56 items holds all of it (A1.2);
  4. no repair inside the gate. Scored only by `score.mjs`, which exits 2 writing nothing if any grader file is
     missing, malformed or short.
- **Yield bands:** 42+ of 56 survive (75%) = "brief works, scale it"; 28-41 = scale with the pending lessons queued;
  under 28, or the cohort held = "broken", cut v2 before more scripts. Parts reported separately (items and sets);
  a part under half its items is named.

## 5. The no-transcript attack: RECORDED ONLY

Run and reported, decides nothing: the model attack saturates on TOEFL listening (memory `toefl-mc-bank-guessable`:
model 93-100% where people score at chance on four of five task types), and iTEP has no human sitting. Instrument:
`oo-render.mjs` deals the candidates into 4 files, at most one item per unit per file (item k of each Part 2/3 set ->
file k, lecture items 5-6 unmeasured; Part 1 dialogues 4 per file: 16 + 16 + 16 = 48 measured), each interleaved with
the SAME 10 matched-control groups (live `toefl/listening` verified groups with 4+ four-choice items, seed
`itep-listening-v1-ctl`, first 4 items in stored order, item k -> file k; 40 control items). The **question stem is
shown** (it is on screen in the real test) and the transcript withheld. Three fresh Claude solvers per file (12).
`oo-score.mjs`: rates with denominators, margin, per-file best-fixed-letter line, unanimity per arm, batch level only.
**Bars, checked against the control's ceiling now (CLAUDE.md):** a margin of +25 or more is written up for the owner
as a signal and never applied to an item; a control at 75%+ leaves under 25 points of headroom, so +25 is
unreachable, and the run is then reported as "no headroom, uninformative" rather than as a pass.

## 6. After the gate

- Survivors -> `scripts/study-bank/itep-listening-v1.batch.json` by `build-batch.mjs` (family `itep`, section
  `listening`, domain = the part label, cohort `itep-listening-v1`, `verified=false`, `passage` = `Transcript: ` +
  script, `passage_group_id` `itep-listening-v1-<set_id>` for Parts 2-3 and null for Part 1, `created_at` increasing in
  authored question order, `verify_meta.itep` carrying speakers, setting, kind and shape). Refuses unless the
  pre-flight still passes, the score file exists and is not held, and every set is whole or absent.
- Staged through `itep-bank-helper.ts stage --expect <n> --apply`, whose stage check gains the listening rules
  (transcript prefix, W/M dialogue that the player splits into 2+ turns, monologue lecture, every TTS segment under
  the route's 4,000-character cap), pinned by jest. Read back by id (all verified=false), then
  `verify-itep-draw.ts --section listening`, which also prints the TTS segments and voices each drawn script would
  produce and their character total.
- **Audio.** TOEFL listening audio is not generated at insert: the player synthesises each (voice, text) segment on
  first play through `/api/study/listening/tts` (cached by hash), and `prewarm-toefl-audio.mjs` pre-generates only
  VERIFIED rows. So no audio is generated for staged items in this round; nothing is spent on items that may be
  dropped. Voices: today the player assigns voices by order of appearance (first speaker `nova`, female; second
  `onyx`, male), so a dialogue the man opens would be read in the woman's voice. The player and its two replicas get a
  fixed `W` -> `nova`, `M` -> `onyx` mapping (no non-archived listening transcript uses `W:`/`M:`, measured 2026-10-31: 0 of
  1,591, so no cached TOEFL clip changes). The lecture is a monologue in `nova`.
- Nothing is released. Release needs (a) the runner to treat iTEP listening as audio (today `TestSession`'s listening
  branch is keyed on `family === 'toefl'`, so an iTEP listening item would show its transcript as text), (b) a
  prewarm of the released rows, and (c) a Daniel audit sample.

## 7. Known risks, stated now

- **Three samples, not three solvers** (CLAUDE.md); an all-unique clear is weaker than it looks.
- **Graders read; students listen.** A with-transcript grader can check a key against the text at leisure; it cannot
  tell whether a fact is catchable on one hearing. The brief's §1 rule and §7 read-aloud step are the only guard.
- **Assigned shapes can become a tell** if realised mechanically (every `prevails: neither` resolved with the same
  "let's do both"). The probe and the c grader are the check.
- **Part 3 is six items per set**: at a 95% per-item clear rate a lecture survives about 74% of the time, and with
  only 4 lectures, one drop leaves 3 forms.
- **Small population**: 56 items in 2 packets; a two-grader pattern needs 3 shared items inside one packet.

## Results (2026-10-31, recorded after scoring; no decision rule changed)

- **Authoring:** 4 Claude authors, 56 items, per-author pre-flight PASS on hand-in. Batch run failed once (prompt
  opening "what does the woman" x7, cap 6), resolved by D (later in the alphabet) rewording ITL1-D-D3-1's prompt only.
  Break test 11/11 (`breaktest-check.mjs`; "inference without why2" is run by relabelling a detail item, since A has
  no inference item). **Process finding:** the authors shared the session scratchpad; D's working file was
  overwritten by another author's lecture file and D saw its opening (reported by D, nothing used; D rebuilt in its
  own subfolder). Next round: give each author its own scratch directory in the prompt.
- **Probe 1** (`probe/probe1.json`, input `probe/items-r1.json`, pre-revision files `probe/<X>.r1.json`): 9 patterns.
  Findings sent for one round (`probe/revision-r1.json`, all four authors): lecture option voicing the rejected view /
  settling an open question never keyed 0/15; "understandable but wrong" key idea reused across lectures 4/4;
  "To suggest ..." purpose option never keyed 0/7; main-idea key always the widest 6/6; intent-next key never the
  speaker's first plan 0/5; key repeats prompt words least 16/19; key's first word unique 21/27 (the last two near
  their chance rates, sent anyway because §3b's rule is literal). Not sent, judgements recorded here: **Part 1 key
  never the shortest 0/16** is fixed by the assignment (`assign.mjs` drew key length per author over all items and no
  Part 1 item drew `shortest`), so no revision could change it without breaking the plan; the comparative-option
  pattern was listed at 2/10, under the bar. Pre-flight re-run PROBLEMS 0 per author and batch.
- **Probe 2** (`probe/probe2.json`, recorded, not revised): lecture key never states the named popular belief 0/7;
  intent-next key is the sensible plan of the person in charge 5/5; main-idea narrow-episode option never keyed 0/6;
  Part 1 key never shortest 0/16 (again); **sibling cueing inside sets 5/5** (B-L-1's prompt names the thesis; D-L-5's
  four "Blind tests ..." options answer D-L-4; D-L-1's prompt echoed in D-L-2's key), most of it introduced by the
  revision round.
- **Packets:** §4's "2 packets, 26 / 30" was a hand simulation and **wrong**: `planPackets` (unchanged, default
  limits) gives **3 packets, 26 / 24 / 6** (p3 = D's lecture alone). Corrected in `build-packet.mjs` before any
  grader ran; patterns therefore count inside p3 over six items of one lecture.
- **Gate** (`score.mjs`; 3 packets x a/b/c, files in `results/itep-listening-v1--p*/`): 168 verdicts, 165 unique.
  **ITL1-A-D1-1 broken by all three** (`source_underspecified`: "Is my aunt still picking us up?" / "Mom said she'll
  be there" leaves "cousins" resting on what "she" refers to). **One counted pattern, p3 a+b cross-item cueing on
  D-L-2/4/5** (D-L-5's key restates D-L-4's and refutes its distractor) -> the whole D lecture drops (A1.2 union
  6/56, no hold). Uncounted: p2 a+b `key_form` on 2 items (the inference key names its subject where distractors say
  "They"; under 3 shared); p2 c cross-item stem leak B-L-1 -> B-L-2/3 (single grader); p1 a/b/c `key_position`
  (excluded, A1.1).
  **Cleared 49 of 56 = "brief works" band (42 is the bar).** Part 1 15/16 dialogues; Part 2 16/16 items, 4/4
  conversations; Part 3 18/24 items, 3/4 lectures. No part under half.
- **No-transcript attack (recorded only, §5):** candidate 112/144 = 77.8% (48 items) vs control 120/120 = 100.0%
  (40 live TOEFL listening items, every solver right on every one): margin -22.2, and the control has no headroom,
  so per §5 **"no headroom, uninformative"**. Solvers named general knowledge (heat acclimatisation, the violin blind
  tests, worms surviving underwater) and option shape (the one hedged option among absolutes) as their cues: the
  lecture facts are real science, which the instrument scores as a leak (CLAUDE.md, saturating families).
- **Staged:** 49 rows, `itep-listening-v1.batch.json` -> `itep-bank-helper.ts stage --expect 49 --apply` (listening
  rules on), read back 49 false / 0 true. `verify-itep-draw.ts --section listening`: pools Part 1 15, Part 2 16
  (4 conversations), Part 3 18 (3 lectures); full 14/14 draw, sets whole and in order, live path refuses; every
  drawn script voiceable (W nova, M onyx, lecture one nova segment, max 2,824 of 4,000 chars); one form's audio
  about 5,400 chars (~$0.08 tts-1 if uncached). **Disjoint full forms: 3** (Parts 1 and 3 bind). No audio generated.
- Nothing released. Lessons in `briefs/itep-slate-listening-v1.pending.md`.
