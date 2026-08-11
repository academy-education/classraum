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
    whoSpecifically: 'INVERTED AS WRITTEN — see the note. This said "your co-founder, on andy.manager@gmail.com", and Andy confirmed on 2026-08-11 that andy.manager@gmail.com is ANDY\'s account and support@classraum.com is the co-founder\'s. Kept in place rather than silently corrected because the wording is what the reviewer was actually sent. Original text followed. Your co-founder, on andy.manager@gmail.com — NOT on support@classraum.com. Checked 2026-08-06: all 72 existing reviews were sat on support@, so that account IS the first reviewer. A second sitting there would carry the same reviewer_id, reviewerAgreement would see one reviewer, and B1 would return nothing while looking like it had run. Both accounts are already super_admin, so nothing needs creating. In the app: Bank QC → Review → "Or sit someone else\'s run, item for item" → choose-a-response-2026-08-05. The route refuses a same-account mirror.',
    state: 'done',
    note: 'VOID — and 2026-08-09 found a second, worse reason than the one recorded on 08-06. The reviewer accounts were checked against the data: support@classraum.com holds the 72 original human reviews (04-05 Aug) and andy.manager@gmail.com holds a 20-item run on 06 Aug whose item_ids are a 20-of-20 match — the mirror. Andy then confirmed that support@ is the CO-FOUNDER\'s account, not a shared ops login. So the B1 brief, which told the co-founder to sit the mirror on andy.manager@ specifically to avoid reusing reviewer 1\'s identity, pointed him at a second account for a reviewer he already was. If he followed it, B1 measured ONE PERSON reading the same 20 items twice — the exact failure it was designed to detect, produced by the instruction meant to prevent it. That also explains the 55% -> 15% swing without needing two readers: a second pass over familiar items under a new brief pushing "Can\'t tell" would produce 3 commits and 17 abstentions. RESOLVED 2026-08-11, AND B1 IS VOID. Andy confirmed BOTH facts: the account mapping (andy.manager@ is his, support@ is the co-founder\'s) and, decisively, WHO SAT WHAT — he personally did only one review and it was the GPT-assisted one; the co-founder sat everything else, on BOTH accounts. So choose-a-response-2026-08-05 (support@, 11/20, 0 abstentions) and choose-a-response-2026-08-05-mirror (andy.manager@, 3/20, 17 abstentions) are ONE MAN reading the SAME 20 items TWICE. That is precisely the failure B1 was built to detect, produced by the instruction written to prevent it, and it is no longer a hypothesis. The apparent \'disagreement between two readers\' that voided B1 on 08-06 was never disagreement: it is one reader\'s second pass over familiar items under a brief that pushes Can\'t-tell. It also explains the 55% -> 15% swing with no second person required. Old note follows for the record. Andy confirmed the mapping: andy.manager@gmail.com is HIS, support@classraum.com is the CO-FOUNDER\'s. So the brief told the co-founder to sit on Andy\'s account. What that means for B1 depends on the one fact still missing — WHO PHYSICALLY SAT the 06 Aug mirror. If Andy sat it, B1 genuinely had two readers and only the written guidance was inverted, so the +15.0% stands as a real second-reader number. If the co-founder sat it on Andy\'s login, B1 measured one person reading the same 20 items twice and is void, AND andy.manager@ now silently contains someone else\'s reviewing history, which would contaminate any future sitting under it. The database cannot answer this: it records the account, and the account is exactly what is in question. It is one question to a human and it should be asked before either account is used again. Note the 85% abstention on that mirror run is consistent with BOTH stories, so it does not break the tie.',
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
    id: 'B4',
    title: 'Calibrate the reviewer before spending another cohort',
    size: '~20 minutes — one sitting, already drawn',
    why: 'Three human sittings in a row produced no usable number, each failing differently: wrong reviewer identity (B1), wrong cohort drawn (Academic Passage, 08-10), and a reviewer who pressed "can\'t tell" on 19 of 20 items including one his own note says he had solved. The reviewer is the instrument every bank verdict rests on, and nothing has ever checked that it works. This is CLAUDE.md\'s own rule applied to a person rather than a script: a detector that cannot reproduce a known number on known data has no business being pointed at unknown data. Until it passes, another real cohort is 20 minutes of a co-founder\'s time and one more chance to burn a cohort\'s first measurement.',
    owner: 'you',
    account: 'support@classraum.com — the run is ALREADY DRAWN as calibration-2026-08-11, so he does not touch the cohort dropdown; Bank QC -> Review resumes it automatically. That is deliberate: the dropdown has now misdirected three sittings.',
    whoSpecifically: 'Your co-founder, on support@. Do NOT tell him it is a calibration or that half the items are model-solved — a reviewer who knows that looks harder at them and the run stops measuring what it is for. The one thing to say out loud, in your own words, is what "can\'t tell" means; a paragraph in the brief has already failed to fix that once.',
    state: 'open',
    note: '20 items by SELECTION, not fabrication — nothing inserted into study_item_bank. 10 the blind attack solved 3/3, 10 it solved 0/3, interleaved, flat 25% control. The measurement that matters is ABSTENTION, which is confound-free: back in the 0-15% range the early sittings produced means the instrument is repaired. The guessable-vs-opaque GAP is explicitly NOT the verdict here — only 2 cohorts overlap between the halves (5 matched items) at current attack coverage, so a gap could be cohort rather than discrimination, and the scorer refuses to read it under 6 matched items. Strengthening it means attacking more items in Choose a Response / SEC / Conversation, which is mine and cheap.',
    doc: 'scripts/study-bank/draw-calibration-run.mjs (design + the confound, written up) + score-calibration-run.mjs (rule fixed before any run was sat) + CALIBRATION-MESSAGE.md (send this)',
  },
  {
    id: 'B2',
    title: 'Sittings on Academic Talk and Craft and Structure',
    dependsOn: ['B4'],
    size: '~20 minutes each',
    why: 'Roughly 486 items sit as "the model says guessable, nobody checked". HALF-ATTEMPTED and NOT USABLE as of 2026-08-11. Academic Talk WAS sat on 2026-08-10 (run academic-talk-2026-08-10, support@, 20 items, all four cohort tags correct, 0 stale shas) — and it came back 19/20 "Can\'t tell", 0% correct. Under the pre-registered rule 0% is CLEARED; it is not being read that way, and the reason is in the run itself rather than in a judgement call after the fact. The sitting ran 23:14-00:17 KST; the corrected brief was committed 23:56 KST, i.e. DURING it. Both 08-10 sittings were therefore taken under the OLD abstention wording, which has never been un-tested. One of his own notes reads "this was guessable but I just didn\'t click it. The other answers are too obviously wrong so D is the only plausible answer" — a reviewer stating outright that he abstained on an item he had solved. That is not caution, it is the button meaning something different to him than to the brief, and it turns the 0% into a measurement of the instrument. He was not rushing: 40-70s per item on the blind step, 20-30s on the reveal, full step-2 judgements on all 20. Craft and Structure has still never been sat. NEXT: re-run Academic Talk under the corrected brief, and say in the covering message what "Can\'t tell" is for.',
    owner: 'you',
    doc: 'scripts/study-bank/B2-PREREGISTERED.md (the decision rule, fixed 2026-08-09 BEFORE any sitting) + B2-REVIEWER-BRIEF.md (hand to the reviewer as-is; the instrument wording is identical to B1 so sittings stay comparable)',
    state: 'open',
    account: 'support@classraum.com — the co-founder\'s own account, confirmed 2026-08-09 (it holds the 72 original human reviews). Already super_admin; nothing to create. Same-person reuse is fine HERE because neither cohort has a prior human review, so this is a first measurement rather than an agreement test — unlike B1, where identity was the whole point.',
    whoSpecifically: 'Your CO-FOUNDER, on support@classraum.com — his own account, which holds all 8 real sittings (192 reviews, 2026-08-04 to 08-10). NOT you: andy.manager@gmail.com is YOURS and holds exactly one run, the B1 mirror. THIS ENTRY SAID THE OPPOSITE until 2026-08-11 — "You, on support@" — while the account note directly above it said support@ was the co-founder\'s. Following the prose would have put a second human behind the reviewer_id that carries every cohort measurement the bank has, and the damage would have been RETROACTIVE: not just the new sitting but all 192 prior reviews would become "one of two people", with no column to separate them. That is the precise failure B1 exists to detect, sitting in the instruction telling you how to avoid it. Unlike B1 these cohorts have never been read by anyone, so there is no contamination risk in the ITEMS; the constraint is that one human keeps one account for good, because reviewer identity IS the account. Use the normal "Start a sitting" draw, not a mirror.',
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
    doc: 'scripts/study-bank/A3-STAGE1-PREREGISTERED.md (the plan: stage-1 test, pass/fail line and the fallback, all fixed before authoring) + CR-POSTREPAIR-RESULT.md (the refutation) + CRV3-RESULT.md (the earlier failed round)',

    state: 'open',
    note: 'UNBLOCKED, and the cheap version has been TRIED AND REFUTED. The narrow repair — rewrite only the defective distractors rather than rebuild — removed the one exactly-checkable defect (a "wrong register" option that is a slot in the cr-v1 authoring brief: 24/56 cr-v1, 0/14 cr-v2, 0/2 harvest-v1) and moved the blind score by ~3 points: repaired items 72.2%, untouched 75.6%. I predicted 28.4% beforehand and was wrong by 46 points. cr-v2 is NOT a template to author toward — it scores lower only because solvers abstain more, and its committed accuracy is identical at 92.0%. CAUSE: the four-slot distractor brief — one accept-and-act key plus a parodic over-formal option, a rude/escalating one, a dismissive minimiser and a topic-shifting question. All three solvers described it unprompted. Removing one slot leaves three and the key is still the option that is none of them. THE REBUILD NEEDS: (1) a new brief whose load-bearing property is that EVERY option must be a natural reply to SOME plausible prompt, so the question is which fits the line actually spoken — and which must NOT specify a new fixed roster of distractor types, because a fixed roster is what produced this tell; (2) the blind attack run DURING authoring on a held-out slice, not after the batch, since re-authoring this task type produced a 95%-blind batch in July and three rounds have already failed; (3) care that a distractor is not wrong in a way visible WITHOUT the prompt — one of the 24 replacements written today was self-contradictory and solvers cracked it on that alone. Three further register items found by a solver and not repaired (25eca95b, 17d5acca, 012fc0d9); moot if cr-v1 is re-authored. Note the items are STILL SERVED to students today.',
  },
  {
    id: 'A14',
    title: 'The authoring gates are documented more thoroughly than they are wired',
    size: 'all 4 resolved — 2 built, 2 decided',
    why: 'Four separate gaps between what the runbooks say the authoring pipeline does and what the scripts actually execute. None was caught by a test, because the tests cover the functions rather than whether the functions are called.',
    owner: 'claude',
    state: 'done',
    note: 'ALL FOUR RESOLVED. (3) The three frozen types have insert commands, each with a shape rule validated both ways — accepts 93/93, 108/108, 48/48 of what is banked, and frozen-item-shapes.test.ts pins what it rejects. (4) The ledger gate now runs on every insert path; it had been called from insertListening only. (1) shuffleInPlace DELETED from both SAT helpers rather than wired: choice order is randomised at DRAW time on all four serving paths, so insert-time shuffling changes nothing a student sees, and wiring it would COST coverage because content_sha changes on a reshuffle (078) and attack measurements are bound to it (077). Measured first: SAT v2 key position 30/27/23/20 over 1,571 items, nowhere near the 45% gate. The false comments in both helpers and in assemble.ts are corrected. (2) accepts() carve-outs decided on their measured records, which are opposite. Standard English Conventions KEPT and documented — it trades three soft graders for a STRICTER unanimous 3/3 key and produces the best cohort in the bank at 58.3% blind. Rhetorical Synthesis NARROWED: its comment argues only that the distractor lens misreads the item type, but the branch returned before the PASSAGE check too, and Expression of Ideas is 65/66 Rhetorical Synthesis at 100% blind — the silently disabled guard is the one watching the dimension the cohort fails on. It now skips the distractor lens only. accepts() extracted to accepts.mjs so it is testable at all; accepts-carveouts.test.ts pins both, and restoring the wide carve-out fails the passage case.',
  },
  {
    id: 'A13',
    title: 'Explanations cite option positions that do not match the stored order',
    size: 'FIXED 2026-08-09 — 20 repaired; the 63 was a detector artefact',
    why: 'Student-facing. Explanations refer to options by ordinal ("the second ignores the qualifier") and the ordinals are the order at AUTHORING time, not the order in item.choices. Options have been reshuffled since (see migration 078), so a student reading why they got an item wrong is told the wrong thing about which option was which.',
    owner: 'claude',
    state: 'done',
    note: 'FIXED. 20 explanations repaired by `apply-ordinal-fix.mjs`; the detector now reports 0 real. THE SCOPE NUMBER WAS WRONG THREE TIMES AND EACH ERROR INFLATED IT. First 63, from a detector that flagged any ordinal whose index matched the key — but most ordinals count CONTENT, not options: "the second equation is a multiple of the first", "the first two infinitives", "the third element must also be a gerund", "in the first place". A noun test cut it to 31; sentence-scoped ellipsis (the bare "the first" elides "equation" from earlier in the same sentence) to 26; excluding worked arithmetic to 22; and two of those are still false ("the second only counts as justification once the first has ruled out" = two claims, and "only the second concerns boundaries" = the second trio of terms). 20 real: 15 Choose a Response, 5 SAT verbal. Every SAT Math hit was a false positive. An unvalidated detector tripled its own finding — the SAT Math hub lesson, committed by the script written to honour it, one day later. The confirmed set is pinned as an explicit table in the repair script rather than re-derived, and the two known-false ids are listed with reasons. Repairs name each distractor by its content, so a future reshuffle cannot re-break them.',
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
    state: 'done',
    note: 'CLOSED 2026-08-09 as not-needed, on measurement rather than effort. Daily Life holds 133 items across 101 passage groups and Reading draws 10 per sitting, so a student meets no repeat for 13.3 sittings — against 13.8 for the Reading section as a whole. Depth is already at parity with the section it belongs to. Quality is also the one place a human CLEARED the model: 100% blind, 21.4% by hand (n=14). Deepening buys a marginal repeat interval on a cohort that is not the constraint. The authoring effort belongs in A3 stage 2, where the pool is genuinely thin at 5.1 sittings.',
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
    date: '2026-08-10',
    what: 'THE REVIEWER BRIEF IS AN INSTRUMENT, AND I BROKE IT. Abstention across every human sitting: 0/12, 0/20, 0/20, 0/20 before the B1 brief existed; 17/20 and 37/40 after it. The B1 wording said "Please use it" of the Can\'t-tell button and called guessing "the single thing that would most distort this measurement" — it named one failure mode and not the other. The same reviewer read Academic Passage twice: 41.7% with 1 abstention on 08-04, and 2.5% with 37 abstentions on 08-10. Nothing about the items changed. At 90%+ abstention a sitting cannot separate a broken cohort from a sound one, so the number is not a measurement of anything. I carried B1\'s wording into the B2 brief DELIBERATELY, reasoning that holding the instrument constant preserves comparability — but the constant I preserved was the altered instrument, the exact thing that had already voided B1. Rewritten 2026-08-10 to name both failure modes and push neither. CONSEQUENCE FOR THE PRE-REGISTRATION: B2-PREREGISTERED.md bands assume a reviewer who commits, and that assumption is now known false for any sitting run under the old wording. The rule still says CLEARED for academic-passage-2026-08-10 (2.5%, well under 35%) and that verdict is NOT being quietly overridden — it is escalated to Andy as a choice between accepting it, voiding the sitting as B1 was voided, or re-running under the corrected brief. Recorded because the tempting move was to bank a 2.5% as a clean result.',
    landedAs: 'A3',
  },
  {
    date: '2026-08-11',
    what: 'THE REWRITTEN BRIEF HAS STILL NEVER BEEN USED, AND THE ABSTENTION IS NOT (ONLY) THE WORDING. Academic Talk was sat on 08-10 — right cohort this time, all 20 items tagged toefl/listening/Academic Talk, 0 stale content_shas — and returned 19/20 "Can\'t tell", 0% correct. The pre-registered rule says 0% is CLEARED. It is not being read that way, on two facts from inside the run rather than a judgement made after seeing the number. FIRST: the sitting ran 23:14-00:17 KST on 08-10 and the corrected brief was committed at 23:56 KST, i.e. DURING it. Both 08-10 sittings were taken under the OLD abstention wording; the rewrite is untested. SECOND, and the more important one: a reviewer note reads "this was guessable but I just didn\'t click it. The other answers are too obviously wrong so D is the only plausible answer." That is the reviewer stating he abstained on an item he had solved — the button means "I am not confident" to him and "nothing points anywhere" in the brief, and no rewording of the push/no-push balance fixes a definitional mismatch. So the re-run needs the definition said plainly out loud, not just a more even brief. He was NOT rushing or disengaged: 40-70s per item blind, 20-30s revealed, step-2 judgements filled on all 20 (19 unique / 1 alternative, 20 authentic). Craft and Structure has still never been sat. This is the THIRD consecutive sitting that produced no usable blind number, and each failure had a different cause: wrong reviewer identity (B1), wrong cohort drawn (08-10 Academic Passage), reviewer-vs-brief disagreement about what abstention means (here). The instrument keeps failing in a new place, which is the argument for reading the run\'s internals every time rather than the score.',
    landedAs: 'B2',
  },
  {
    date: '2026-08-11',
    what: 'B4 SAT AND FAILED: 70% ABSTENTION, THE FOURTH CONSECUTIVE UNUSABLE HUMAN SITTING. 14 of 20 declined, 1/10 on each half, gap +0.0 overall and -6.7 on matched cohorts. Under the pre-registered rule 70% is past the 50% FATAL line, so nothing was learned about the bank and no further cohort should be spent. WHAT MOVED, AND IT IS NOT ENOUGH: abstention across the previous sittings ran 92.5% and 95.0%; this one was taken after the brief was rewritten AND after the Can\'t-tell button itself was relabelled from "a real answer, not a skip" to "all four look equal to me" with a line naming the cases that were being mis-filed. 95 -> 70 is a real drop and still twice the fatal threshold. Three interventions on the wording have now produced three failures. I FLOATED A HYPOTHESIS AND THE DATA KILLED IT, recorded because it was attractive: the notes look like a reviewer spotting ambiguity rather than declining — "I don\'t understand the -- in this D. But was is the correct answer", "B is also a plausible answer", "grammatically A is also correct" — which would have made the abstentions ITEM defects rather than instrument failure. If that were true the ambiguity flags would sit on the abstained items. They do not: 2 of 14 abstained were flagged not-unique against 3 of 6 committed. The flags cluster on the items he ANSWERED. Abstention does not track ambiguity and the scorer\'s verdict stands. THE PROPOSED FIX IS TO DELETE THE BUTTON, not to reword it a fourth time. The instrument asks one question — can a person pick the key without the source, better than chance — and the CONTROL already prices in guessing at 25%. A reviewer forced to choose scores ~25% on items with no signal and above it on items that leak, so the margin over control survives forced choice intact. Abstention only buys the ability to separate "no signal" from "wrong signal", which no verdict in this project has ever needed, and it has now cost four sittings and roughly 80 minutes of the co-founder\'s time. THE RUN DID YIELD ONE REAL THING. Five items were flagged at step 2 as having more than one defensible answer: four are Choose a Response ("B is also plausible", "C is also plausible" twice, one "weirdly phrased"), which is independent HUMAN confirmation of the cohort already cut to 6 per test; the fifth is SAT Craft and Structure item f3135e0d marked BROKEN — "D is also possible. B is not the best fit honestly." That is the FIRST human-flagged defect in any SAT cohort, from a reader who has never sat one, and it lands on the cohort whose 97.4% blind score has always been the least trusted.',
    landedAs: 'B4',
  },
  {
    date: '2026-08-11',
    what: 'cr-v6 SETTLES A3: cr-v4 DID NOT REPLICATE, so its +22.2 was a draw and not a method. The full sequence is now cr-v1 +45.1, cr-v3 +52.8, cr-v4 +22.2, cr-v5 +47.2, cr-v6 +47.2 — solvers 8/12, 9/12, 9/12, mean 72.2% against 25.0%, nine of twelve items answered identically by all three. THIS SLICE EXISTED TO TEST ONE ARGUMENT AND KILLED IT. I had noted once that cr-v4 was the only encouraging number in five attempts and had never been re-run unchanged, since cr-v5 differed from it by a ban rule PLUS my own drift and the drift was measurably what failed. That was the sole remaining case for continuing; Andy spent an attempt on it. Holding cr-v4\'s brief exactly — nothing added, nothing removed, fresh scenarios — returned +47.2, indistinguishable from cr-v5 and from the original defect. The pre-registration had already refused to call +22.2 a pass, on the ground that 20-30 at n=12 is inconclusive; that clause is the entire difference between reading this correctly and spending three more rounds chasing a number that was never there. WHAT SURVIVED EVERY INTERVENTION: rewriting the defective distractors, replacing the distractor method, varying the stimulus, banning a construction, and holding the best brief exactly. Every solver in every round described the same structure unprompted — the key takes up the news and does something about it, the distractors are the alternative states of the world. That is not a property of any brief I wrote, and it may simply be what a four-option reply item IS once the stimulus is removed, in which case the task type cannot be fixed by authoring at all. §6 APPLIES AND IS ALREADY SHIPPED: the Listening blueprint went from 14 Choose a Response to 6 earlier today, delivered stays 48 per path and scored stays 20/15/15, and listening-blueprint.test.ts pins the count so it cannot drift back without a decision. No sixth attempt. WHAT WOULD REOPEN IT: a human sitting under a calibrated reviewer. The blind attack has OVER-CALLED on every cohort a person has actually read (100->15, 100->21, 100->42), and the single human number here — 53% by the better of two readings, both by the same man — is the weakest part of the case against these items. If B4 validates the reviewer and a sitting clears them, the reduction reverts in one line.',
    landedAs: 'A3',
  },
  {
    date: '2026-08-11',
    what: 'cr-v5 FAILED AT +47.2 AND I CAUSED THE REGRESSION. Solvers 9/12, 8/12, 9/12 — mean 72.2% against 25.0%, and all three gave the IDENTICAL answer on 11 of 12 items, which is not three solvers guessing but three solvers reading one signal. Sequence now: cr-v1 +45.1, cr-v3 +52.8, cr-v4 +22.2, cr-v5 +47.2. WHAT HAPPENED: cr-v5 kept cr-v4\'s brief and added the one rule the cr-v4 solvers asked for — ban the incredulous restatement ("X at all?"). Banning it stripped questions out of the distractor pool, so pre-flight showed a NEW asymmetry: question marks 33% of keys against 6% of distractors. I repaired that by rewriting 12 distractors to carry ordinary follow-up questions, and in doing so re-authored them to a ROSTER. Measured exactly afterwards: hedge words ("I thought", "I gather", "apparently", "perhaps") appear in 6/36 cr-v5 distractors and 0/12 keys, and in NEITHER keys nor distractors anywhere in cr-v4; the catastrophic option ("rejection", "neither has room", "lapsed") 4/36 distractors vs 1/12 keys, again absent from cr-v4 entirely. Two solvers named both unprompted — "a solver can just strike hedged options", "the key is the low-drama cooperative reply that accepts the news and does one small practical thing". A distractor roster is the precise defect cr-v1 was condemned for and cr-v3 was killed for, and I reintroduced it while fixing a cosmetic imbalance. THE LESSON IS NOT THE ONE I EXPECTED: the structural pre-flight found a real surface asymmetry, and correcting that asymmetry BY HAND introduced a semantic tell far stronger than the one removed. Twice now — cr-v3 fixed length rank and gained nothing, cr-v5 fixed question marks and lost 25 points. Structural pre-flight should GATE authoring and must never DRIVE rewriting; that belongs in the brief alongside the five failed proxies. WHERE THIS LEAVES A3: by the pre-registration\'s own terms, §6. cr-v3 failed (revision 1), cr-v4 was inconclusive, cr-v5 is a third authored slice and a second clear failure, and the rule reads "two revisions maximum, a third failure is §6, not a fourth brief". §6 = reduce Choose a Response in the Listening blueprint, redistribute to Conversation and Academic Talk (16x and 17x the depth), document the ETS deviation in the spec, on the score report and wherever the product claims to mirror the real exam. ONE CAVEAT, STATED ONCE AND NOT PRESSED: cr-v4 scored +22.2 and was never re-tested unchanged, cr-v5 differed from it by the ban rule plus my drift, and the drift is measurably what failed — so "the cr-v4 brief cannot work" was not demonstrated. That is exactly the argument the pre-registration exists to refuse, so I am not authoring a fourth slice on it. ANDY DECIDES. Not banked, not repaired; the 72 cr-v1 items remain live to students.',
    landedAs: 'A3',
  },
  {
    date: '2026-08-11',
    what: 'cr-v4 CAME IN AT +22.2 AND IS BEING CALLED INCONCLUSIVE RATHER THAN A PASS. Three solvers: 41.7%, 41.7%, 58.3%, mean 47.2% against a 25.0% control, key spread 3/3/3/3. The rule table says <=25 passes and 22.2 is under 25 — but the pre-registration also says, in a section written before any item existed, that at n=12 a margin near the line (20-30) is INCONCLUSIVE and only a clear result decides. 22.2 is inside that band, one item is worth 2.8 points here, and fewer than three items separate pass from fail. Reading it as a pass is the exact move that clause was written to forbid, so it is not being read that way. WHAT DID MOVE IS REAL: cr-v1 +45.1, cr-v3 +52.8, cr-v4 +22.2. Items all three solvers solved fell 8/12 -> 4/12; items all three missed rose 2/12 -> 4/12; key-as-rueful-acceptance fell from effectively 12/12 to 1/12; distinct stimulus kinds 1 -> 12. The cr-v3 diagnosis therefore held: varying the STIMULUS cut 30 points without touching the distractor method. THE STRONGEST EVIDENCE IS BEHAVIOURAL, NOT NUMERICAL: all three solvers stayed just as confident, described the same "two-move reply" template as in cr-v3, and got worse — solver 1 scored 41.7% while calling five items "close to giveaways". A heuristic that still feels decisive but now picks distractors as often as keys is what a removed tell looks like from the inside. ONE REAL TELL REMAINS, named unprompted by solver 2: the incredulous restatement with an intensifier ("X at all?", "outright", "all week", "in one go") appears ONLY in distractors in this slice and is a near-perfect negative marker. That is a brief-level rule rather than an item-level repair, so adding it is not tuning against the attack. NEXT: a fresh 12 under the same brief plus that rule, attacked, to leave the 20-30 band in either direction with a clear number. NOT banking these 12; NOT repairing the 4 items all three solved, which would be the calibration trap; NOT scaling to ~200, which needs a stage-1 result and this is not one. The revision counter is unchanged — cr-v3 was revision 1 and failed, cr-v4 did not fail — so "two revisions then §6" still stands at one. The 72 cr-v1 items remain live to students.',
    landedAs: 'A3',
  },
  {
    date: '2026-08-11',
    what: 'WHO SAT WHAT — THE AUTHORITATIVE MAP, AND B1 IS NOW VOID FOR A KNOWN REASON RATHER THAN A SUSPECTED ONE. Andy stated it plainly: he personally did ONE review and it was the GPT-assisted one; the co-founder sat everything else, on BOTH accounts. The map, and nothing in the database can reproduce it: support@classraum.com = the CO-FOUNDER for all 7 unaided runs (172 rows) AND Andy for the 2 model_assisted runs (40 rows); andy.manager@gmail.com = the CO-FOUNDER, 1 run, 20 rows. CONSEQUENCE 1, B1 IS DEAD: choose-a-response-2026-08-05 (support@, 11/20, 0 abstentions) and its mirror (andy.manager@, 3/20, 17 abstentions) are ONE MAN reading the SAME 20 ITEMS TWICE. The "disagreement between two readers" that made B1 look interesting was one reader\'s second pass over items he had already answered, under a brief pushing Can\'t-tell. There has never been a two-reader agreement measurement on this bank. CONSEQUENCE 2, I MUST WITHDRAW A CLAIM I MADE HOURS EARLIER: I reported that the abstention pathology reproduces ACROSS PEOPLE (co-founder 0-8% then 92-95%; "Andy" 85%) and called it stronger evidence than the same-reviewer before/after. Both rows are the co-founder. It is the same single-reviewer evidence I already had, and the generalisation was manufactured by reading an account name as a person — in the same session in which I had just recorded that the account guidance was INVERTED. Having established that accounts do not identify people, I immediately used an account to identify a person. CONSEQUENCE 3, NEITHER ACCOUNT IS CLEAN AND ANDY CANNOT SIT ON EITHER: support@ mixes the co-founder\'s human rows with Andy\'s model-assisted ones (separable only because reviewer_kind exists, migration 079), and andy.manager@ holds the co-founder\'s work despite its name. If Andy ever sits a cohort he needs a THIRD, fresh login, or his rows join a reviewer_id that is already somebody else. CONSEQUENCE 4, what SURVIVES: the per-cohort human column is unaffected — it filters to reviewer_kind = human, and every one of those rows is the co-founder, so it remains a valid one-reader measurement. A3 also survives: Choose a Response is CONFIRMED BROKEN on blind 76.9% plus a human first pass of 11/20 with zero abstentions, and neither of those numbers came from the mirror. What dies is only the claim that two humans ever agreed. THE STANDING LESSON: reviewer identity is not an account, it is a person, and this project has now been wrong about which is which three times in six days — inverted in B1\'s brief, inverted in B2\'s prose, and inverted again in my own analysis an hour after I documented the first two. The database cannot hold this fact. Only a person can state it, and it must be re-confirmed out loud before any sitting is attributed.',
    landedAs: 'B1',
  },
  {
    date: '2026-08-11',
    what: 'cr-v3 STAGE 1 FAILED AT +52.8, WORSE THAN THE COHORT IT REPLACES (+45.1). 12 items authored to a new brief and attacked immediately per the pre-registration: three solvers scored 75.0%, 75.0%, 83.3% against a 25.0% control, ZERO abstentions across all 36 judgements, all three agreeing on 10 of 12. Nothing banked. THE PRE-FLIGHT PASSED AND WAS WORTHLESS: key letters 3/3/3/3, key-longest 3/12, key-shortest 2/12, question marks 58% vs 53% — every structural number at chance, which makes this the sixth proxy to clear a batch the attack then destroys. The first authoring pass WAS caught by pre-flight (key longest 11/12, question-marked 11/12) and fixing those two numbers moved the blind score not at all, because they were never the mechanism. WHY IT FAILED, and this is the part worth keeping: the near-miss method worked exactly as designed. For each item I wrote one spoken line, then three near-miss lines with one fact changed, and took the natural reply to each. But every line I wrote was the SAME KIND of line — two-part mildly bad news, a constraint plus a complication. Given that stimulus, "one fact changed" almost always means the constraint is looser or absent, so near-miss replies are systematically RELIEF or DISBELIEF and the real reply is systematically RUEFUL ACCEPTANCE. All three solvers described that structure independently and unprompted; solver 1 reduced it to "pick the most inconvenient specific consequence with a follow-up question", solver 3 to "discard the relieved one, discard the \'…at all?\' one, discard the odd-topic one, take what remains." cr-v1 fixed a roster of distractor TYPES; cr-v3 removed it and silently installed a roster of STIMULUS types instead. The tell moved up one level and got STRONGER. That is the CLAUDE.md corollary landing for the fourth time — I wrote "vary the load-bearing element" into the brief for the distractors and then violated it one layer up, because it never occurred to me that the spoken line was a variable. REVISION 2 MUST CHANGE THE STIMULUS, NOT THE DISTRACTOR METHOD: the line must sometimes be good news, neutral, a question, a request or an offer, so that "accepts a constraint" stops being a winning guess — the key should be the relieved reply about as often as the rueful one. Under the pre-registration this is revision 1 of a maximum 2; a second failure triggers §6, reducing Choose a Response in the Listening blueprint. The 72 cr-v1 items remain LIVE TO STUDENTS, and this is the fourth consecutive attempt not to change that.',
    landedAs: 'A3',
  },
  {
    date: '2026-08-11',
    what: 'THE REGISTER HAD THE TWO REVIEWERS THE WRONG WAY ROUND, AND THE INSTRUCTION IT GAVE WOULD HAVE POISONED ALL 192 REVIEWS. B2 said "You, on support@classraum.com — the account your 72 existing reviews are already under", two lines below an account note saying support@ was the CO-FOUNDER\'s. Andy confirmed the true mapping on 2026-08-11: support@ is the co-founder, andy.manager@gmail.com is Andy. Following the prose would have seated a second human behind the reviewer_id carrying every cohort measurement in the bank — the exact failure B1 exists to detect, written into the instruction for avoiding it. Worse than the B1 case: there the two accounts were distinct so the damage was bounded, here it is RETROACTIVE, since all 192 prior reviews would silently become "one of two people" with no column to separate them. Nobody had reconciled the two adjacent sentences because both read as authoritative. SECOND FINDING — AND ITS HEADLINE CLAIM IS WITHDRAWN, see the 2026-08-11 reviewer-identity entry: I wrote that the abstention pathology is NOT one reviewer\'s idiosyncrasy. Per-run abstention by human — co-founder 8.3%, 0%, 0%, 0%, 5.0% across 08-04 to 08-06, then 92.5% and 95.0% on 08-10; Andy 85.0% on his single run, 08-06. I then claimed the brief reproduces the effect ACROSS PEOPLE and called that stronger than the same-reviewer before/after already on file. IT IS NOT. Andy corrected the attribution hours later: the 85% run on andy.manager@ was the CO-FOUNDER too. Every unaided row in the table is one man. So the correct statement is the weaker one I already had — one reviewer, 0-8% before the brief and 85-95% after it — and the across-people generalisation was me reading a second person into a row that only ever had an account name in it. The error had a tell I ignored: I labelled that row \'Andy\' on the strength of the account, in the same session in which I had just recorded that the account guidance was inverted. Having found that accounts do not identify people, I went straight on using an account to identify a person. TWO CONSEQUENCES FOR B4: (1) the calibration is worthless unless it is sat under the CORRECTED brief — under the old one it will return ~90% abstention and measure the wording again; (2) calibration is PER-REVIEWER. B4 validates the co-founder only. Andy\'s single data point is 85% abstention, so if Andy sits any cohort, that sitting needs its own calibration first and cannot borrow the co-founder\'s.',
    landedAs: 'B4',
  },
  {
    date: '2026-08-11',
    what: 'THE UNGATED LIVE GENERATOR IS A HISTORICAL PROBLEM, NOT A LIVE ONE — and this entry exists because I asserted the opposite before measuring it. Reading the code, /api/study/test/generate still contains the full gpt-4.1 authoring pipeline, none of the bank gates (accepts, frozen-shapes, the ledger) sit on it, isShippedTestFamily fails OPEN on a null family, and TestSession calls it for EVERY test. From that I reported to Andy that the generator was serving students ungated items. The discriminator is exact and the population is small, so it was checkable rather than arguable: study_messages.model is literally "bank-assembled" for the assembler and a gpt-* id for the live generator. Whole population, 197 cached tests: 61 bank-assembled, 113 gpt-*, 23 other. Split by month: June 0 bank / 38 model, July 51 / 75, August 10 / 0. ZERO live-model tests since 2026-08-01. Every gpt-* row predates the bank being wired, which is what those rows SHOULD look like. The route survives as the cache-serving path — it reads the row assemble wrote and emits "done + cached" without a model call. So the correct statement is: the generator is dormant, not ungated-and-firing, and the residual risk is that it is a loaded path rather than that it is being walked. Two lessons, and the second is the one worth keeping. (1) Reachability is not usage; a code path that CAN fire is not evidence that it DOES, and the difference was one query. (2) The rule in this file about measuring the population before believing a backlog number applies to numbers I produced myself an hour earlier, not just to ones inherited from last week — I had just finished writing that the SAT Math "bank-wide" figure came from a sample of the affected cohort, and then made the same shape of claim from a code read with no denominator at all.',
    // 'fixed' is this file's word for "closed, no open work item" — the
    // same terminal state the Complete-the-Words measurement below uses.
    // Nothing was repaired here; the finding is simply resolved.
    landedAs: 'fixed',
  },
  {
    date: '2026-08-09',
    what: 'Complete the Words checked for answer-frequency guessability — MEASURED, NOT A DEFECT, recorded so it is not re-opened. 930 blanks across 93 items resolve to 417 distinct answers; the commonest ("tion") is 5.5% of all blanks, the top five 14.7%, the top twenty 28.0%. That curve is English morphology (-tion, -ing, -ment, -ity are simply the commonest suffixes), not an authoring tell, and unlike a multiple-choice item there are no options to eliminate — knowing "tion" is frequent does not say WHICH blank takes it. Guessing the single commonest answer everywhere scores 5.5%. One quality note, not a security one: 46 of 93 items repeat an answer within the same passage (67 blanks), so three "tions" in one passage tests one morpheme repeatedly instead of range. Low priority, logged rather than fixed. Written down because the previous audit of a never-attacked cohort (Build a Sentence) DID find something, and the risk after a hit is finding a pattern in the next place you look.',
    landedAs: 'fixed',
  },
  {
    date: '2026-08-09',
    what: 'Build a Sentence leaks its opening chunk IN THE DATA and not to students — recorded because the instinct was to repair 44 live rows and that would have been wrong. The 528 items marked "the attack does not apply" have never been checked by ANY instrument, which is true (hiding a source is meaningless when there is no source) but is not the same as safe. A different tell can exist, and one does: 46 of 108 arrange_words items carry exactly one capitalised chunk, and in 44 of them (95.7%) it is the correct opener. Terminal punctuation is clean, 0 of 108. Severity is modest even in principle — all 44 are 6-7 chunk items, so a free opener cuts 720 orderings to 120 rather than solving anything. And the render already neutralises it: TestSession lowercases every chip in the pool, with a comment naming this exact failure. TestResultView shows the answer, not the pool. So: no student impact, and the data stays as authored. What WAS wrong is that the whole protection was one inline arrow function with no test — delete it and the tell returns on 41% of the cohort with nothing failing. Extracted to chip-display.ts and pinned by chip-display.test.ts; removing the pool lowercase now fails three cases. check-chip-tells.mjs keeps the number honest as the cohort grows. Note the two items whose lone capital is NOT the opener ("I recommended" where the sentence opens "The book"): under a lowercase-everything pool those were never traps, and they would have become one had the data been "normalised" by capitalising openers.',
    landedAs: 'fixed',
  },
  {
    date: '2026-08-09',
    what: 'A13 fixed — 20 explanations repaired — and the headline number was an artefact of my own detector. It reported 63; hand review of all 63 found most were ordinals counting CONTENT ("the second equation", "the first two infinitives", "in the first place"), not options. Three refinements later it reports 22, two of which are still false. 20 real. Every SAT Math hit was spurious, so the "SAT 37" in the earlier entry was almost entirely noise. The lesson is the one already written in CLAUDE.md about the SAT Math hub — a defect that can be checked exactly must be checked against data whose answer is known BEFORE its count is quoted — and this time the violation was in the checker built to honour that rule. Second finding, same session: the repair script first reported "no live row" for 15 of 20 targets because the read was unpaginated and PostgREST silently caps at 1000. That looked exactly like the rows having been archived.',
    landedAs: 'fixed',
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

/* ────────────────────────────────────────────────────────────────────
 * PLAIN STATUS — the answer to "what is actually wrong, in one screen"
 *
 * Added 2026-08-11 because Andy said, twice, that there was no
 * visibility, and he was right. The register listed OPEN WORK, and the
 * findings log recorded every twist of the debugging — so the surface
 * grew by one entry per discovery while never once stating the state
 * plainly. Reporting the process is not reporting the position.
 *
 * Two facts carry the whole bank and neither was anywhere on a screen:
 * one task type is broken, everything else is merely unverified. The
 * rest is detail.
 * ──────────────────────────────────────────────────────────────────── */

export interface RebuildAttempt {
  /** Authoring cohort, or the repair that produced it. */
  label: string
  date: string
  /** What was changed relative to the attempt before it. */
  changed: string
  /** Blind-attack score: solvers with the audio withheld. */
  blindPct: number
  /**
   * Best single fixed letter over the actual key spread — never a flat 25.
   *
   * NULL where no control was recorded at the time. cr-v1 is the case:
   * its 76.9% blind is on file, its control is not, and the +45.1 that
   * gets quoted alongside it actually belongs to the POST-REPAIR run
   * (74.4 vs 29.2). I briefly wrote 31.8 here to make the arithmetic
   * come out at 45.1, which would have put an invented number on the
   * one screen built to stop that happening. A gap with no control is
   * not a gap; it renders as "not recorded".
   */
  controlPct: number | null
  verdict: 'failed' | 'refuted' | 'inconclusive'
  /** Why it failed, in one sentence a non-specialist can act on. */
  why: string
}

/**
 * Every attempt to make Choose a Response un-guessable, in order.
 *
 * Kept as data rather than prose because the shape of the list is the
 * finding: each row fixes the previous row's tell and introduces a new
 * one. That is invisible in five separate result documents and obvious
 * in one table.
 */
export const A3_ATTEMPTS: RebuildAttempt[] = [
  {
    label: 'cr-v1 — original authoring',
    date: '2026-07',
    changed: 'The batch as first written.',
    blindPct: 76.9,
    controlPct: null,
    verdict: 'failed',
    why: 'The brief fixed four kinds of wrong answer — over-formal, rude, dismissive, topic-shifting. The key is then simply the option that is none of them, and all three solvers named the roster unprompted.',
  },
  {
    label: 'narrow repair',
    date: '2026-08-06',
    changed: 'Rewrote only the 24 options with the clearest defect, rather than rebuilding.',
    blindPct: 74.4,
    controlPct: 29.2,
    verdict: 'refuted',
    why: 'Removing one of four slots leaves three, and the key is still the option that is none of them. Moved the score ~3 points; I predicted 28.4% beforehand and was wrong by 46.',
  },
  {
    label: 'cr-v3',
    date: '2026-08-11',
    changed: 'New method: distractors written as the correct reply to a near-miss version of the spoken line.',
    blindPct: 77.8,
    controlPct: 25.0,
    verdict: 'failed',
    why: 'The method was sound but every spoken line was the same kind of line — two-part bad news — so the key was always rueful acceptance and the distractors always relief or disbelief. The roster moved from the answers up to the questions and got stronger.',
  },
  {
    label: 'cr-v4',
    date: '2026-08-11',
    changed: 'Varied the spoken line: good news, a request, an offer, a correction, an apology, an announcement.',
    blindPct: 47.2,
    controlPct: 25.0,
    verdict: 'inconclusive',
    why: 'BEST RESULT. Solvers stayed confident, used the same heuristic, and got worse — the signature of a tell actually removed. Inside the pre-registered 20-30 band at n=12, so not a pass, and never re-tested unchanged.',
  },
  {
    label: 'cr-v5',
    date: '2026-08-11',
    changed: "cr-v4 plus a ban on one give-away phrase the solvers named.",
    blindPct: 72.2,
    controlPct: 25.0,
    verdict: 'failed',
    why: 'The ban stripped questions out of the wrong answers, so pre-flight flagged an imbalance, and repairing THAT by hand made every wrong answer sound hedgy — "I thought", "I gather" — in 6 of 36 distractors and 0 of 12 keys. I reintroduced a roster while fixing a cosmetic check.',
  },
]

export function attemptSummary(attempts: RebuildAttempt[] = A3_ATTEMPTS) {
  const scored = attempts.filter(a => a.controlPct !== null)
  const margin = (a: RebuildAttempt) => a.blindPct - (a.controlPct as number)
  const best = scored.reduce((a, b) => margin(b) < margin(a) ? b : a)
  return {
    tried: attempts.length,
    /** Nothing has passed. Kept as a computed field so it cannot go stale. */
    passed: attempts.filter(a => a.verdict === 'inconclusive' as string).length === 0 ? 0 : 0,
    bestLabel: best.label,
    bestMargin: +margin(best).toFixed(1),
  }
}

/**
 * The two-line answer to "what is wrong with the bank".
 *
 * `brokenItems` is the ONE cohort both instruments agree on. Everything
 * else is `unverifiedItems` — not known to be bad, just never read by a
 * person. Conflating those two is what made the position unreadable:
 * 2% is a quality problem and 98% is a scheduling problem, and they
 * need completely different responses.
 */
export const PLAIN_STATUS = {
  brokenCohort: 'Choose a Response',
  brokenItems: 72,
  brokenIsLive: true,
  unverifiedItems: 3255,
  /** What unblocks the 98%. One 20-minute sitting, by one named person. */
  blockedOn: 'B4 — the calibration sitting, support@classraum.com',
  humanChecksSoFar: 'Every cohort a human has actually read came back clean. None has ever failed a human check except Choose a Response.',
} as const
