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
  /**
   * Ids of work that must land BEFORE this can start.
   *
   * Prose was carrying this and prose does not survive a skim: A3's
   * note has said "blocked on B1" since the register was written, and
   * it still had to be re-explained out loud twice. A field renders as
   * a column in both surfaces and can be checked by a test.
   *
   * A dependency is not "would be nice to have first" — it is work
   * whose OUTCOME changes whether this item happens at all.
   */
  dependsOn?: string[]
  /**
   * Who specifically, where the item is not interchangeable between
   * people. Only meaningful for owner: 'you'.
   *
   * B1 is the reason this exists. Every human number in the project
   * comes from one reviewer, so a second sitting BY THAT SAME READER
   * measures their memory of items they have already answered, not the
   * items. It would read as agreement and mean nothing.
   */
  whoSpecifically?: string
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
    whoSpecifically: 'Your co-founder, NOT you. Every existing sitting — Choose a Response, Daily Life, Announcement — is yours. Sitting it again means re-reading items you have already answered, which measures your memory rather than the items, and would read as agreement while meaning nothing. That is the exact failure this item exists to rule out.',
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
    whoSpecifically: 'Either of you. Unlike B1 these cohorts have never been read by anyone, so there is no contamination risk from the reader who did the earlier sittings.',
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
    state: 'done',
    note: 'FIXED 2026-08-06 by scripts/study-bank/apply-a10-fix.mjs — 9 items, 12 defects. The gate now reports 0 FATAL, and reverting one blank in the live bank makes it report exactly 1 again. Repaired from an EXPLICIT TABLE, not a rule: the "duplicated letter across the join" heuristic flags 27 blanks and most are real words (commissioned, planning, pollution). The item the gate proposed retiring, a1d20b7c, was repaired instead — all four of its defects are the same deterministic suffix duplication and each repair is checked against the intended word.',
    doc: 'scripts/study-bank/PRODUCTION-GATE.md',
  },
  {
    id: 'A11',
    title: '10 Email items are graded on a task they never state',
    size: '10 of 92 — 8 repaired, 2 archived as duplicates',
    why: '82 carry the ETS situation plus three bullets; these 10 state no task, while the task_fulfillment criterion grades "Task coverage" of points that were never given.',
    owner: 'claude',
    state: 'done',
    note: 'FIXED 2026-08-06 by scripts/study-bank/apply-a11-fix.mjs. Reading them changed the job three times over: two of the ten DO state their task, pasted inside the professor\'s email after the sign-off, where the student reads test instructions in a character\'s voice; four are two near-duplicate PAIRS, so one of each is archived rather than given a task list; five use a From:/To:/Subject: header that appears in none of the 82 sound items and that WritingPanels.tsx explicitly excludes from the modern format. The cohort now reads 90/90 on the ETS shape with no near-duplicate pair above 0.35.',
    doc: 'scripts/study-bank/PRODUCTION-GATE.md',
  },
  {
    id: 'A12',
    title: 'Build a Sentence repeats its opening chips across items',
    size: '18 of 118 in 8 families — 10 archived, pool 118 to 108',
    why: 'Four items begin "The book | that was recommended | by my professor". The cross-item tell this project keeps finding, in countable form for once.',
    owner: 'claude',
    state: 'done',
    note: 'FIXED 2026-08-06 by scripts/study-bank/apply-a12-fix.mjs. The stated size was wrong twice over: the "exact duplicate pair" had already gone in migration 078, and the gate\'s first-three-chips measure both over- and under-counted — it splits survey/experiment versions of one sentence into separate groups while missing that SIX items are all "the results were analyzed by the research team using advanced software". Measured by content-word family instead: 18 items in 8 families at Jaccard 0.60, of which one survivor each is kept. Now 0 items in any family at 0.60. THINNED, NOT RE-AUTHORED, on the SAT Math lesson that the rewrite is itself the risk. The 0.50 band (14 items, largest family 4) is deliberately left: it holds genuine minimal pairs such as students/principal against professor/students, which is what this task type is for. The gate still WARNs 8 first-chip collisions, and that is expected rather than unfinished: those items share an opening but are not near-duplicates overall.',
    doc: 'scripts/study-bank/PRODUCTION-GATE.md',
  },
  {
    id: 'A3',
    title: 'Rebuild Choose a Response',
    size: '72 items',
    why: 'The only cohort where the model attack and a human agree it is broken: 55.0% blind against a 25.0% control, p<0.001, plus 4 of 20 with a second defensible answer.',
    owner: 'claude',
    state: 'open',
    dependsOn: ['B1'],
    note: 'BLOCKED ON B1, and the dependency can CANCEL this rather than merely delay it: if the two readers scatter, the 55% finding is a habit of one reader and there is nothing to rebuild. Three rounds have already failed. If it does go ahead, start from the four crv2 items that passed both gates (1, 4, 10, 14), and measure with the held-out panel, which has never been spent.',
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
    size: '32 drawable sets (not 35) — no repeat until a student\'s 7th form',
    why: 'Too few source texts means repetition across forms — but MEASURED on 2026-08-06, and the urgency was overstated. The draw ranks unseen-first per student via orderGroups against study_item_exposures, and both full-test paths record into it, so a student sees no repeated Daily Life set until form 7. The pool-size-only argument implies 79.2% at TWO forms; that model is memoryless and is not this app.',
    owner: 'claude',
    state: 'open',
    note: 'DELIBERATELY NOT STARTED, and the measurement is why. The only remaining fix is authoring — no free deepening exists: all 69 single-question texts are distinct passages with no near-duplicate pair at 0.60, so nothing can be merged into a 2-question set the way A12 was thinned. And authoring here is the historically-failed path: the 2026-07-28 repair batch scored 95% with the passages DELETED and was discarded rather than banked. Doing it properly means a briefed batch gated by a blind attack (<35%), which is the same shape as A3 and should be commissioned deliberately, not slipped in. Run scripts/study-bank/check-daily-life-pool.mjs before deciding.',
    doc: 'scripts/study-bank/check-daily-life-pool.mjs',
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
    what: 'I measured Daily Life repetition with the WRONG MODEL first and got an alarming number — 79.2% chance of a repeated set by the second form. That assumes the draw has no memory. assemble.ts has ranked unseen-first at SET level since orderGroups landed, and both full-test paths write study_item_exposures, so the real answer is no repeat until form 7. The bad number would have justified an authoring programme. Both models are kept side by side in the script so the gap stays visible.',
    landedAs: 'fixed',
  },
  {
    date: '2026-08-06',
    what: 'A5 said "pool is 35 texts". It is 32 drawable sets — 133 live items, 69 of them single-question texts the draw excludes. Small, but the kind of number that gets quoted for months without anyone re-running it.',
    landedAs: 'A5',
  },
  {
    date: '2026-08-06',
    what: 'The A12 move does not transfer to Daily Life: all 69 single-question texts are distinct passages, with no exact passage match and no pair at Jaccard 0.60. There is no free deepening here — the pool can only grow by authoring, which is the path that produced a 95%-blind batch in July.',
    landedAs: 'A5',
  },
  {
    date: '2026-08-06',
    what: 'Third exact-match measure in two days to miss a paraphrase. The Build a Sentence gate counts items sharing their first three chips, so it filed "collected during the SURVEY" and "collected during the EXPERIMENT" as two separate groups while missing that six items are one sentence. Pattern across A11 and A12: an exact or n-gram measure finds the tell it was written for and nothing adjacent to it. Content-word families found both.',
    landedAs: 'fixed',
  },
  {
    date: '2026-08-06',
    what: 'The obvious survivor rule for de-duplication — keep the item with the most chips — silently strips the EASY end of a pool, because longer sentences were authored harder. On this bank it removed 5 of 25 easy items and 0 of 39 hard. Measured both ways before shipping; preferring the scarcest difficulty costs 1 easy item instead of 5. Any future thinning of any cohort should check which end its tie-break eats.',
    landedAs: 'fixed',
  },
  {
    date: '2026-08-06',
    what: 'Build a Sentence draws from a narrow lexical world — proposal/committee, results/research team, conference/experts, novel/critics recur across the pool. Thinning removed the near-identical items but not the narrowness: 30 of 108 still sit in a family at Jaccard 0.40. That is a commissioning note for the next batch, not a defect to patch, and re-authoring to fix it would risk the tell it is meant to remove.',
    landedAs: 'A12',
  },
  {
    date: '2026-08-06',
    what: 'The production gate reported 0 near-duplicate Email scenarios because it compared 4-GRAM overlap. Two pairs in the cohort are the same scenario with the professor renamed and clauses reordered — 4.2% 4-gram overlap, 0.43 content-word Jaccard. An n-gram measure cannot see a paraphrase, and both pairs sat inside the 10 items A11 was about. check-email-cohort.mjs now measures content-word overlap instead.',
    landedAs: 'fixed',
  },
  {
    date: '2026-08-06',
    what: 'The 10 defective Email items are one authoring batch, not a spread: they hold BOTH near-duplicate pairs and ALL five From:/To:/Subject: stimuli, while the other 82 have neither. Worth knowing before the next Email commission — the defect travelled with the brief, not with the cohort.',
    landedAs: 'fixed',
  },
  {
    date: '2026-08-06',
    what: 'apply-a11-fix.mjs asserts renderer parity using a COPY of WritingPanels.tsx\'s intro regex, since the component is TSX in a Next route. A copy that drifts turns that assertion into decoration. email-renderer-parity.test.ts now pins the two literals together and fails if either moves.',
    landedAs: 'fixed',
  },
  {
    date: '2026-08-06',
    what: 'The A10 repair script asserts its trim lands on the intended word — but it CANNOT catch a word that is wrong yet reachable. A break test that changed the target from "framework" to "framwork" was accepted, because trimming two characters lands there exactly. Correctness of the 12 repairs rests on the target words having been read off the passages by hand, not on the assertion.',
    landedAs: 'fixed',
  },
  {
    date: '2026-08-06',
    what: 'Build-a-Sentence keys capitalise the first word where the chip does not ("Students" vs "students"). Harmless — gradeAnswer folds case — but it means a permutation check over key and chips must fold case too, or it reports a defect that is not there. It did, on the first run.',
    landedAs: 'fixed',
  },
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
