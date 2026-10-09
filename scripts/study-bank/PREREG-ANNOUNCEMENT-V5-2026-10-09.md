# announcement-v5 — pre-registered 2026-10-09, before any item exists

## Step 1: the measurement (live bank, verified=true, not archived)

`npx tsx scripts/study-bank/toefl-form-depth.ts` (TRIALS=3, 60 sittings,
real `assembleToeflFromBank`, simulated ledger; loaded counts asserted equal
to live: reading 821, listening 871, writing 347, speaking 216). Clean
sittings until the first repeat, min over trials [max]:

    path/band      clean sittings   bound by
    lower/easy           5          listening:announcement
    lower/medium         5          listening:announcement
    upper/medium        11          listening:announcement
    upper/hard          11          listening:conversation

Per section, minimum over its tasks:

    section     lower/easy  lower/medium  upper/medium  upper/hard   binding task
    reading         14          14            23          20[21]     daily_life (lower), academic_passage (upper)
    listening        5           5            11          11         announcement (lower; upper/medium), conversation (upper/hard)
    writing         16          16            16          16         arrange_words
    speaking        18          18            18          18         speaking_repeat

Only Listening is under ~8 real forms, and only on the LOWER path (5 of 5
on both lower bands). The binding task is **Announcement**: 121 live items
in 36 sets, 12 per lower-path sitting (module 1 quota 6 + lower module 2
quota 6), 6 per upper-path sitting (module 1 only).

It is a SET-SHAPE shortage, not an item shortage (REGISTER 2026-10-02,
exact-fill entry): live Announcement is 20 four-sets / 9 three-sets /
7 two-sets. A quota of 6 is 4+2 or 3+3; the 7 two-sets and 9 three-sets are
used up by sitting 5 while 13 four-sets (61 items) are still unseen.

## Sizing (scratch copy of the depth script, fake sets injected into the
## live Announcement pool, real assembler, TRIALS=3)

`scripts/study-bank/toefl-depth-work/depth-inject.ts`, outputs `inj-*.txt`
in the same folder. Baseline reproduces 5 / 5 / 11 / 11.

    injected                 lower/easy  lower/medium  upper/medium  (announcement column)
    none                          5           5            11
    6 three-sets                  7           7            14
    6 two-sets                    8           8            17
    8 two-sets                    9           9            19
    10 two-sets                  10          10            21
    12 two-sets                  11          11            23
    8 two-sets labelled medium    9           9            19   (band label does not matter)

Two-sets unlock the 13 stranded four-sets (4+2); three-sets do not. So:
**2-question sets.** +3 forms (5 -> 8) needs **6 kept two-sets**; 8 kept
gives 9. After ~12 two-sets the lower path binds on Choose a Response (11).

**Author 15 two-question sets (30 items)**, so that up to 9 sets can be
lost at the gate and the goal still holds.

## Method — the latest PASSING method for a TOEFL listening transcript set

Announcement has never had a passing authored batch (`announcement-v4` HELD
at +58.3 sibling-free; its ledger entry names the dl-fresh brief as the path
to pass). The latest passing listening-set method on the REGISTER is
`conv-hard-v2` (2026-10-02, +9.8, shipped): the DL-FRESH method (flat-prior
anchoring + form symmetry + authored atypical facts + disjoint per-author
name pools) plus revisions R1-R5. Transplanted to a single-speaker
announcement:

- Shape: passage starts `Transcript: `, one speaker, 90-170 words, plain
  campus register (library, housing, dining, registrar, recreation centre,
  club, lab safety, transport, career office, ...). Prompt tag
  `[Announcement — <setting>]`, `listeningTask: "announcement"`, two
  questions per passage, same `passageGroupId`, identical passage text.
- Every passage encodes at least one ATYPICAL fact (differs from the
  institutional default) and one REVISED fact (a usual arrangement that
  changes this time); at least one question per set has the default /
  the superseded value as a distractor.
- Flat prior: the tested detail's four alternatives are a priori equally
  likely (which day, which room, which time window, who, how many) — never
  a behaviour whose sensible answer is unique in the world; durations and
  amounts all inside the plausible band.
- Form symmetry: every option copies the key's specificity, register,
  length band, hedging and condition-shape; wrongness only via a
  passage-checkable detail. No option dismissible on manner.
- R1 purpose-of-a-line items: the line's context-free reading points to a
  named DISTRACTOR; the key is the function only the surrounding sentences
  reveal.
- R2 stems name a referent only; they never narrate the event.
- R3 no key shares a content word with its stem that no distractor shares.
- R4 detail items are crossed 2x2 grids (each name/place/time element in
  exactly two of the four options).
- R5 inference/next-step: the conclusion a reader would assume from the
  stem alone is a distractor.
- Sibling hygiene: neither question's options state or exclude the other
  question's key; neither stem restates the other.
- Cross-item variation (CLAUDE.md tell #3): question kinds, which slot of a
  grid is keyed (sometimes the earlier / superseded-looking value is right
  because the passage restores it), and the key's speech act are ASSIGNED
  per set in the commission table, not left to the author.
- Assigned key-length rank per item (1 = shortest .. 4 = longest), dealt
  flat across the 30 items.
- Disjoint per-author pools of person names, room numbers, buildings and
  phone extensions, each used at most once.

Authors: five Claude (Opus) author runs of 3 sets / 6 items each, one JSON
file per set in `scripts/study-bank/toefl-depth-work/ann5/`, at most two
subagents at a time. Freeze = assemble `announcement-v5.batch.json`, record
its sha256, chmod read-only, commit. Nothing is edited after the freeze
except the `difficulty` field (grader median, below), which is checked to
leave the rendered prompts/options/passages byte-identical.

## Gates — fixed now, not moved after any number. Stop at the first failure.

**Why the options-only number is not used here.** The model options-only
attack saturates on TOEFL MC (live Announcement: model 100%, a person 15.0%
n=20, `announcement-2026-08-05`). The matched-live-control comparison is
therefore REPORTED, NOT DECISIVE. The no-passage attack (stem + options,
transcript withheld, sibling-split) on CANDIDATE items is still run as a
gate, because that is the REGISTER's latest passing method for this family
(conv-hard-v2's primary bar) and a candidate can sit well under it (v2 +9.8,
dl-fresh -1.4 / -13.9 / -27.8). The verdict on release is a human's.

G0. **Shape pre-flight** (deterministic): 15 sets x 2; passage identical
    within a set, 90-170 words, starts `Transcript: `; 4 distinct choices,
    key verbatim; tag and listeningTask; explanation never names an option by
    position; key uniquely longest <= 35% and uniquely shortest <= 35% of
    30; `check-batch-joins.mjs` clean; passage token-Jaccard < 0.5 against
    every live Announcement passage and within batch; no person name used in
    two sets. A failure here is fixed BEFORE the freeze (it is pre-flight),
    never after.

G1. **No-passage attack** (gate). `SPLIT=2 make-attack.mjs` (one item per
    transcript per file), three Claude solver samples (Haiku) per file, forced
    choice, pick + basis + certain-reject per option, told to exploit any
    tell. Control = each file's best-fixed-letter rate derived from its key
    file. **PASS: candidate mean minus control <= +15. HOLD: > +15** — the
    batch stops, nothing is repaired or re-attacked, a RESULT file records
    the solvers' heuristics verbatim. Ceiling check: the letter control sits
    near 25-35%, so the bar is ~40-50%, inside 0-100% from both sides.
    Matched live control: the 7 live Announcement two-sets (14 items),
    same render, same solver agents; reported only (>= 85% expected).
    Correlation note (CLAUDE.md 2026-09-25): three samples of one model;
    the margin stands, per-item unanimity is not a verdict.

G2. **Elimination.** An option certain-rejected by >= 2 of 3 samples drops
    its SET. A key certain-rejected by any sample drops its set.

G3. **With-source** (gate). Three fresh Claude graders (Opus, Sonnet,
    Sonnet), transcript + the four options, key unmarked; return pick,
    second_defensible, passage_needed, difficulty. A set is dropped WHOLE if
    any grader's pick differs from the key on either item; or any grader
    names a second defensible answer I cannot refute with one quoted line of
    the transcript; or an item is solved by all 3 blind samples AND a grader
    says passage_needed=false (CLAUDE.md corroboration rule). Drop, never
    edit. One grader also hunts patterns ACROSS items; a named cross-item
    rule that would score >= 60% on the batch holds the batch.

G4. **Batch hold.** If G2 + G3 drop more than 6 of 15 sets (fewer than 9
    kept), the method is not producing at this rate: HOLD, insert nothing.

G5. **Difficulty** = median of the three graders' labels per item, written
    after grading; an easier label on a split. Never the author's label.

## Insert — STAGED, released only by a person

Insert kept sets with `BANK_COHORT=announcement-v5 BANK_VERIFIED=false
toefl-bank-helper.mjs insert-listening` (`BANK_VERIFIED` is added to the
listening inserter for this; the ACT inserter already has it). Rows exist,
the assembler ignores them; LIVE depth stays 5 until release. Projected depth
is measured by loading the staged cohort into the depth replay.

**Human sitting (release rule, fixed now).** 20 items = 10 whole sets, drawn
with `DRAW_COHORT=announcement-v5 draw-review-run.mjs "Announcement:20" 20
<co-founder reviewer id> announcement-v5-cofounder-<date>`, key slots dealt
flat (control 25%). **<= 8 of 20 (<= 40%) -> verified=true (release).
>= 12 of 20 (>= 60%) -> archive the cohort. 9-11 -> second reader.** Read
with `bank-state.mjs sittings` (fresh reviews only). The co-founder has one
open run (`ssat-wv6-cofounder-2026-10-07`) and `act-english-v9` (B16) is
queued after it, so the run is NOT drawn here; it is prepared and queued.

## Outcome reported whether or not the goal is met

Re-run `toefl-form-depth.ts` (live, unchanged expected) and the replay with
the staged cohort loaded. Goal: projected lower-path Listening >= 8 clean
sittings. Ledger entry `announcement-v5-2026-10-09`; REGISTER §5 entry in the
same commit.
