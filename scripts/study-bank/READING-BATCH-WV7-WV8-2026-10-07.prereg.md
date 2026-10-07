# SSAT Upper Reading batches WV7 and WV8 (2026-10-07): pre-registration

Committed **before any WV7 or WV8 author runs.** Results go in `READING-BATCH-WV7-2026-10-07.md` and
`READING-BATCH-WV8-2026-10-07.md`.

## Owner's decision (2026-10-07, via the coordinator)

The co-founder reads WV6 before release. That run is `ssat-wv6-cofounder-2026-10-07`, under
`ssat-reading-wv6.SITTING.PREREG.md`. Meanwhile, keep writing: WV7, then WV8. They use the same
relative bars and pipeline as WV6, plus the new lesson. **Stage what passes (`verified=false`).
Nothing is released until the co-founder's read of WV6 is in and confirms the method**, as defined
in the sitting prereg.

## The lesson from WV6, and the one construction change

WV6's single exclusivity miss was P01-5: a first-person narrator who caused the outcome, an
attitude key of "detached", and both graders defending "regretful". The licensing pre-check had
cleared that version. **In this method every attitude choice is the key in one version.** So an
indifferent-class choice puts a "no feeling" key in some world, and with a participant narrator the
implied feeling becomes a rival.

**Change:**
- The brief is `SSAT-WV7-AUTHOR-BRIEF.md`: WV6's brief plus an "observer narrator" section.
- **`ssat-wv.mjs verify`, for ids `WV7-` and later:**
  - the unit must declare `narrator_role` as observer or participant;
  - an indifferent-class attitude choice is refused unless `narrator_role` is "observer".
- The direction lexicon still requires five classes, indifferent among them, so **in practice every
  unit has an observer narrator.**
- **Break-tested before this commit** on WV6-P01 relabelled `WV7-T01`:
  - no role declared: refused;
  - "participant": refused, naming "detached";
  - "observer": passes this rule.
  - WV6's units still verify unchanged.
- **Limit, stated now:** the role is the author's own declaration. A mis-declared participant would
  pass. The human read is the backstop.

## Everything else is WV6's (by reference to `READING-BATCH-WV6-2026-10-07.prereg.md`)

- **Construction:**
  - five versions per unit, one question of each of the six kinds;
  - the NAEP lure rules;
  - SAT words-in-context vocabulary;
  - the attitude direction lexicon.
- **Pre-flight checks:**
  - mechanical verify, with A1 (`a1build` / `--a1`);
  - the licensing pre-check (`licbuild` / `--lic`; one file per version index; two judges per file;
    the fixed prompt).
- **One fix round, fresh fixers.**
  - Any edit to passage text or to a choice makes the A1 and licensing judgements stale, so they are
    re-run fresh.
  - A unit still refused fails stage 0, and with fewer than two units the batch fails.
- **Stages, stopping at the first that fails:**
  1. Stage 0: pre-flight.
  2. Freeze, draw, render, commit.
  3. Stage 1: C+F+Q.
  4. Stage 2: E, naturalness, against the same 7 Stage A live passages.
  5. Stage 3: A, options-only isolated, against the 48 live control items.
  6. Stage 4: B, grouped.
- **Bars, identical to WV6's:**
  - C >= 11/12;
  - Q >= 4/96;
  - dead-by-both <= 7/12;
  - E: candidate median >= live median;
  - A: <= in-run control + 10 points (control 10-45% or INVALID);
  - B: <= 40%;
  - F and pilot-pass reported only.
- **If every stage passes:** insert STAGED with `insert-ssat-wv.mjs` (it refuses unless all stages
  PASS), as cohort `ssat-reading-wv7` or `ssat-reading-wv8`.
  - **Not released** until the WV6 read confirms the method.
  - When it does, each batch still needs its own human read.

## The two batches

- **WV7 and WV8 are independent batches**, each with its own freeze, draw and gates. Neither batch's
  result changes the other's procedure; a WV7 failure does not stop WV8.
- **Four fresh authors, at most two at a time.** WV7 uses P01 and P02; WV8 uses P01 and P02.
- **Genres:** each batch has one history or community feature and one third-person narrative or
  science feature, all with an observer narrator.
- **Fresh topics only.** Authors are told to avoid every earlier topic:
  - kilns, pottery, bats, tunnels, boats, lighthouses, newts, salamanders;
  - clock towers, starwort, sheep grazing;
  - aspen, eelgrass, mayflies, raccoons, hawk counts.
- **Nothing from WV1-WV6 is reused or repaired.**
