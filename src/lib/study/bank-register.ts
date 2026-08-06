/**
 * The question-bank register — ONE source, two renderings.
 *
 * ── Why this is a module and not a markdown file ─────────────────────
 * The register started as `scripts/study-bank/REGISTER.md`, written by
 * hand, and the admin page described the same work in its own words.
 * Two hand-maintained copies of one list is how the list stops being
 * true: the page said the bank was 0% done for a day after the evidence
 * had changed, and findings were landing in commit messages nobody
 * re-reads.
 *
 * So the work items live here, typed. `/admin/bank-qc` imports this,
 * and `scripts/study-bank/render-register.mjs` regenerates the markdown
 * from it. Editing one place updates both; editing the markdown by hand
 * is overwritten on the next render, which is the point.
 *
 * Cohort STATE is deliberately NOT here — it is measured, not declared,
 * and the live route reads it from the database every load. Anything in
 * this file is a decision or a plan; anything measured comes from the
 * bank itself.
 */

export type Owner =
  /** Doable now, no approval and no human sitting required. */
  | 'claude'
  /** Needs a person: a reviewer sitting, a device, a judgement call. */
  | 'you'

export type WorkState = 'open' | 'blocked' | 'done'

export interface WorkItem {
  id: string
  title: string
  /** Concrete size, so "small fix" cannot hide a 36-item job again. */
  size: string
  /** Why it matters, in one sentence a non-specialist can act on. */
  why: string
  owner: Owner
  state: WorkState
  /** What this unblocks, or what would cancel it. */
  note?: string
  /** Result document, if one exists. */
  doc?: string
}

/**
 * Open work. Ordered by what I would do next, not by size.
 *
 * A3 is deliberately listed AFTER B1 in priority terms even though it
 * is the biggest job: one overlapping sitting could cancel it outright,
 * and rebuilding 72 items on evidence from a single reader would be the
 * expensive version of being wrong.
 */
export const WORK: WorkItem[] = [
  {
    id: 'B1',
    title: 'One overlapping sitting by a second reviewer',
    size: '~20 minutes',
    why: 'Every human number in the project rests on one person. A second reader on the SAME items decides whether the Choose a Response finding is a property of the items or a habit of that reader.',
    owner: 'you',
    state: 'open',
    note: 'Unblocks everything. If the two readers scatter, A3 is cancelled rather than started.',
  },
  {
    id: 'A1',
    title: '"space permitting" is misused across Daily Life',
    size: '10 of 36 items repaired',
    why: 'Used as a generic hedge where the sense is not spatial — "available three days a week, space permitting". One phrase doing the work of five.',
    owner: 'claude',
    state: 'done',
    note: 'Repaired where the phrase was only in the passage. The other 26 items are A6 — a different job, because their QUESTION is about the phrase.',
    doc: 'scripts/study-bank/DAILY-LIFE-DEFECTS.md',
  },
  {
    id: 'A6',
    title: 'Items whose QUESTION is about the misused phrase',
    size: '15 items — 10 repaired, 5 repointed',
    why: 'Stems like "What does \'space permitting\' mean in the context of this job ad?" — where the ad says "available at least three nights a week, space permitting", which is not English. The item asks a student to interpret a phrase that is being used wrongly.',
    owner: 'claude',
    state: 'done',
    note: 'Repaired where a correct hedge fit and the stem could requote it; repointed to a different question where none did. Two real defects found in passing: one key was backwards (a waitlist exists BECAUSE a class fills), and one key was the only supplies-related option, so it was pickable from the stem alone.',
    doc: 'scripts/study-bank/DAILY-LIFE-DEFECTS.md',
  },
  {
    id: 'A2',
    title: 'Ambiguous pronoun in the "roommate" item',
    size: '1 option',
    why: '"their roommate" can be read as either party\'s. That ambiguity — not a wrong key — is what the reviewer objected to.',
    owner: 'claude',
    state: 'done',
    note: 'Explicitly NOT a re-key. The key is defensible; re-keying on a pronoun misreading would be the wrong correction made confidently.',
    doc: 'scripts/study-bank/DAILY-LIFE-DEFECTS.md',
  },
  {
    id: 'B2',
    title: 'Sittings on Academic Talk and Craft and Structure',
    size: '~20 minutes each',
    why: 'Roughly 486 items currently sit as "the model says guessable, nobody checked".',
    owner: 'you',
    state: 'open',
    note: 'Daily Life and Announcement both came back clean under a human, so these plausibly are too.',
  },
  {
    id: 'A4',
    title: 'A gate for the production/cloze cohorts',
    size: '396 items genuinely unchecked, not 541',
    why: 'These have no options to withhold, so the blind attack does not apply. 12 detectors now replay the real code paths — gradeAnswer(), the TestSession chip pool, parseDiscussionSpeakers() — so a finding is a fact about the product rather than an opinion about the writing.',
    owner: 'claude',
    state: 'done',
    note: 'Corrected the premise: Listen and Repeat and Interview already had passing verifiers, so 2 of the 6 cohorts were covered. Deliberately REJECTED a Complete-the-Words ambiguity check that fired on 42% of blanks rather than ship a sixth structural proxy.',
    doc: 'scripts/study-bank/PRODUCTION-GATE.md',
  },
  {
    id: 'A10',
    title: '12 items cannot be graded correctly — students marked wrong for right answers',
    size: '1 Build a Sentence + 11 blanks across 8 Complete the Words',
    why: 'A Build-a-Sentence key ends in a full stop no chip carries, and grading folds only case and whitespace, so NO tap order scores correct. Eight cloze items spell misspellings — futuure, dioxxide, acttion, framewwork — with the wrong number of letter boxes.',
    owner: 'claude',
    state: 'open',
    note: 'Student-facing and unambiguous. Highest priority of anything open; needs no measurement, only repair.',
    doc: 'scripts/study-bank/PRODUCTION-GATE.md',
  },
  {
    id: 'A11',
    title: '10 Email items are graded on a task they never state',
    size: '10 of 92',
    why: '82 carry the ETS situation plus three bullets; these 10 state no task, while the task_fulfillment criterion grades "Task coverage" of points that were never given.',
    owner: 'claude',
    state: 'open',
    doc: 'scripts/study-bank/PRODUCTION-GATE.md',
  },
  {
    id: 'A12',
    title: 'Build a Sentence repeats its opening chips across items',
    size: '28 of 119, plus 1 exact duplicate pair',
    why: 'Four items begin "The book | that was recommended | by my professor". The cross-item tell this project keeps finding, in countable form for once.',
    owner: 'claude',
    state: 'open',
    doc: 'scripts/study-bank/PRODUCTION-GATE.md',
  },
  {
    id: 'A3',
    title: 'Rebuild Choose a Response',
    size: '72 items',
    why: 'The only cohort where the model attack and a human agree it is broken: 55.0% blind against a 25.0% control, p<0.001, plus 4 of 20 with a second defensible answer.',
    owner: 'claude',
    state: 'open',
    note: 'Three rounds have failed. Start from the four crv2 items that passed both gates (1, 4, 10, 14), and measure with the held-out panel, which has never been spent.',
    doc: 'scripts/study-bank/CRV3-RESULT.md',
  },
  {
    id: 'A8',
    title: 'Attack measurements are not bound to the content they measured',
    size: 'fixed — migration 077',
    why: 'Migration 076 bound REVIEWS to item content. study_item_attacks got no such binding, so the 5 repointed items still carry a blind score describing the question they no longer ask — and the dashboard reads the latest attack per item.',
    owner: 'claude',
    state: 'done',
    note: 'study_item_attacks.item_sha + trigger + study_item_attacks_fresh, and the live route now reads the view. The 5 repointed items were deliberately left unbound so they read as unmeasured rather than measured-and-passing.',
    doc: 'database/migrations/077_bind_measurements_to_content.sql',
  },
  {
    id: 'A7',
    title: 'content_hash is not reproducible — answered',
    size: '2,681 of 4,838 rows match nothing',
    why: 'Five live definitions, not two, selected by cohort; no SQL writer at all; and 36% of the bank was written by a harvest script that git log cannot find in any commit. ~22,000 candidate definitions were tried against those 1,761 rows with zero matches.',
    owner: 'claude',
    state: 'done',
    note: 'Do NOT backfill — for 55% the input is gone, so a repair would be invention. Leave the column alone, as this session\'s edits did.',
    doc: 'scripts/study-bank/CONTENT-HASH-FINDING.md',
  },
  {
    id: 'A9',
    title: 'The duplicate guard does not guard against duplicates',
    size: 'fixed — migrations 077 + 078',
    why: 'The unique partial index on content_hash reads as a uniqueness guarantee. A re-harvest computes a hash under a different definition, so it misses both the in-memory seen set AND the index, and the duplicate inserts cleanly. This has already happened once — migration 062 records "28 items, 14 distinct prompts".',
    owner: 'claude',
    state: 'done',
    note: 'Two GENERATED ALWAYS columns, because nine scripts rewrite items and one remembers to update a hash: content_sha (exact, for measurement binding) and dedup_key (order-insensitive, for duplicates), plus a unique index. 077 shipped dedup_key ordering by the literal 1 — a constant inside an aggregate ORDER BY, not a position — so it was order-SENSITIVE and passed vacuously on 3,341 distinct keys. 078 fixed it and the 2 real duplicates archived.',
    doc: 'database/migrations/078_fix_dedup_key_ordering.sql',
  },
  {
    id: 'A5',
    title: 'Deepen the Daily Life reading pool',
    size: 'pool is 35 texts',
    why: 'Too few source texts means repetition across forms.',
    owner: 'claude',
    state: 'open',
  },
  {
    id: 'B3',
    title: 'TestFlight device pass, iOS 1.0.4',
    size: '—',
    why: 'Unrelated to the bank, still open.',
    owner: 'you',
    state: 'open',
  },
]

export interface Settled {
  title: string
  finding: string
  doc?: string
}

/**
 * Closed questions. Listed so they are not re-litigated — several of
 * these cost a full measurement cycle to answer, and two of them are
 * negatives that look like obvious ideas from the outside.
 */
export const SETTLED: Settled[] = [
  {
    title: 'SAT Math derivational hub',
    finding: 'Claimed "bank-wide, 64.4%". It was 131 items of 820. All repaired; both cohorts now score BELOW chance.',
    doc: 'scripts/study-bank/MATH-HUB-RESULT.md',
  },
  {
    title: 'The cheap elimination gate cannot replace the blind attack',
    finding: 'Fires on 3 of 32 items in a repaired batch. Once distractors are well-formed it stops correlating with anything.',
    doc: 'scripts/study-bank/CRV3-RESULT.md',
  },
  {
    title: 'The option-balance check does not work',
    finding: 'Predicted a 2.7pt spread across three batches whose real margins spanned +14.6 to +40.4, and its inputs were not reproducible between labellers.',
    doc: 'scripts/study-bank/OPTION-BALANCE-RESULT.md',
  },
  {
    title: 'Figures do not leak their answers',
    finding: '0 leaks across 164 graphics, with a 7-fixture self-test proving the checker fires on real ones and stays quiet on well-formed charts.',
    doc: 'scripts/study-bank/check-graphic-leak.mjs',
  },
  {
    title: 'Reviews are bound to the content they judged',
    finding: 'Migration 076 applied. Scoring reads study_item_reviews_fresh, so editing a reviewed item visibly invalidates its review instead of silently keeping it.',
    doc: 'database/migrations/076_review_content_binding.sql',
  },
  {
    title: 'The grader is not calibrated, and cannot be from public data',
    finding: 'Only two scored ETS samples exist for our task types. Do not tune prompts against them — two items cannot support fitting.',
  },
]

/**
 * Things discovered WHILE fixing something else.
 *
 * Appended in the same commit as the work that surfaced them. A finding
 * that lives only in a commit message is a finding nobody reads, and
 * that is exactly how "three small data defects" stayed unreconciled
 * long enough to become one 36-item problem, one disagreement with the
 * reviewer, and one non-issue.
 */
export interface Found {
  date: string
  what: string
  /** Where it went: a work item id, or 'fixed' if closed on the spot. */
  landedAs: string
}

export const FOUND_WHILE_FIXING: Found[] = [
  {
    date: '2026-08-06',
    what: 'string_agg(expr, \'|\' order by 1) sorts by a CONSTANT, not by position — aggregate ORDER BY does not take positional references. The "order-insensitive" dedup key was order-sensitive and its unique index passed on 3,341 distinct keys over 3,341 rows, missing both known duplicates.',
    landedAs: 'fixed',
  },
  {
    date: '2026-08-06',
    what: 'The "541 never measured" figure was wrong: Listen and Repeat (97) and Interview (48) already had passing verifiers. 396 items were genuinely unchecked, and every finding landed in those.',
    landedAs: 'A4',
  },
  {
    date: '2026-08-06',
    what: 'Whether a Build-a-Sentence item has a SECOND grammatical ordering — its defining defect — is not decidable and remains unchecked on 118 items. Recorded rather than papered over with a proxy.',
    landedAs: 'A12',
  },
  {
    date: '2026-08-06',
    what: 'Nine scripts rewrite item content and leave content_hash stale; only apply-math-hub-repair recomputes it. And updated_at is useless as a mutation signal — there is no trigger, so 751 repaired rows read as "never updated".',
    landedAs: 'A9',
  },
  {
    date: '2026-08-06',
    what: 'A Biology 102 item was keyed backwards — "there may be no waitlist if the class is too full", when a waitlist exists BECAUSE a class fills. Found while repairing the phrase, not by any gate.',
    landedAs: 'fixed',
  },
  {
    date: '2026-08-06',
    what: 'A clean-up flyer item had the key as the only supplies-related option, so it was pickable from the stem without the passage. In a cohort that passed its human sitting.',
    landedAs: 'fixed',
  },
  {
    date: '2026-08-06',
    what: 'Repointing an item leaves its old attack score attached to a question it no longer asks. Reviews are content-bound since 076; attacks are not.',
    landedAs: 'A8',
  },
  {
    date: '2026-08-06',
    what: '15 of the 36 "space permitting" items have the phrase in their PROMPT or EXPLANATION — the question is about the phrase. Changing the passage would orphan the stem, so those are an item rewrite rather than a text fix.',
    landedAs: 'A6',
  },
  {
    date: '2026-08-06',
    what: 'content_hash matches NEITHER hash definition in this repo on 163 of 200 sampled rows. Any recomputation would be a guess, so passage edits deliberately leave it alone.',
    landedAs: 'A7',
  },
  {
    date: '2026-08-06',
    what: '"space permitting" was reported on 3 items. It is on 36, across 25 passages — 27% of the Daily Life cohort.',
    landedAs: 'A1',
  },
  {
    date: '2026-08-06',
    what: 'The reported mis-key is not one. The objection turns on an ambiguous pronoun, not a wrong answer.',
    landedAs: 'A2',
  },
  {
    date: '2026-08-06',
    what: 'The near-duplicate pair lives in choose-response-repair-v1, the REJECTED repair, which was never inserted.',
    landedAs: 'A3',
  },
  {
    date: '2026-08-06',
    what: 'The review endpoint used .limit(5000) with a comment claiming it defeated PostgREST\'s 1000-row cap. It does not.',
    landedAs: 'fixed',
  },
  {
    date: '2026-08-06',
    what: 'apply-math-hub-repair.mjs globbed math-hub-*.json, so any new file with that prefix was silently pulled into unrelated runs.',
    landedAs: 'fixed',
  },
]

/** Counts for the dashboard header. */
export function registerSummary(work: WorkItem[] = WORK) {
  const open = work.filter(w => w.state !== 'done')
  return {
    open: open.length,
    mine: open.filter(w => w.owner === 'claude').length,
    yours: open.filter(w => w.owner === 'you').length,
    done: work.filter(w => w.state === 'done').length,
  }
}
