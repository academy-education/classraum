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
 * THERE ARE TWO ANSWERS, because there are two questions, and conflating
 * them shipped a mock test that did not match the exam it mocks.
 *
 * ── Delivery: match the published format ────────────────────────────
 * The real sections are built around a small number of passages read
 * closely:
 *
 *     ISEE Middle/Upper   6 passages x 6 questions = 36 in 35 min
 *     SSAT Middle/Upper   7-8 passages x 5-6       = 40 in 40 min
 *
 * Delivering 36 questions at 3 per passage means TWELVE passages in the
 * same 35 minutes — 2.9 minutes per passage against the real 5.8. The
 * question count and the clock both looked right while the reading load
 * was double, which makes our mock harder than the exam and tells a
 * student they are less ready than they are. The bank was authored to
 * the real shape all along: every passage group holds exactly 6 items.
 *
 * ── QC: treat the passage as the unit ───────────────────────────────
 * The 3-item cap was earned, but on a different question. Measured on
 * reading-worlds-s3, all six keys within a topic come from one passage
 * variant, so the items are perfectly correlated: a candidate who
 * identifies the world scores ~5/6 and one who does not scores ~0/6.
 * That makes EFFECTIVE n the number of topics, so a 40-item section
 * sampled from 7 passages is about as reliable as a 7-item test — for
 * OUR statistics. Sampling for a blind attack still caps at 3.
 *
 * The premise behind extending that cap to delivery has since been
 * tested and did not hold: the RW5 attack returned -19.8 with every
 * item position below chance, so a student cannot identify the world
 * without reading. The correlation is real in our sampling and absent
 * in a sitting.
 *
 * Capping delivery at 3 also DISCARDED HALF THE BANK — 75 of 117 ISEE
 * items drawable, 83 of 138 SSAT — so the faithful format yields more
 * distinct forms (3.25 and 3.45) than the cap did (2.08 each), not
 * fewer.
 */

/** Delivery: questions per passage, per the published format. */
export const ITEMS_PER_PASSAGE: Record<AdmissionFamily, number> = {
  isee: 6,
  ssat: 6,
}

/**
 * QC SAMPLING ONLY. Do not use this to draw a student's test — see the
 * note above. It exists so a blind attack over reading items cannot
 * take six perfectly-correlated items from one passage and count them
 * as six independent observations.
 */
export const MAX_ITEMS_PER_PASSAGE_FOR_SAMPLING = 3

/**
 * Draw a reading section the way the exam is built: a FIXED, SMALL
 * number of passages, each read closely.
 *
 * Distinct from spreadAcrossPassages, and the difference is the whole
 * point. That function round-robins across every passage available, so
 * raising its cap from 3 to 6 against a 29-passage bank still produced
 * ten-plus passages at 3-4 items each — the same too-much-reading shape,
 * just less obviously. Fidelity needs passages CHOSEN, then filled.
 *
 * Picks ceil(count / perPassage) passages that can supply a full set,
 * fills each, and only then falls back to partly-filled passages so a
 * thin bank degrades instead of failing.
 */
export function drawByPassage<T extends { passageGroupId: string | null }>(
  rows: T[], count: number, perPassage: number,
): T[] {
  const groups = new Map<string, T[]>()
  for (const r of rows) {
    const k = r.passageGroupId ?? `__solo__${groups.size}`
    const g = groups.get(k)
    if (g) g.push(r)
    else groups.set(k, [r])
  }
  // Full passages first, largest first among the rest, so a short bank
  // loses whole passages rather than serving many fragments.
  const ordered = [...groups.values()].sort((a, b) => {
    const af = a.length >= perPassage ? 1 : 0
    const bf = b.length >= perPassage ? 1 : 0
    return bf - af || b.length - a.length
  })
  /*
   * Distribute EVENLY across the chosen passages rather than filling
   * each to `perPassage` and truncating the last. Filling gave SSAT
   * 6,6,6,6,6,6,4 — the trailing 4 sits outside the published "5 to 6
   * questions per passage", and a passage carrying four questions is a
   * visibly different task from one carrying six. Even distribution
   * gives 6,6,6,6,6,5,5, which is inside the range.
   */
  const wanted = Math.min(Math.ceil(count / perPassage), ordered.length)
  const chosen = ordered.slice(0, wanted)
  const base = Math.floor(count / wanted)
  const extra = count % wanted              // this many passages get one more
  const out: T[] = []
  chosen.forEach((g, i) => {
    out.push(...g.slice(0, Math.min(base + (i < extra ? 1 : 0), g.length)))
  })
  // A thin bank can leave us short; top up from whatever remains rather
  // than returning an under-length section silently.
  if (out.length < count) {
    const taken = new Set(out)
    for (const g of ordered) {
      for (const r of g) {
        if (out.length >= count) break
        if (!taken.has(r)) { out.push(r); taken.add(r) }
      }
      if (out.length >= count) break
    }
  }
  return out
}

/**
 * Spread reading items across passages, taking at most
 * `maxPer` from each before revisiting any. THE CALLER MUST SAY WHICH
 * limit it means — ITEMS_PER_PASSAGE to deliver a test,
 * MAX_ITEMS_PER_PASSAGE_FOR_SAMPLING to draw a QC sample. There is no
 * default, because the default was how one number came to serve two
 * incompatible purposes.
 *
 * Round-robin rather than "fill a passage then move on", so a short bank
 * degrades by givingeach passage fewer items rather than by exhausting a
 * few passages completely.
 */
export function spreadAcrossPassages<T extends { passageGroupId: string | null }>(
  rows: T[], count: number, maxPer: number,
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
