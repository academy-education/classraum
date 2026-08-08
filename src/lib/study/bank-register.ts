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
  /**
   * The login the sitting must be done under.
   *
   * Separate from `whoSpecifically` because prose cannot be checked, and
   * this exact mistake was made while writing that prose: B1 and B2 were
   * both pointed at andy.manager@ for a few minutes, which would have
   * merged two people into ONE reviewer_id — the precise failure B1
   * exists to detect. A field makes it a test.
   *
   * Reviewer identity IS the account: study_item_reviews keys on the
   * logged-in user, so an account shared by two humans stops being one
   * reviewer and no agreement number from it can be trusted again.
   */
  account?: string
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
    account: 'andy.manager@gmail.com',
    whoSpecifically: 'Your co-founder, on andy.manager@gmail.com — NOT on support@classraum.com. Checked 2026-08-06: all 72 existing reviews were sat on support@, so that account IS the first reviewer. A second sitting there would carry the same reviewer_id, reviewerAgreement would see one reviewer, and B1 would return nothing while looking like it had run. Both accounts are already super_admin, so nothing needs creating. In the app: Bank QC → Review → "Or sit someone else\'s run, item for item" → choose-a-response-2026-08-05. The route refuses a same-account mirror.',
    state: 'done',
    note: 'DONE 2026-08-06 — and the pre-registration does NOT get to claim the result. Reviewer 2 scored 3/20 = 15.0% with 17 "can\'t tell"; reviewer 1 scored 11/20 = 55.0% with none. That fires the pre-registered "<=35% -> CANCEL A3" branch, but the branch\'s stated reasoning is "reviewer 1 was reading something idiosyncratic", and on all 3 items reviewer 2 committed to, both readers picked the SAME option, both were right, and reviewer 2 annotated two of them "Too obvious." The two numbers measure different things: the B1 brief was written on 08-06, AFTER reviewer 1 sat on 08-05, and it pushes hard on using "Can\'t tell". The instrument changed between the two sittings, so the pre-registration is VOID rather than decisive. A3 was neither started nor cancelled on this — it was decided by a fresh blind attack instead, which is recorded on A3.',
    doc: 'scripts/study-bank/B1-PREREGISTERED.md (decision rule) + B1-REVIEWER-BRIEF.md (sent to the reviewer)',
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
    account: 'support@classraum.com',
    whoSpecifically: 'You, on support@classraum.com — the account your 72 existing reviews are already under. NOT andy.manager@: that one is now your co-founder\'s for B1, and two people sharing one login would merge into a single reviewer_id, which is the precise failure B1 exists to detect. Unlike B1 these cohorts have never been read by anyone, so there is no contamination risk in the ITEMS; the constraint here is purely that one human keeps one account for good, because reviewer identity IS the account. Use the normal "Start a sitting" draw, not a mirror.',
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
    why: 'Re-measured 2026-08-06 after a targeted repair: 74.4% blind against a 29.2% control, +45.1pts, with 40 of 65 items solved by all three solvers independently. Accuracy when a solver COMMITS to an answer is ~92%, with no audio. These are not listening questions.',
    owner: 'claude',
    state: 'open',
    note: 'UNBLOCKED, and the cheap version has been TRIED AND REFUTED. The narrow repair — rewrite only the defective distractors rather than rebuild — removed the one exactly-checkable defect (a "wrong register" option that is a slot in the cr-v1 authoring brief: 24/56 cr-v1, 0/14 cr-v2, 0/2 harvest-v1) and moved the blind score by ~3 points: repaired items 72.2%, untouched 75.6%. I predicted 28.4% beforehand and was wrong by 46 points. cr-v2 is NOT a template to author toward — it scores lower only because solvers abstain more, and its committed accuracy is identical at 92.0%. CAUSE: the four-slot distractor brief — one accept-and-act key plus a parodic over-formal option, a rude/escalating one, a dismissive minimiser and a topic-shifting question. All three solvers described it unprompted. Removing one slot leaves three and the key is still the option that is none of them. THE REBUILD NEEDS: (1) a new brief whose load-bearing property is that EVERY option must be a natural reply to SOME plausible prompt, so the question is which fits the line actually spoken — and which must NOT specify a new fixed roster of distractor types, because a fixed roster is what produced this tell; (2) the blind attack run DURING authoring on a held-out slice, not after the batch, since re-authoring this task type produced a 95%-blind batch in July and three rounds have already failed; (3) care that a distractor is not wrong in a way visible WITHOUT the prompt — one of the 24 replacements written today was self-contradictory and solvers cracked it on that alone. Three further register items found by a solver and not repaired (25eca95b, 17d5acca, 012fc0d9); moot if cr-v1 is re-authored. Note the items are STILL SERVED to students today.',
    doc: 'scripts/study-bank/CR-POSTREPAIR-RESULT.md (the refutation) + CRV3-RESULT.md (the earlier failed round)',
  },
  {
    id: 'A14',
    title: 'The authoring gates are documented more thoroughly than they are wired',
    size: '4 findings, 249 items with no reproducible insert path',
    why: 'Four separate gaps between what the runbooks say the authoring pipeline does and what the scripts actually execute. None was caught by a test, because the tests cover the functions rather than whether the functions are called.',
    owner: 'claude',
    state: 'open',
    note: 'FOUR THINGS, in the order I would fix them. (1) shuffleInPlace is dead in both SAT helpers — defined, never called — while its own comment and the adjacent REJECT message both claim choices are shuffled at insert. Measured before acting: key position is SAT v2 30/27/23/20, nothing near the 40% line, so no damage has been done and authors complied by hand. Wiring it changes what gets banked, so it is a decision. (2) accepts() carries two carve-outs the runbook never mentions: Standard English Conventions is a full bypass requiring unanimous 3/3, and Expression of Ideas / Rhetorical Synthesis returns ok before the distractor and passage checks. (3) fill_in_blanks, speaking_interview and arrange_words have NO insert command, yet 249 such items are live — they entered by a path that no longer exists, and new ones have nowhere to go. (4) The TOEFL ledger gate is called from insertListening only; insertRepeat and insertWriting bypass it entirely. Fixed on the spot alongside these: the positional-explanation REJECT branch threw a ReferenceError every time it fired, killing the whole insert run.',
  },
  {
    id: 'A13',
    title: 'Explanations cite option positions that do not match the stored order',
    size: 'MEASURED 2026-08-07 — 63 live items provably wrong, 131 at risk',
    why: 'Student-facing. Explanations refer to options by ordinal ("the second ignores the qualifier") and the ordinals are the order at AUTHORING time, not the order in item.choices. Options have been reshuffled since (see migration 078), so a student reading why they got an item wrong is told the wrong thing about which option was which.',
    owner: 'claude',
    state: 'open',
    note: 'MEASURED, per the Math-hub rule, before deciding anything — `scripts/study-bank/check-explanation-ordinals.mjs`, no model calls. Of 3,327 live items, 131 cite a position at all and 63 (1.9% of the bank) are PROVABLY wrong: the cited position holds the KEY while the sentence describes a distractor. By cohort: v2 37, cr-v1 16, orphan-v1 5, v3-claude 3, talk-c1 1, talk-c2 1 — two cohorts hold 84%, so this is NOT bank-wide and a blanket rewrite would be the Math-hub mistake again. 63 is a LOWER BOUND: a distractor cited as a different distractor is equally wrong and not decidable this way, so the true figure is between 63 and 131. CORRECTION to what this entry said before: the claim that "the 24 cr-v1 repairs written 2026-08-06 quote the option instead of numbering it and are already correct" is FALSE — 10 of those 24 still number options, and 8bcce6b3, one of the repaired items, is still wrong (key at position three, yet "the third" is described as a distractor). The repair fixed the register tell it was aimed at and left this one untouched, which is why it needs its own check rather than an assumption. The detector self-tests on 4 fixtures and refuses to run if any fail.',
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
    what: 'bank-helper.mjs REJECT branch for positional explanations threw a ReferenceError every time it fired — `id` is not in scope (the variable is `label`) and `rejected` was never declared, so under strict mode it killed the whole insert run rather than skipping one item. That is why it survived: the check had evidently never fired on a real batch. Fixed and break-tested with an item whose explanation says "Choice 2" — it now prints REJECT, continues, and exits 0.',
    landedAs: 'fixed',
  },
  {
    date: '2026-08-06',
    what: 'shuffleInPlace is DEAD CODE in both SAT helpers. It is defined in bank-helper.mjs and math-bank-helper.mjs and called from neither, so SAT items are banked in the order they were authored — while a 20-line comment above it, and the REJECT message beside it, both assert "choices are shuffled at insert". The TOEFL helper does call it (lines 207 and 313), so this is SAT-only. MEASURED before believing it mattered: key position across live 4-choice items is SAT v2 30/27/23/20, TOEFL cr-v1 25/16/25/34, nothing at or near the 40% failure line. So the guard is absent and the outcome is currently fine — authors complied with the spec by hand. Enforcement is missing, not broken; a future batch that clusters would not be caught. Wiring it up changes what gets banked, so it is left as a decision rather than done silently.',
    landedAs: 'A14',
  },
  {
    date: '2026-08-06',
    what: 'The SAT accept rule in code does not match the runbook prose. RUNBOOK.md says "key_votes >= 2 AND difficulty AND distractors AND (passage_needed OR domain is Standard English Conventions)". accepts() actually makes Conventions a FULL BYPASS requiring UNANIMOUS 3/3 and skipping the difficulty and distractor grades entirely, and adds a second bypass the runbook never mentions — Expression of Ideas / Rhetorical Synthesis returns ok before the distractor and passage checks. Two undocumented carve-outs in the one gate that decides what enters the SAT bank. Document the code, not the prose.',
    landedAs: 'A14',
  },
  {
    date: '2026-08-06',
    what: 'Three TOEFL item types have NO insert path in toefl-bank-helper.mjs — fill_in_blanks, speaking_interview and arrange_words have no insert-<type> command, and listeningShapeOk requires multiple_choice with 4 choices so they cannot go through insert-listening. Yet Complete the Words (93), Interview (48) and Build a Sentence (108) all sit in the live bank: 249 items entered through a path that is not the documented one and cannot be reproduced today. Anything authored for those types now has nowhere to go.',
    landedAs: 'A14',
  },
  {
    date: '2026-08-06',
    what: 'The TOEFL ledger gate runs on ONE of three insert paths. gateBatch() is called from insertListening only; insertRepeat and insertWriting never call it, so speaking_repeat, writing_email and writing_discussion enter the bank with no gate check at all. gate.mjs exists on the reasoning that "a documented gate nobody runs is an instruction, and this project\'s whole thesis is that instructions do not hold and gates do" — and it is wired into a third of the paths it was written for.',
    landedAs: 'A14',
  },
  {
    date: '2026-08-06',
    what: 'The narrowed A3 — repair the defective distractors rather than rebuild — is REFUTED by measurement. Post-repair blind attack (65 items, 3 solvers): 74.4% against a 29.2% control, +45.1pts, 40/65 solved by all three. I predicted 28.4% beforehand and was wrong by 46 points, in the direction that flattered the work. Repaired items 72.2%, untouched 75.6% — the repair bought ~3 points. The decisive column is accuracy on COMMITTED picks: ~92%, in both cohorts, repaired and not. cr-v2 looks better on blind only because solvers abstained more; identical committed accuracy, so it is not a template to author toward. Full write-up in scripts/study-bank/CR-POSTREPAIR-RESULT.md.',
    landedAs: 'A3',
  },
  {
    date: '2026-08-06',
    what: 'Why the repair could not have worked: all three solvers independently and unprompted described the same four-slot structure — one accept-and-act reply plus a parodic over-formal option, a rude/escalating one, a dismissive minimiser and a topic-shifting question. Removing ONE slot leaves three, and the key is still the option that is none of them. A symptom of the brief was treated as the defect. The missing brief property: every option must be a natural reply to SOME plausible prompt, so the question is which fits the line actually spoken — and the fix cannot specify a new fixed roster of distractor types, because a fixed roster is what produced the tell.',
    landedAs: 'A3',
  },
  {
    date: '2026-08-06',
    what: 'Fourth exact/proxy measure in two days to miss its adjacent cases. The explanation-based detector found 24 register distractors in cr-v1; a blind solver quoted three more it had missed (25eca95b, 17d5acca, 012fc0d9), all the same designed slot, missed because their authors wrote "consent-form language no patient would speak aloud" and "absurdly formal for a moment\'s favour" rather than the vocabulary the regex carried. The detector was reading the author\'s PROSE as a proxy for the author\'s ITEM, and prose varies. After Email 4-grams, Build-a-Sentence first-3-chips and the SAT Math hub: treat any measure over authoring metadata as pre-flight only.',
    landedAs: 'fixed',
  },
  {
    date: '2026-08-06',
    what: 'Two tells the solvers found for free, neither measured. (a) A stray em dash in a position natural prose would not use ("...notified — of the theft", "...been acting up — for a couple of weeks now"), which solver B reports was never the plausible reply — exactly checkable. (b) Items decidable with NO prompt at all by eliminating an internally incoherent option. (b) is a caution about repair work itself: one of the 24 replacements written today ("so the sealed copy comes through by email as well, then?") is self-contradictory and was solved on that basis. Writing a distractor that is "cooperative but wrong" risks making it wrong in a way visible without the prompt.',
    landedAs: 'A3',
  },
  {
    date: '2026-08-06',
    what: 'The "wrong register" distractor in Choose a Response is a SLOT IN ONE AUTHORING BRIEF, not a property of the bank: 24/56 cr-v1 (42.9%), 0/14 cr-v2, 0/2 harvest-v1. Same shape as the SAT Math hub — a defect that reads bank-wide and is one cohort. All 24 were repaired with replacements natural in register, cooperative in tone and wrong on content, failure modes deliberately varied; both detectors then read 0/72. It removed a real, provable defect and did not fix the cohort, which is recorded separately.',
    landedAs: 'A3',
  },
  {
    date: '2026-08-06',
    what: 'attack-cohort.mjs `prepare` built its "already measured" set from the RAW study_item_attacks table rather than study_item_attacks_fresh. Migration 077 binds attacks to content_sha for exactly this reason, and the view\'s own comment says a blind score presented as evidence must come from it. Effect: once an item was repaired, its old blind score — over option text that had just been deleted — counted as coverage FOREVER, and prepare would never offer that item again. 6 items bank-wide when found; it grows with every repair. Break-tested: 65 items offered with the fix, 59 without.',
    landedAs: 'fixed',
  },
  {
    date: '2026-08-06',
    what: 'Explanations cite options by POSITION ("the fourth is far too formal") and the positions do not match the stored choice order — in 8bcce6b3 the explanation\'s "fourth" is option A. Options have been reshuffled since authoring (see migration 078), so a student reading why they got an item wrong is told the wrong thing about which option was which. Student-facing, scope unmeasured, exactly checkable — measure the whole population before acting, per the Math-hub lesson. The 24 repairs written today quote the option text instead of numbering it.',
    landedAs: 'A13',
  },
  {
    date: '2026-08-07',
    what: 'A13 measured, and the entry recording it was itself wrong. `check-explanation-ordinals.mjs` (no model calls, self-tests on 4 fixtures first): 131 of 3,327 live items cite an option by position, and 63 are PROVABLY wrong — the cited position holds the key while the sentence describes a distractor. Concentrated in v2 (37) and cr-v1 (16); 84% in two cohorts, so a bank-wide rewrite would repeat the Math-hub mistake. 63 is a lower bound, since a distractor cited as a different distractor is equally wrong and not decidable this way. THE CORRECTION: A13 asserted "the 24 cr-v1 repairs written 2026-08-06 quote the option instead of numbering it and are already correct". 10 of those 24 still number options, and 8bcce6b3 — the item A13 used as its own illustration — is STILL WRONG after being repaired. Its key sits at position three and the explanation calls "the third" a distractor. The repair fixed the register tell it targeted and never looked at the ordinals, and the register then recorded the untested assumption as fact. Found only because the claim was checked against the live row instead of re-read.',
    landedAs: 'A13',
  },
  {
    date: '2026-08-06',
    what: 'B1 landed at 15.0% and the pre-registration does NOT get to claim it. Reviewer 2 scored 3/20 with 17 abstentions against reviewer 1\'s 11/20 with none, firing the "<=35% -> CANCEL A3" branch — but that branch\'s stated reasoning is "reviewer 1 was reading something idiosyncratic", and on all 3 items reviewer 2 committed to, both readers picked the same option, both were right, and reviewer 2 wrote "Too obvious." The B1 brief was written AFTER reviewer 1 sat and pushes hard on using "Can\'t tell", so the instrument changed between the two sittings. A pre-registration only binds if the instrument is held still; this one was not, so it is void rather than decisive. Recorded because the tempting move was to bank a number that happened to fire a clean branch.',
    landedAs: 'A3',
  },
  {
    date: '2026-08-06',
    what: '40 reviews were entered through the human UI with ChatGPT doing the answering — in good faith, on the reasoning that it analyses better than a person. It does, and that is the disqualification: the human column is worth exactly one thing, being the number a model did NOT produce. Unfiltered it rendered SAT Craft and Structure as "CONFIRMED BROKEN — both instruments agree" off blind 97.4% + "human" 100%, condemning 211 items on a model agreeing with itself. Migration 079 adds reviewer_kind; both consumers now filter to human.',
    landedAs: 'fixed',
  },
  {
    date: '2026-08-06',
    what: 'The data flagged its own provenance and nobody was watching for it. Model-assisted rows scored 82.5% against 33.3% by hand, and Craft and Structure was 20/20 with "Can\'t tell" never pressed — no human has cleared 55% on this instrument. A human sitting at >=90%, or one with zero abstentions at n>=20, should be treated as a provenance smell before it is treated as a finding.',
    landedAs: 'fixed',
  },
  {
    date: '2026-08-06',
    what: 'Academic Passage was reported at 56.3% (n=32) while the assisted rows were mixed in with the real ones. Removing them restores the genuine 41.7% (n=12). Two sittings of different provenance under one account average into a number that describes neither — which is why provenance had to be a column rather than a memory.',
    landedAs: 'fixed',
  },
  {
    date: '2026-08-06',
    what: 'B1 was not startable at all. The review draw shuffles the cohort and takes a RANDOM slice, so two reviewers overlap only by luck — there was no way to produce the "overlapping sitting" B1 asks for. Added mirrorOf to the run POST: it copies item_id, shown_order and key_slot from an existing run for a different reviewer. shown_order is copied rather than re-dealt because reviewerAgreement compares slot LETTERS, so two different shuffles would make "both picked B" mean two different options.',
    landedAs: 'fixed',
  },
  {
    date: '2026-08-06',
    what: 'All 72 human reviews were sat on support@classraum.com, so that account IS the first reviewer. The intuitive plan — have the second person use support@ because it is the "shared" account — would have produced rows with the same reviewer_id, collapsing to one reviewer in reviewerAgreement and returning nothing while appearing to have run. The route now refuses a same-account mirror in code. Reviewer identity is the ACCOUNT: one human must keep one account permanently, or its history stops being one person.',
    landedAs: 'fixed',
  },
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
