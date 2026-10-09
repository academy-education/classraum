# announcement-v6 — pre-registered 2026-10-09, before any item exists

## Why this batch

TOEFL Listening on the LOWER path is 5 real clean forms, bound by
Announcement set shape (`PREREG-ANNOUNCEMENT-V5-2026-10-09.md`, step 1;
live Announcement 121 items = 20 four-sets / 9 three-sets / 7 two-sets, and a
quota of 6 is 4+2 or 3+3). Re-measured before this file was written
(`toefl-form-depth.ts`, TRIALS=3, loaded counts equal live: listening 871):
lower/easy 5, lower/medium 5, upper/medium 11, upper/hard 11; announcement
121 items in 36 sets binds both lower bands, 61 items in 13 four-sets and
3 three-sets unseen at the repeat. The injection replay
(`toefl-depth-work/depth-inject.ts`, real assembler, TRIALS=3) is unchanged:

    kept two-sets    lower-path clean sittings
         0                  5
         6                  8
         8                  9
        10                 10
        12                 11   (Choose a Response binds after this)

`announcement-v5` passed G1 (no-passage 27/90 = 30.0% vs a 26.7% letter
control, +3.3; live two-sets 35/42 = 83.3% through the same samples) and was
HELD at G4 because G2 dropped 9 of 15 sets. Those 30 items stay held: they
are not re-attacked, re-scored, graded or inserted here. This is a FRESH
batch of **15 two-question sets (30 items)**, so up to 9 sets can be lost at
the gates and the 6 needed for 5 -> 8 can still be kept.

## What changes from v5, and only this

**G2 uses conv-hard-v2's elimination rule — distractors only.** v5 added a
clause, "a KEY certain-rejected by any sample drops its set", on top of the
conv-hard-v2 rule. That clause is removed for this family, for a reason that
is about the design, not about v5's number:

- The method REQUIRES every announcement to encode an ATYPICAL fact (the
  arrangement differs from the institutional default) and a REVISED fact
  (the usual arrangement changes this time), and REQUIRES the default /
  superseded value to appear as a distractor. The key is therefore, by
  construction, the option that real-world priors argue against: the
  loading dock rather than the car park, 6:30 rather than 8:15, a phone call
  rather than the portal.
- A blind solver who "certain-rejects" the key is reporting exactly that
  prior. It is the design working — evidence that common sense points AWAY
  from the key — the reverse of a leak. A drop rule that fires on it removes
  the sets that are hardest to guess, and it fires more the better the
  atypical fact is built.
- What G2 exists to catch is the opposite case: a DISTRACTOR that is
  rejectable without the transcript, which shrinks the effective option set
  and is a real free elimination. That is conv-hard-v2's rule and it is
  kept unchanged (>= 2 of 3 samples, drop the whole set).
- In v5, 7 of the 9 drops were the key clause; the distractor rule alone
  drops 2 (AN5-09, AN5-10). That count is used below only as a break-test
  of the scorer, never to re-decide v5.

Key certain-rejects are still COUNTED and REPORTED (per item and in the
ledger), because a key that is certain-rejected AND then disputed by a
with-source grader is a real defect — G3 catches that on its own terms (any
grader off-key drops the set).

Everything else — method, authoring, briefs, render, instrument, bars, G0,
G1, G3, G4, G5, insert route, release rule — is v5's, restated below so this
file is complete on its own. Settings, people, rooms, buildings and phone
extensions are NEW (no v5 or live name reused), and authors are given v5's
fifteen atypical facts as a do-not-reuse list.

## Method (v5's, unchanged)

conv-hard-v2's DL-FRESH method (flat-prior anchoring + form symmetry +
authored atypical facts + disjoint per-author name pools) plus R1-R5,
transplanted to a single-speaker announcement:

- Shape: passage starts `Transcript: `, one speaker, 90-170 words, plain
  campus register. Prompt tag `[Announcement — <setting>]`,
  `listeningTask: "announcement"`, two questions per passage, same
  `passageGroupId`, identical passage text.
- At least one ATYPICAL and one REVISED fact per passage; at least one
  question per set has the default / superseded value as a distractor.
- Flat prior; form symmetry; R1 purpose-of-a-line (context-free reading is
  a named distractor); R2 stems name a referent only; R3 no key-only lexical
  echo with the stem; R4 detail items are crossed 2x2 grids; R5 the stem-
  alone assumption is a distractor; sibling hygiene.
- Question kinds (D/P/I/R), key-length rank (dealt flat over the 30 items)
  and grid-key direction (latest / earlier) are ASSIGNED per set in a seeded
  commission table, not left to the author.
- Disjoint per-author pools of person names, rooms, buildings and phone
  extensions, each used at most once; none appears in v5 or in a live
  Announcement passage.

Authors: five Claude (Opus) runs of 3 sets / 6 items each, one JSON file per
set in `scripts/study-bank/toefl-ann6-work/sets/`, at most two subagents at
a time. Author brief = v5's text with the new pools, paths, settings and the
do-not-reuse list. Freeze = assemble `announcement-v6.batch.json`, record its
sha256, chmod read-only, commit — before any solver or grader. Nothing is
edited after the freeze except `difficulty` (grader median), checked to leave
the rendered prompts / options / passages byte-identical.

## Gates — fixed now. Stop at the first failure; no repair after freeze.

G0. **Shape pre-flight** (deterministic, v5's checker pointed at the v6
    commission): 15 sets x 2; passage identical within a set, 90-170 words,
    starts `Transcript: `; 4 distinct choices, key verbatim; tag and
    listeningTask; explanation never names an option by position; key on its
    commissioned length rank and ratio <= 1.4; key uniquely longest <= 35%
    and uniquely shortest <= 35% of 30; `check-batch-joins.mjs` clean;
    passage token-Jaccard < 0.5 against every live Announcement passage,
    every v5 passage, and within batch; no person name in two sets. A G0
    failure is fixed BEFORE the freeze (pre-flight), never after.

G1. **No-passage attack** (gate). `SPLIT=2 make-attack.mjs` (one item per
    transcript per file), three Claude Haiku samples per file, v5's solver
    brief verbatim (forced pick + basis + certain_reject per item). Control
    = each file's best-fixed-letter rate from its key file.
    **PASS: candidate mean minus control <= +15. HOLD: > +15.** Ceiling:
    the letter control sits near 25-35%, so the bar sits ~40-50%, inside
    0-100% from both sides. Matched live control: the 7 live Announcement
    two-sets (14 items), same render, fresh Haiku samples; REPORTED ONLY
    (the options-only instrument saturates on TOEFL MC: live Announcement
    model 100% vs a person 15.0%, n=20). Three samples of one model:
    margins stand, per-item unanimity is not a verdict.

G2. **Elimination — conv-hard-v2's rule.** A DISTRACTOR certain-rejected by
    >= 2 of the 3 samples drops its whole SET. Key certain-rejects do not
    drop anything; they are counted and reported.
    Scorer break-test, done before any v6 item exists and committed with the
    scorer: run on v5's frozen solver files it must reproduce the distractor
    drops AN5-09 and AN5-10 (2 sets) and NOT drop the 7 key-reject sets; a
    copy with one planted distractor certain-rejected by 2 samples must drop
    that set; a planted key reject by all 3 samples must not; a planted
    distractor reject by only 1 sample must not; a solver file with a
    missing item or unreadable input must exit non-zero.

G3. **With-source** (gate). Three fresh Claude graders (Opus, Sonnet,
    Sonnet), transcript + four options, key unmarked, v5's grader brief:
    pick, second_defensible, passage_needed, difficulty, cross_item. A set
    is dropped WHOLE if any grader's pick differs from the key on either
    item; or any grader names a second defensible answer I cannot refute
    with one quoted transcript line; or an item is solved by all 3 blind
    samples AND a grader says passage_needed=false. Drop, never edit. A named
    cross-item rule that would score >= 60% of the 30 holds the batch.

G4. **Batch hold.** If G2 + G3 together drop more than 6 of 15 sets (fewer
    than 9 kept), HOLD, insert nothing.

G5. **Difficulty** = median of the three graders' labels; the easier label
    on a split. Never the author's label.

## Insert — STAGED, released only by a person

Kept sets: `BANK_COHORT=announcement-v6 BANK_VERIFIED=false
toefl-bank-helper.mjs insert-listening announcement-v6.keep.json
announcement-v6.batch.json`, behind the ledger gate (shape, nosource,
elimination, withsource, tells, all at the inserted file's sha). Rows exist
with verified=false; the assembler ignores them, so LIVE depth stays 5 until
release. After insert, re-run `toefl-form-depth.ts` (live; expected
unchanged) and the replay with the staged cohort loaded (projected).

**Human sitting (release rule, v5's).** 20 items = 10 whole sets, drawn with
`DRAW_COHORT=announcement-v6 draw-review-run.mjs "Announcement:20" 20
<co-founder id> announcement-v6-cofounder-<date>`, key slots dealt flat
(control 25%). **<= 8 of 20 -> verified=true (release). >= 12 of 20 ->
archive the cohort. 9-11 -> second reader.** Read with `bank-state.mjs
sittings`. If the co-founder has an open run on the day, the run is prepared
and queued, not drawn. With fewer than 10 kept sets the sitting is all kept
items.

## Outcome reported whether or not the goal is met

Live and projected depth; numbers with denominators; staged count. Ledger
entry `announcement-v6-2026-10-09`; REGISTER §5 entry in the same commit.
