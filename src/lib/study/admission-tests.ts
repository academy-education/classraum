/**
 * SSAT and ISEE — section blueprints and scoring.
 *
 * These two do not fit either existing shape. SAT is adaptive modules
 * weighted by content domain; TOEFL is a task-type mix. SSAT and ISEE are
 * fixed BLOCKS: a named section, a fixed question count, a fixed clock,
 * delivered in a fixed order. So they get their own blueprint rather than
 * a widened AssembleParams — `section` there is typed to SAT's two.
 *
 * Sources: TEST_SPECS.ssat / TEST_SPECS.isee in src/lib/test-specs.ts,
 * which carry the published EMA and ERB formats.
 */

export type AdmissionFamily = 'ssat' | 'isee'

export interface AdmissionSection {
  /** Stable id for this block within its test. */
  key: string
  name: string
  /** study_item_bank.section this block draws from. null = not drawn from
   *  the bank (essay prompts, which are free-response). */
  bankSection: 'verbal' | 'math' | 'reading' | 'writing' | null
  questions: number
  minutes: number
  choiceCount: number
  /**
   * Whether the block contributes to the reported score. SSAT's Writing
   * Sample and ISEE's Essay do not — but UNSCORED IS NOT UNIMPORTANT:
   * both are sent to every school the student applies to, so they are
   * dropped from the score, never from the form.
   */
  scored: boolean
}

/**
 * Delivery order is the real exam's order and is load-bearing: SSAT
 * bookends the test with two quantitative sections, and ISEE puts both
 * math sections on opposite sides of Reading.
 */
export const ADMISSION_BLUEPRINT: Record<AdmissionFamily, AdmissionSection[]> = {
  ssat: [
    { key: 'writing',   name: 'Writing Sample',           bankSection: 'writing', questions: 1,  minutes: 25, choiceCount: 0, scored: false },
    { key: 'quant1',    name: 'Quantitative Section 1',   bankSection: 'math',    questions: 25, minutes: 30, choiceCount: 5, scored: true },
    { key: 'reading',   name: 'Reading Comprehension',    bankSection: 'reading', questions: 40, minutes: 40, choiceCount: 5, scored: true },
    { key: 'verbal',    name: 'Verbal',                   bankSection: 'verbal',  questions: 60, minutes: 30, choiceCount: 5, scored: true },
    { key: 'quant2',    name: 'Quantitative Section 2',   bankSection: 'math',    questions: 25, minutes: 30, choiceCount: 5, scored: true },
  ],
  isee: [
    { key: 'verbal',    name: 'Verbal Reasoning',         bankSection: 'verbal',  questions: 40, minutes: 20, choiceCount: 4, scored: true },
    { key: 'quant',     name: 'Quantitative Reasoning',   bankSection: 'math',    questions: 37, minutes: 35, choiceCount: 4, scored: true },
    { key: 'reading',   name: 'Reading Comprehension',    bankSection: 'reading', questions: 36, minutes: 35, choiceCount: 4, scored: true },
    { key: 'mathach',   name: 'Mathematics Achievement',  bankSection: 'math',    questions: 47, minutes: 40, choiceCount: 4, scored: true },
    { key: 'essay',     name: 'Essay',                    bankSection: 'writing', questions: 1,  minutes: 30, choiceCount: 0, scored: false },
  ],
}

/*
 * SSAT's Experimental section (16 Q / 15 min, unscored) is deliberately
 * ABSENT. On the real exam it exists to trial items on live candidates;
 * serving one here would spend 15 minutes of a student's time on
 * questions that do not count and that we are not trialling. If pilot
 * items are ever introduced, add it back with a real purpose.
 */

/** Total scored multiple-choice questions on a full form. */
export function scoredQuestionCount(family: AdmissionFamily): number {
  return ADMISSION_BLUEPRINT[family].filter(s => s.scored).reduce((n, s) => n + s.questions, 0)
}

export interface RawTally {
  correct: number
  wrong: number
  /** Left blank. Distinct from wrong on SSAT, where it is worth 0 rather
   *  than −1/4, and irrelevant on ISEE. */
  omitted: number
}

export interface AdmissionScore {
  family: AdmissionFamily
  correct: number
  wrong: number
  omitted: number
  /** Raw points. SSAT applies the guessing penalty; ISEE counts rights only. */
  raw: number
  /** Highest raw attainable on the questions delivered. */
  maxRaw: number
  percentCorrect: number
  /**
   * The reported headline on the real exam — a scaled score for SSAT
   * (500-800/section) and a stanine for ISEE (1-9). BOTH ARE ALWAYS NULL
   * HERE, and `scaleNote` says why.
   */
  scaled: null
  stanine: null
  scaleNote: string
}

/**
 * SSAT: +1 correct, −1/4 wrong, 0 blank. ISEE: rights only.
 *
 * The penalty is why `omitted` has to be tracked at submit rather than
 * derived from correct/total: a blank and a wrong answer are worth
 * different amounts, so `wrong = total − correct` is not recoverable
 * arithmetic on SSAT. Getting this wrong silently understates every
 * score by a quarter point per skipped question.
 */
export function scoreAdmission(family: AdmissionFamily, t: RawTally): AdmissionScore {
  const delivered = t.correct + t.wrong + t.omitted
  const raw = family === 'ssat' ? t.correct - 0.25 * t.wrong : t.correct
  return {
    family,
    correct: t.correct, wrong: t.wrong, omitted: t.omitted,
    // Round to 2dp: quarter-points are exact in binary, but a sum of them
    // still prints as 12.749999999999998 often enough to matter on screen.
    raw: Math.round(raw * 100) / 100,
    maxRaw: delivered,
    percentCorrect: delivered === 0 ? 0 : Math.round((1000 * t.correct) / delivered) / 10,
    scaled: null,
    stanine: null,
    scaleNote: SCALE_NOTE[family],
  }
}

/**
 * WHY NO SCALED SCORE AND NO STANINE.
 *
 * Both are NORM-REFERENCED: an SSAT scaled score places a candidate
 * against same-grade, same-gender test takers over three years, and an
 * ISEE stanine is a 1-9 band cut from a percentile against same-grade
 * applicants. We have neither norm group nor any basis to synthesise one.
 *
 * A plausible-looking stanine computed from percent-correct would be a
 * fabricated number on a screen a parent reads, and this project has
 * already shipped one of those — a hand-written band ladder printed
 * beside a percent-derived 0-30 score, each internally consistent and
 * jointly false. Returning null and saying so is the honest failure.
 */
const SCALE_NOTE: Record<AdmissionFamily, string> = {
  ssat: 'Practice raw score only. The real SSAT reports a 500-800 scaled score and a percentile against same-grade, same-gender test takers over three years; we have no norm group, so no scaled score is shown.',
  isee: 'Practice raw score only. The real ISEE reports a stanine (1-9) cut from a percentile against same-grade applicants; we have no norm group, so no stanine is shown.',
}

/**
 * How many reading items may be drawn from any one passage.
 *
 * Measured on reading-worlds-s3: all six keys within a topic come from a
 * single passage variant, so the six items are perfectly correlated — a
 * candidate who identifies the world once scores ~5/6, and one who does
 * not scores ~0/6. The targeted attack found aggregate accuracy at chance
 * but topic-level variance large, which makes EFFECTIVE n the number of
 * topics rather than the number of items.
 *
 * A 40-item SSAT reading section drawn from 7 passages would therefore be
 * about as reliable as a 7-item test. Three is the compromise the s2/s3
 * per-topic voter data supports (20 of 22 topics answered non-uniformly),
 * and it keeps a 40-item section spread over at least 14 passages.
 */
export const MAX_ITEMS_PER_PASSAGE = 3

/**
 * Spread reading items across passages, taking at most
 * MAX_ITEMS_PER_PASSAGE from each before revisiting any.
 *
 * Round-robin rather than "fill a passage then move on", so a short bank
 * degrades by givingeach passage fewer items rather than by exhausting a
 * few passages completely.
 */
export function spreadAcrossPassages<T extends { passageGroupId: string | null }>(
  rows: T[], count: number, maxPer = MAX_ITEMS_PER_PASSAGE,
): T[] {
  const groups = new Map<string, T[]>()
  for (const r of rows) {
    const k = r.passageGroupId ?? `__solo__${groups.size}`
    const list = groups.get(k) ?? []
    list.push(r)
    groups.set(k, list)
  }
  const out: T[] = []
  const order = [...groups.keys()]
  for (let round = 0; round < maxPer && out.length < count; round++) {
    for (const k of order) {
      if (out.length >= count) break
      const list = groups.get(k)!
      const next = list[round]
      if (next) out.push(next)
    }
  }
  return out
}

/* ------------------------------------------------------------------ *
 * Topic slug -> blueprint section
 *
 * The study_topics rows use their own slugs (`ssat-quant-1`), which do
 * NOT title-case into the blueprint names ("Quant 1" is not
 * "Quantitative Section 1"). The topic page's generic parseTestSlug
 * derives a section by capitalising the slug, and for these families
 * that silently produces a section nothing matches — so the mapping is
 * explicit here, where it can be tested, rather than inferred there.
 *
 * `ssat-experimental` is deliberately absent. A topic row exists for it
 * because the real SSAT has one, but ADMISSION_BLUEPRINT excludes it on
 * purpose (see the note above it): it is unscored, and serving it would
 * spend 15 minutes of a student's time on questions that do not count.
 * Absent here means admissionSectionForSlug returns null and the caller
 * refuses to start, which is the intended behaviour, not an oversight.
 * ------------------------------------------------------------------ */
export const ADMISSION_TOPIC_SLUGS: Record<string, { family: AdmissionFamily; key: string }> = {
  'ssat-writing':          { family: 'ssat', key: 'writing' },
  'ssat-quant-1':          { family: 'ssat', key: 'quant1' },
  'ssat-reading':          { family: 'ssat', key: 'reading' },
  'ssat-verbal':           { family: 'ssat', key: 'verbal' },
  'ssat-quant-2':          { family: 'ssat', key: 'quant2' },
  'isee-verbal':           { family: 'isee', key: 'verbal' },
  'isee-quant-reasoning':  { family: 'isee', key: 'quant' },
  'isee-reading':          { family: 'isee', key: 'reading' },
  'isee-math-achievement': { family: 'isee', key: 'mathach' },
  'isee-essay':            { family: 'isee', key: 'essay' },
}

/** The blueprint section a topic slug names, or null if the slug is not
 *  a startable admission section (including `ssat-experimental` and the
 *  `test-ssat` / `test-isee` parents, which pick a section first). */
export function admissionSectionForSlug(
  slug: string,
): { family: AdmissionFamily; section: AdmissionSection } | null {
  const hit = ADMISSION_TOPIC_SLUGS[slug]
  if (!hit) return null
  const section = ADMISSION_BLUEPRINT[hit.family].find(s => s.key === hit.key)
  return section ? { family: hit.family, section } : null
}

/** Total questions and minutes for a full form — for the landing card's
 *  stat chip, so the number cannot drift from the blueprint by being
 *  typed by hand. */
export function admissionFormTotals(family: AdmissionFamily): { questions: number; minutes: number } {
  const secs = ADMISSION_BLUEPRINT[family]
  return {
    questions: secs.reduce((n, s) => n + s.questions, 0),
    minutes: secs.reduce((n, s) => n + s.minutes, 0),
  }
}
