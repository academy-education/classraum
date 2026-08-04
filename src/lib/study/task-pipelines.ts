/**
 * Per-task authoring and QC profile, organised the way the product is —
 * by test and section — rather than by the abstract family the gates key off.
 *
 * Both organisations are real and they cross-cut. `bank-qc.ts` groups by
 * FAMILY because that is what determines which gates run: four of the eleven
 * TOEFL task types have no answer key, so "hide the source and see if a solver
 * still picks the key" is not a question that parses for them. But nobody
 * thinks in families when they ask "how are TOEFL Listening questions made",
 * so this table carries the family as a property and lets the UI group by
 * test → section.
 *
 * `family` here must agree with `familyForTask()` in bank-qc.ts. A test pins
 * that, so the two cannot drift.
 */

import type { ItemFamily } from './bank-qc'

export interface TaskPipeline {
  task: string
  label: string
  test: 'TOEFL' | 'SAT'
  section: string
  family: ItemFamily
  /** What is withheld in the attack — the thing the student is supposed to
   *  need. "The question itself" for maths, where there is nothing else. */
  source: string
  /** What the student is shown and asked to produce. */
  format: string
  /** How the no-source attack is rendered for this task, in one sentence. */
  attack: string
  /** The failure this task has actually shown, or is most exposed to.
   *  Written from measurement, not from theory. */
  watchFor: string
  /** What the WITH-SOURCE stage must actually verify for this task.
   *
   *  Stage 3 is one name covering genuinely different jobs. For multiple
   *  choice it is "is this answerable and appropriately hard". For a
   *  production task with no key it is something else entirely — a second
   *  valid word order, a prompt no band can answer, a rubric that cannot
   *  separate bands. Leaving those implied is why every production task
   *  currently reads "not measured": nobody knew what to run. */
  withSourceChecks: string[]
}

export const TASK_PIPELINES: TaskPipeline[] = [
  // ---- TOEFL Listening -----------------------------------------------
  {
    task: 'choose_response', label: 'Choose a Response', test: 'TOEFL', section: 'Listening',
    family: 'mc_hidden_source',
    source: 'A short spoken utterance', format: 'Four candidate replies, pick the most natural',
    attack: 'Hide the utterance, shuffle the four replies, ask three solvers to pick.',
    watchFor: 'Distractors written to be wrong in MANNER — too formal, flippant, over-eager — rather than wrong about the situation. A reader rejects them on sight without hearing anything.',
    withSourceChecks: ["3 solvers agree with the key on >=95%","no item where two options are both defensible","difficulty mix within +/-10pts of spec","the utterance decides it — not register or manners"],
  },
  {
    task: 'conversation', label: 'Conversation', test: 'TOEFL', section: 'Listening',
    family: 'mc_hidden_source',
    source: 'A two-speaker recording', format: 'Sets of 2–4 questions sharing one audio',
    attack: 'Hide the transcript but KEEP the set grouping — the questions must be attacked together.',
    watchFor: 'Cross-item leakage: one item’s distractors state another item’s correct fact, so four questions rebuild the recording between them. Invisible to a per-item check.',
    withSourceChecks: ["3 solvers agree with the key on >=95%","no item with two defensible answers","difficulty mix within +/-10pts of spec","no item answerable from a sibling question in the same set"],
  },
  {
    task: 'announcement', label: 'Announcement', test: 'TOEFL', section: 'Listening',
    family: 'mc_hidden_source',
    source: 'A single-speaker announcement', format: 'Sets of 2–4 questions sharing one audio',
    attack: 'Hide the transcript, keep set grouping.',
    watchFor: 'Short sets have less redundancy to exploit, so this scores lowest of the four — but still far above the published bar.',
    withSourceChecks: ["3 solvers agree with the key on >=95%","no item with two defensible answers","difficulty mix within +/-10pts of spec","no item answerable from a sibling question in the same set"],
  },
  {
    task: 'academic_talk', label: 'Academic Talk', test: 'TOEFL', section: 'Listening',
    family: 'mc_hidden_source',
    source: 'A lecture excerpt', format: 'Sets of 2–4 questions sharing one audio',
    attack: 'Hide the transcript, keep set grouping.',
    watchFor: 'World-knowledge sufficiency — if the key is the mainstream scholarly position and the distractors are recognisable misconceptions, the item tests domain knowledge and the audio is decorative.',
    withSourceChecks: ["3 solvers agree with the key on >=95%","no item with two defensible answers","difficulty mix within +/-10pts of spec","the talk decides it — not general subject knowledge"],
  },

  // ---- TOEFL Reading -------------------------------------------------
  {
    task: 'daily_life', label: 'Daily Life', test: 'TOEFL', section: 'Reading',
    family: 'mc_hidden_source',
    source: 'A short practical text', format: 'Two questions per text',
    attack: 'Hide the passage, keep the question, attack both questions of a text together.',
    watchFor: 'The draw needs whole two-question sets, so single-question texts are unusable — 69 of 133 items cannot be served at all.',
    withSourceChecks: ["3 solvers agree with the key on >=95%","no item with two defensible answers","every text carries exactly two scored questions","difficulty mix within +/-10pts of spec"],
  },
  {
    task: 'academic_passage', label: 'Academic Passage', test: 'TOEFL', section: 'Reading',
    family: 'mc_hidden_source',
    source: 'An academic passage', format: 'Sets of 2–5 questions sharing one passage',
    attack: 'Hide the passage, keep the stem, preserve set grouping.',
    watchFor: 'Hedging asymmetry — keys are the qualified “both/and” option while distractors carry only/always/never and read as false on sight.',
    withSourceChecks: ["3 solvers agree with the key on >=95%","no item with two defensible answers","2-5 questions per passage, never 12","difficulty mix within +/-10pts of spec"],
  },
  {
    task: 'fill_in_blanks', label: 'Complete the Words', test: 'TOEFL', section: 'Reading',
    family: 'cloze',
    source: 'A passage', format: 'Ten blanks, first letters given, no options',
    attack: 'Show the letter stub and its local sentence, withhold the passage. There are no options and no key positions.',
    watchFor: 'A stub long enough that only one word fits regardless of the passage. Never attacked — quality is unmeasured.',
    withSourceChecks: ["every blank has exactly one defensible completion given the passage","the letter stub does not over-determine the word on its own","exactly 10 scored blanks per row"],
  },

  // ---- TOEFL Speaking ------------------------------------------------
  {
    task: 'speaking_repeat', label: 'Listen and Repeat', test: 'TOEFL', section: 'Speaking',
    family: 'production',
    source: 'A spoken sentence', format: 'Student repeats it aloud; scored on accuracy',
    attack: 'None applicable — there is no key and no options to leak.',
    watchFor: 'Already the best-gated task in the codebase: word-count band, no scaffolding prefix that would be read aloud, and passage must equal the answer. This is the model to copy.',
    withSourceChecks: ["8-12 words, and the count matches the labelled band","no scaffolding prefix that would be read aloud","passage is byte-identical to correct_answer"],
  },
  {
    task: 'speaking_interview', label: 'Interview', test: 'TOEFL', section: 'Speaking',
    family: 'production',
    source: 'A spoken question', format: 'Free spoken response, rubric-graded',
    attack: 'None applicable — no key exists.',
    watchFor: 'An ambiguous prompt, or a rubric that cannot separate bands. Gate by grading three responses written to different target bands, blind.',
    withSourceChecks: ["the prompt admits a clear on-topic response at every band","3 responses written to different bands are graded to those bands","scored against the SPEAKING guide, not Writing s"],
  },

  // ---- TOEFL Writing -------------------------------------------------
  {
    task: 'arrange_words', label: 'Build a Sentence', test: 'TOEFL', section: 'Writing',
    family: 'production',
    source: 'A scrambled word set', format: 'Student orders the words',
    attack: 'None applicable — no distractors exist.',
    watchFor: 'More than one grammatical ordering. Gate: an independent solver orders the words; any second valid ordering fails the item.',
    withSourceChecks: ["exactly ONE grammatical ordering — an independent solver finds no second","the target sentence is natural, not merely legal","no word set solvable by length or capitalisation alone"],
  },
  {
    task: 'writing_email', label: 'Email', test: 'TOEFL', section: 'Writing',
    family: 'production',
    source: 'A situation and an email to reply to', format: 'Free text, rubric-graded',
    attack: 'None applicable — no key exists.',
    watchFor: 'The grader must receive the passage, not just the 70-character instruction. Speaking and Writing have SEPARATE official rubrics that disagree; do not import one into the other.',
    withSourceChecks: ["the situation, the email and the bulleted requirements all reach the grader","3 responses written to different bands are graded to those bands","scored against the WRITING guide — Speaking s zero-conditions do not apply"],
  },
  {
    task: 'writing_discussion', label: 'Academic Discussion', test: 'TOEFL', section: 'Writing',
    family: 'production',
    source: 'A professor prompt and two student posts', format: 'Free text, rubric-graded',
    attack: 'None applicable — no key exists.',
    watchFor: 'Duplicate submission rows from two callers racing produced two different bands for one essay. One writer per item.',
    withSourceChecks: ["the professor prompt and both student posts reach the grader","3 responses written to different bands are graded to those bands","exactly one submission writer per item — no racing callers"],
  },

  // ---- SAT -----------------------------------------------------------
  {
    task: 'sat_rw', label: 'Reading and Writing', test: 'SAT', section: 'Reading & Writing',
    family: 'mc_hidden_source',
    source: 'A short passage', format: 'Four options, one question per passage',
    attack: 'Hide the passage, keep the stem, shuffle options.',
    watchFor: 'Same hedging asymmetry as TOEFL Reading. Note that goal-stating stems are NOT a defect — published College Board items do exactly that.',
    withSourceChecks: ["3 solvers agree with the key on >=95%","no item with two defensible answers","difficulty mix within +/-10pts of spec"],
  },
  {
    task: 'sat_math', label: 'Math', test: 'SAT', section: 'Math',
    family: 'mc_stem_source',
    source: 'The question itself — there is nothing else to hide',
    format: 'Four numeric or algebraic options',
    attack: 'Strip the STEM and leave four bare values. Chance is the honest floor, so any margin at all is a defect.',
    watchFor: 'The derivational hub — distractors generated FROM the key by predictable slips (negate, reciprocal, double, square), making the key the unique centre. 96 items affected.',
    withSourceChecks: ["3 solvers agree with the key on >=95%","no item with two defensible answers","the stem alone determines the answer","difficulty mix within +/-10pts of spec"],
  },
]
