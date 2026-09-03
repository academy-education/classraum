/**
 * ACT — section blueprint, content quotas, and scoring.
 *
 * This is the ENHANCED ACT: the form ACT rolled out nationally in
 * September 2025 and moved every administration to by spring 2026. It is
 * not the legacy test most prep material still describes. Every number
 * here was read off ACT's own 2025-26 materials on 2026-09-02 —
 * "Preparing for the ACT Test" (form 25MC1) and "Practice Multiple
 * Choice Test 2" (form 25MC5) — and the places where the enhanced form
 * differs from the legacy one are called out, because they are exactly
 * the places a stale source would get wrong:
 *
 *     English   75 Q / 45 min  ->  50 Q / 35 min
 *     Math      60 Q / 60 min  ->  45 Q / 50 min, and FIVE choices -> FOUR
 *     Reading   40 Q / 35 min  ->  36 Q / 40 min
 *     Science   40 Q / 35 min  ->  40 Q / 40 min, and now OPTIONAL
 *     Composite = English + Math + Reading only. Science is excluded.
 *
 * The bank follows ADMISSION_BLUEPRINT's shape (fixed blocks, fixed
 * clocks, fixed order) rather than SAT's adaptive modules — the ACT is
 * linear. It adds two things SSAT/ISEE do not have: PUBLISHED content
 * quotas per section, and PASSAGE-LEVEL structure (reading genres,
 * science formats) that assembly must honour, because a form with four
 * natural-science passages is not an ACT Reading section however many
 * questions it has.
 *
 * Copyright note: the ACT practice forms were used to VERIFY format —
 * counts, timings, option letters, passage structure, question stems.
 * No passage, item, figure or answer from them enters this bank.
 */

export type ActSectionKey = 'english' | 'math' | 'reading' | 'science' | 'writing'

export interface ActSection {
  key: ActSectionKey
  name: string
  /** study_item_bank.section this block draws from. null = free response. */
  bankSection: 'english' | 'math' | 'reading' | 'science' | 'writing' | null
  questions: number
  minutes: number
  /** 0 for the essay. Every multiple-choice section is 4 — including
   *  Math, which the legacy ACT ran at 5. */
  choiceCount: 0 | 4
  /** Reported as a 1-36 section score on the real exam. */
  scored: boolean
  /** Feeds the 1-36 Composite. Science does NOT, since Sept 2025. */
  inComposite: boolean
  /** A candidate may register without it. */
  optional: boolean
}

/**
 * Delivery order is the real exam's and is load-bearing: English, Math,
 * a 10-15 minute break, Reading, then Science if taken, then Writing if
 * taken. The break is not modelled — a self-timed mock has no proctor.
 */
export const ACT_BLUEPRINT: readonly ActSection[] = [
  { key: 'english', name: 'English',     bankSection: 'english', questions: 50, minutes: 35, choiceCount: 4, scored: true,  inComposite: true,  optional: false },
  { key: 'math',    name: 'Mathematics', bankSection: 'math',    questions: 45, minutes: 50, choiceCount: 4, scored: true,  inComposite: true,  optional: false },
  { key: 'reading', name: 'Reading',     bankSection: 'reading', questions: 36, minutes: 40, choiceCount: 4, scored: true,  inComposite: true,  optional: false },
  { key: 'science', name: 'Science',     bankSection: 'science', questions: 40, minutes: 40, choiceCount: 4, scored: true,  inComposite: false, optional: true  },
  { key: 'writing', name: 'Writing',     bankSection: 'writing', questions: 1,  minutes: 40, choiceCount: 0, scored: false, inComposite: false, optional: true  },
]

export function actSection(key: ActSectionKey): ActSection {
  const s = ACT_BLUEPRINT.find(b => b.key === key)
  if (!s) throw new Error(`unknown ACT section '${key}'`)
  return s
}

/* ------------------------------------------------------------------ *
 * Passage structure
 *
 * These are the bit of the format that a question count cannot carry.
 * ------------------------------------------------------------------ */

/** English: five passages, ten questions each, always. Verified on both
 *  forms (Q1-10, 11-20, 21-30, 31-40, 41-50). */
export const ENGLISH_PASSAGES = 5
export const ENGLISH_ITEMS_PER_PASSAGE = 10

/**
 * Reading: four passages, nine questions each, in a FIXED genre order.
 * One of the four is a paired set — Passage A and Passage B on a shared
 * topic, with cross-passage questions. On form 25MC5 the pair is the
 * literary narrative (I); ACT rotates which genre carries the pair, so
 * `paired` is a property of the drawn form, not of the genre.
 */
export const READING_PASSAGES = 4
export const READING_ITEMS_PER_PASSAGE = 9
export type ReadingGenre = 'literary_narrative' | 'social_science' | 'humanities' | 'natural_science'
export const READING_GENRE_ORDER: readonly ReadingGenre[] = [
  'literary_narrative', 'social_science', 'humanities', 'natural_science',
]
/** Exactly one passage per form is a paired A/B set. */
export const READING_PAIRED_PASSAGES = 1

/**
 * Science: seven passages of 5-6 questions, in three formats. Form 25MC5
 * ran I=DR, II=CV, III=RS, IV=RS, V=CV, VI=RS, VII=DR with 5,6,6,6,6,6,5
 * questions — DR 10, RS 18, CV 12 items.
 *
 * KNOWN CONTRADICTION IN ACT'S OWN MATERIALS, recorded rather than
 * resolved. ACT publishes item shares of Data Representation 26-32%,
 * Research Summaries 50-56%, Conflicting Viewpoints 18-21%. The form
 * above is 25% / 45% / 30%: two CV passages of six items can never fit
 * under a 21% ceiling on a 40-item section (8.4 items), and ACT ships
 * two. The likeliest reconciliation is that the published shares
 * describe the 34 SCORED items and the six field-test items sit
 * disproportionately in CV, but nothing we hold can confirm that.
 *
 * So both are kept as ACT states them: the passage split below is what
 * ACT ships, SCIENCE_FORMAT_QUOTAS is what ACT publishes, and
 * act-blueprint.test.ts asserts they DISAGREE — so that nobody quietly
 * edits one to match the other and calls it a fix.
 */
export const SCIENCE_PASSAGES = 7
export type ScienceFormat = 'data_representation' | 'research_summaries' | 'conflicting_viewpoints'
export const SCIENCE_FORMAT_PASSAGES: Readonly<Record<ScienceFormat, number>> = {
  data_representation: 2,
  research_summaries: 3,
  conflicting_viewpoints: 2,
}
export const SCIENCE_ITEMS_PER_PASSAGE = { min: 5, max: 6 } as const

/* ------------------------------------------------------------------ *
 * Content quotas — ACT's published reporting-category shares.
 *
 * Stored as [min, max] PERCENT ranges exactly as ACT publishes them, not
 * as point targets. A draw is on-blueprint when every category's share of
 * delivered items falls inside its range; assembly should aim for the
 * midpoint and a checker should flag anything outside. SSAT and ISEE do
 * not publish these, which is why ADMISSION_BLUEPRINT has none — here
 * inventing nothing is not an option, because the real numbers exist.
 * ------------------------------------------------------------------ */
export type QuotaRange = readonly [min: number, max: number]

// Corrected 2026-09-04. These read [38,23,38] until an authoring agent
// noticed that no form it could write would satisfy them. Conventions is
// the MAJORITY category on the English test, not co-equal with Production
// of Writing; the old numbers made it a third. Nothing consumed this
// constant, which is why a wrong blueprint sat here unnoticed — the three
// places that DO drive behaviour (test-specs.ts patterns_en/ko and the
// generate route's 0.305 split) all carried the right shares, so the
// contradiction was between a live spec and a dead one.
export const ENGLISH_QUOTAS: Readonly<Record<string, QuotaRange>> = {
  'Production of Writing':            [29, 32],
  'Knowledge of Language':            [13, 19],
  'Conventions of Standard English':  [51, 56],
}

/**
 * Math publishes two layers. "Preparing for Higher Math" is 80% and splits
 * into five sub-categories; "Integrating Essential Skills" is the other
 * 20%. Both layers are listed because a draw must satisfy both.
 */
export const MATH_QUOTAS: Readonly<Record<string, QuotaRange>> = {
  'Number and Quantity':              [10, 12],
  'Algebra':                          [17, 20],
  'Functions':                        [17, 20],
  'Geometry':                         [17, 20],
  'Statistics and Probability':       [12, 15],
  'Integrating Essential Skills':     [20, 20],
}
export const MATH_HIGHER_MATH_SHARE: QuotaRange = [80, 80]

export const READING_QUOTAS: Readonly<Record<string, QuotaRange>> = {
  'Key Ideas and Details':            [44, 52],
  'Craft and Structure':              [26, 33],
  'Integration of Knowledge and Ideas': [19, 26],
}

export const SCIENCE_QUOTAS: Readonly<Record<string, QuotaRange>> = {
  'Interpretation of Data':           [38, 50],
  'Scientific Investigation':         [18, 32],
  'Evaluation of Models, Inferences, and Experimental Results': [24, 38],
}

/** Item-share by passage format, distinct from the skill quotas above. */
export const SCIENCE_FORMAT_QUOTAS: Readonly<Record<ScienceFormat, QuotaRange>> = {
  data_representation:    [26, 32],
  research_summaries:     [50, 56],
  conflicting_viewpoints: [18, 21],
}

export const ACT_QUOTAS: Readonly<Record<Exclude<ActSectionKey, 'writing'>, Readonly<Record<string, QuotaRange>>>> = {
  english: ENGLISH_QUOTAS,
  math: MATH_QUOTAS,
  reading: READING_QUOTAS,
  science: SCIENCE_QUOTAS,
}

/* ------------------------------------------------------------------ *
 * Option lettering
 *
 * The ACT alternates: odd-numbered questions are A B C D, even-numbered
 * are F G H J. It is a real, visible property of every form and a
 * student who has practised on real material expects it. The renderer
 * keys label style on `family` today (KSAT gets circled digits); this is
 * the helper it needs for ACT.
 * ------------------------------------------------------------------ */
export const ACT_LETTERS_ODD  = ['A', 'B', 'C', 'D'] as const
export const ACT_LETTERS_EVEN = ['F', 'G', 'H', 'J'] as const

/** Letters for the question at 1-based position `n` in its section. */
export function actLettersFor(n: number): readonly string[] {
  return n % 2 === 1 ? ACT_LETTERS_ODD : ACT_LETTERS_EVEN
}

/* ------------------------------------------------------------------ *
 * Scoring
 * ------------------------------------------------------------------ */

export interface ActTally { correct: number; wrong: number; omitted: number }

export interface ActSectionScore {
  key: ActSectionKey
  correct: number
  wrong: number
  omitted: number
  /** Rights only. The ACT has NO guessing penalty — "there is no penalty
   *  for guessing" is printed in the directions of every form. */
  raw: number
  maxRaw: number
  percentCorrect: number
  /** The 1-36 section score. ALWAYS NULL here; `scaleNote` says why. */
  scaled: null
}

export interface ActScore {
  sections: ActSectionScore[]
  /** Average of the English, Math and Reading SCALED scores on the real
   *  exam. Scaled is null, so this is null — a composite of raw counts
   *  would be a number the ACT never reports. */
  composite: null
  compositeSections: readonly ActSectionKey[]
  scaleNote: string
}

export const ACT_COMPOSITE_SECTIONS: readonly ActSectionKey[] = ['english', 'math', 'reading']

/**
 * WHY NO 1-36 AND NO COMPOSITE.
 *
 * The 1-36 scale is produced by a form-specific raw-to-scale conversion
 * that ACT equates statistically across administrations and publishes
 * only for its own released forms. We hold no such table for any form
 * we assemble, and a hand-drawn one would be exactly the kind of number
 * this project has already shipped once by accident — a band ladder
 * printed beside a percent-derived score, each internally consistent and
 * jointly false. Raw and percent are real; the 1-36 is not ours to give.
 */
export const ACT_SCALE_NOTE =
  'Practice raw scores only. The real ACT reports each section on a 1-36 scale via a form-specific conversion, and a Composite that averages English, Math and Reading (Science is excluded). We have no conversion table for this form, so no scaled score or Composite is shown.'

export function scoreActSection(key: ActSectionKey, t: ActTally): ActSectionScore {
  const delivered = t.correct + t.wrong + t.omitted
  return {
    key,
    correct: t.correct, wrong: t.wrong, omitted: t.omitted,
    raw: t.correct,
    maxRaw: delivered,
    percentCorrect: delivered === 0 ? 0 : Math.round((1000 * t.correct) / delivered) / 10,
    scaled: null,
  }
}

export function scoreAct(tallies: Partial<Record<ActSectionKey, ActTally>>): ActScore {
  const sections = ACT_BLUEPRINT
    .filter(b => b.scored && tallies[b.key])
    .map(b => scoreActSection(b.key, tallies[b.key]!))
  return { sections, composite: null, compositeSections: ACT_COMPOSITE_SECTIONS, scaleNote: ACT_SCALE_NOTE }
}

/* ------------------------------------------------------------------ *
 * Form totals — derived, never typed, for the same reason the SSAT/ISEE
 * card figures are: a typed total drifts the first time a block changes.
 * ------------------------------------------------------------------ */
export function actFormTotals(opts: { science: boolean; writing: boolean }) {
  const blocks = ACT_BLUEPRINT.filter(b =>
    !b.optional || (b.key === 'science' && opts.science) || (b.key === 'writing' && opts.writing))
  return {
    questions: blocks.filter(b => b.choiceCount > 0).reduce((n, b) => n + b.questions, 0),
    minutes: blocks.reduce((n, b) => n + b.minutes, 0),
  }
}

/* ------------------------------------------------------------------ *
 * Topic slug -> blueprint section
 *
 * Same reason ADMISSION_TOPIC_SLUGS exists: the topic page's generic
 * parseTestSlug title-cases a slug into a section NAME, and a name
 * lookup is exactly what mispriced two ISEE sections on 2026-09-01. The
 * mapping is explicit and tested; the topic rows already exist.
 * ------------------------------------------------------------------ */
export const ACT_TOPIC_SLUGS: Readonly<Record<string, ActSectionKey>> = {
  'act-english': 'english',
  'act-math':    'math',
  'act-reading': 'reading',
  'act-science': 'science',
  'act-writing': 'writing',
}

/** The blueprint section a topic slug names, or null for `test-act` and
 *  anything unknown. */
export function actSectionForSlug(slug: string): ActSection | null {
  const key = ACT_TOPIC_SLUGS[slug]
  return key ? actSection(key) : null
}
