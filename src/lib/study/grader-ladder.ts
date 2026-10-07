/**
 * Rubric-anchored answer ladder for the TOEFL Writing / Speaking grader —
 * the pure parts (fixture validation and every statistic). The runner is
 * `scripts/grader-ladder.ts`; the ladders are
 * `src/lib/study/__fixtures__/grader-ladder.ts`.
 *
 * THIS IS A CONSISTENCY INSTRUMENT, NOT A CALIBRATION. Every "intended
 * band" here is OUR reading of the official descriptors, applied to
 * answers WE wrote. It can show that the grader orders answers the way
 * the rubric says it should, gives the same answer the same band twice,
 * and reacts to the dimension that changed. It cannot show that a band
 * matches what an ETS rater would give — see CLAUDE.md, "The grader is
 * not calibrated, and cannot be from public data". Any offset reported
 * here is relative to our own ladder, never to ETS.
 *
 * Design: each prompt has ONE anchor (a strong answer, intended 5) and a
 * tree of degradations. Every non-anchor step names its PARENT and the
 * ONE rubric dimension it changed relative to that parent, so the
 * per-dimension sensitivity is measured on an edge where nothing else
 * moved. Steps may be chained (cumulative) or branch from the anchor.
 */

export type LadderTaskType = 'academic_discussion' | 'email' | 'take_interview'
export type LadderSkill = 'writing' | 'speaking'

/**
 * Dimensions each task's OWN official guide names. Kept per task type on
 * purpose: Speaking and Writing have separate ETS guides that disagree
 * (CLAUDE.md, "a convention from one skill silently applies to the
 * other"), so a dimension from one must not be usable in the other's
 * ladder.
 *
 *  - errors_timed: Writing band 5's "errors expected from a competent
 *    writer writing under timed conditions". Writing ONLY — Speaking has
 *    no such clause. An errors_timed step is an INVARIANCE step: the
 *    intended band does not move.
 *  - social_conventions / task_completion: Write an Email only.
 *  - originality: "minimal original language ... mostly borrowed from
 *    the stimulus" (Writing band 1).
 *  - delivery: Speaking names it, but we test the TRANSCRIPT path only —
 *    there is no audio — so no ladder step may claim to change it.
 */
export const DIMENSIONS_BY_TASK: Record<LadderTaskType, readonly string[]> = {
  academic_discussion: ['errors_timed', 'language_range', 'errors', 'development', 'relevance', 'originality'],
  email: ['errors_timed', 'language_range', 'errors', 'development', 'relevance', 'originality', 'social_conventions', 'task_completion'],
  take_interview: ['language_use', 'topic_development', 'relevance'],
}

export const SKILL_OF_TASK: Record<LadderTaskType, LadderSkill> = {
  academic_discussion: 'writing',
  email: 'writing',
  take_interview: 'speaking',
}

/** Dimensions whose steps are expected NOT to move the band. */
export const INVARIANCE_DIMENSIONS = new Set(['errors_timed'])

export interface LadderStep {
  id: string
  /** Null for the anchor; otherwise the step this one was derived from. */
  parent: string | null
  /** Null for the anchor. */
  changed: string | null
  /** Our reading of the official descriptors. May be a half band where
   *  two adjacent bands are both defensible (e.g. Speaking, where "a
   *  typical response exhibits the following" at every band means one
   *  weaker feature does not by itself settle the lower band). */
  intendedBand: number
  /** The official descriptor phrase that the change moves the answer to. */
  descriptor: string
  /** What was changed relative to the parent, written so a reader can
   *  check that nothing else moved. */
  note: string
  response: string
}

export interface LadderPrompt {
  id: string
  taskType: LadderTaskType
  /** study_item_bank.id the prompt was copied from. Our own bank, never
   *  an ETS sample. */
  bankItemId: string
  bankCohort: string | null
  /** item.passage, verbatim. */
  passage: string
  /** item.prompt, verbatim. */
  prompt: string
  steps: LadderStep[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function tokenizeWords(s: string): string[] {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, ' ').split(/\s+/).filter(Boolean)
}

export function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length
}

/** Tokens not shared in order between a and b (insertions + deletions,
 *  via LCS). A substitution counts 2. */
export function tokenEditCount(a: string, b: string): number {
  const x = tokenizeWords(a)
  const y = tokenizeWords(b)
  const dp: number[] = new Array(y.length + 1).fill(0)
  for (let i = 1; i <= x.length; i++) {
    let prev = 0
    for (let j = 1; j <= y.length; j++) {
      const tmp = dp[j]!
      dp[j] = x[i - 1] === y[j - 1] ? prev + 1 : Math.max(dp[j]!, dp[j - 1]!)
      prev = tmp
    }
  }
  const lcs = dp[y.length]!
  return (x.length - lcs) + (y.length - lcs)
}

/**
 * Structural checks only. They cannot tell whether a step really differs
 * in nothing but the stated dimension — that was checked by hand and is
 * recorded in each step's `note`. What they CAN refuse mechanically:
 * a dimension from the other skill's guide, a degradation that raises
 * the intended band, a typo step that rewrote the answer, a prompt or
 * answer lifted from the ETS samples, a broken tree.
 */
export function validateLadders(
  prompts: LadderPrompt[],
  forbiddenTexts: string[] = [],
): string[] {
  const errors: string[] = []
  const seenIds = new Set<string>()
  const forbidden = forbiddenTexts
    .map(t => t.replace(/\s+/g, ' ').trim().toLowerCase())
    .filter(t => t.length >= 40)

  for (const p of prompts) {
    const where = `prompt ${p.id}`
    if (!DIMENSIONS_BY_TASK[p.taskType]) { errors.push(`${where}: unknown task type ${p.taskType}`); continue }
    if (!p.prompt.trim()) errors.push(`${where}: empty prompt`)
    if (!p.bankItemId.trim()) errors.push(`${where}: no bankItemId — prompts must come from our own bank`)
    const allowed = DIMENSIONS_BY_TASK[p.taskType]
    const byId = new Map<string, LadderStep>()
    for (const s of p.steps) {
      if (seenIds.has(s.id)) errors.push(`${where}: duplicate step id ${s.id}`)
      seenIds.add(s.id)
      byId.set(s.id, s)
    }
    const anchors = p.steps.filter(s => s.parent === null)
    if (anchors.length !== 1) errors.push(`${where}: needs exactly one anchor, has ${anchors.length}`)
    if (anchors[0] && anchors[0].intendedBand !== 5) errors.push(`${where}: anchor ${anchors[0].id} must be intended 5`)
    if (p.steps.length < 4) errors.push(`${where}: only ${p.steps.length} steps — too few to measure ordering`)

    const promptNorm = `${p.passage} ${p.prompt}`.replace(/\s+/g, ' ').toLowerCase()
    for (const f of forbidden) {
      // A 40-char window from an ETS text appearing in our prompt means
      // the ladder is grading against ETS's own material.
      for (let i = 0; i + 40 <= f.length; i += 40) {
        if (promptNorm.includes(f.slice(i, i + 40))) {
          errors.push(`${where}: prompt contains ETS sample text ("${f.slice(i, i + 40)}")`)
          break
        }
      }
    }

    for (const s of p.steps) {
      const w = `${where} step ${s.id}`
      if (!s.response.trim()) errors.push(`${w}: empty response`)
      if (!Number.isFinite(s.intendedBand) || s.intendedBand < 0 || s.intendedBand > 5) {
        errors.push(`${w}: intended band ${s.intendedBand} outside 0-5`)
      }
      if (Math.round(s.intendedBand * 2) !== s.intendedBand * 2) errors.push(`${w}: intended band must be a whole or half band`)
      if (!s.descriptor.trim()) errors.push(`${w}: no descriptor`)
      if (!s.note.trim()) errors.push(`${w}: no note`)
      const respNorm = s.response.replace(/\s+/g, ' ').toLowerCase()
      for (const f of forbidden) {
        if (respNorm.includes(f.slice(0, 40))) errors.push(`${w}: response contains ETS sample text`)
      }
      if (s.parent === null) {
        if (s.changed !== null) errors.push(`${w}: anchor cannot name a changed dimension`)
        continue
      }
      const parent = byId.get(s.parent)
      if (!parent) { errors.push(`${w}: parent ${s.parent} not in this prompt`); continue }
      if (!s.changed) { errors.push(`${w}: non-anchor step must name the ONE dimension it changed`); continue }
      if (!allowed.includes(s.changed)) {
        errors.push(`${w}: dimension "${s.changed}" is not in the ${p.taskType} guide (allowed: ${allowed.join(', ')})`)
      }
      if (s.intendedBand > parent.intendedBand) errors.push(`${w}: a degradation cannot raise the intended band (${parent.intendedBand} → ${s.intendedBand})`)
      if (INVARIANCE_DIMENSIONS.has(s.changed)) {
        if (s.intendedBand !== parent.intendedBand) errors.push(`${w}: ${s.changed} is an invariance step; intended band must equal the parent's`)
        const edits = tokenEditCount(parent.response, s.response)
        if (edits === 0) errors.push(`${w}: ${s.changed} step is identical to its parent`)
        if (edits > 8) errors.push(`${w}: ${s.changed} step changes ${edits} tokens — a typo step must leave the answer otherwise identical`)
      } else if (s.intendedBand === parent.intendedBand) {
        errors.push(`${w}: a non-invariance step must lower the intended band`)
      }
      if (s.response.trim() === parent.response.trim()) errors.push(`${w}: identical to its parent`)
    }
    // Cycle check: walking parents from any step must reach the anchor.
    for (const s of p.steps) {
      let cur: LadderStep | undefined = s
      let hops = 0
      while (cur && cur.parent !== null && hops <= p.steps.length) { cur = byId.get(cur.parent); hops++ }
      if (hops > p.steps.length) errors.push(`${where} step ${s.id}: parent chain does not reach the anchor`)
    }
  }
  return errors
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export interface GradedStep {
  promptId: string
  taskType: LadderTaskType
  stepId: string
  parent: string | null
  changed: string | null
  intendedBand: number
  /** One band per repeat. */
  given: number[]
}

export function mean(xs: number[]): number {
  if (xs.length === 0) throw new Error('mean of an empty list')
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

/** Average ranks, ties sharing the mean rank. */
export function ranks(xs: number[]): number[] {
  const idx = xs.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
  const out = new Array<number>(xs.length)
  let k = 0
  while (k < idx.length) {
    let j = k
    while (j + 1 < idx.length && idx[j + 1]!.v === idx[k]!.v) j++
    const r = (k + j) / 2 + 1
    for (let m = k; m <= j; m++) out[idx[m]!.i] = r
    k = j + 1
  }
  return out
}

function pearson(a: number[], b: number[]): number | null {
  const n = a.length
  if (n < 2) return null
  const ma = mean(a), mb = mean(b)
  let num = 0, da = 0, db = 0
  for (let i = 0; i < n; i++) {
    num += (a[i]! - ma) * (b[i]! - mb)
    da += (a[i]! - ma) ** 2
    db += (b[i]! - mb) ** 2
  }
  // No variance on either side means there is no ordering to measure.
  // Return null, never 0 or NaN: a NaN fails every threshold and a 0
  // reads as a measurement.
  if (da === 0 || db === 0) return null
  return num / Math.sqrt(da * db)
}

/** Spearman's rho (ties averaged). Null when either side is constant. */
export function spearman(a: number[], b: number[]): number | null {
  if (a.length !== b.length) throw new Error('spearman: length mismatch')
  return pearson(ranks(a), ranks(b))
}

/** Kendall's tau-b. Null when either side is constant. */
export function kendallTauB(a: number[], b: number[]): number | null {
  if (a.length !== b.length) throw new Error('kendall: length mismatch')
  let concordant = 0, discordant = 0, tiesA = 0, tiesB = 0
  for (let i = 0; i < a.length; i++) {
    for (let j = i + 1; j < a.length; j++) {
      const da = Math.sign(a[i]! - a[j]!)
      const db = Math.sign(b[i]! - b[j]!)
      if (da === 0 && db === 0) continue
      if (da === 0) { tiesA++; continue }
      if (db === 0) { tiesB++; continue }
      if (da === db) concordant++
      else discordant++
    }
  }
  const n0 = concordant + discordant
  const denom = Math.sqrt((n0 + tiesA) * (n0 + tiesB))
  if (denom === 0 || n0 + tiesA === 0 || n0 + tiesB === 0) return null
  return (concordant - discordant) / denom
}

export interface PairFinding {
  promptId: string
  higher: string
  lower: string
  intendedHigher: number
  intendedLower: number
  givenHigher: number
  givenLower: number
}

/**
 * Within one prompt: pairs the ladder orders one way and the grader the
 * other (inversions), and pairs at least one intended band apart that the
 * grader could not tell apart at all (flat). Pairs whose intended bands
 * differ by only half a band are never called flat — a half band means
 * "either neighbour is defensible".
 */
export function findInversions(steps: GradedStep[]): { inversions: PairFinding[]; flat: PairFinding[]; pairs: number } {
  const inversions: PairFinding[] = []
  const flat: PairFinding[] = []
  let pairs = 0
  const byPrompt = new Map<string, GradedStep[]>()
  for (const s of steps) byPrompt.set(s.promptId, [...(byPrompt.get(s.promptId) ?? []), s])
  for (const [promptId, list] of byPrompt) {
    for (let i = 0; i < list.length; i++) {
      for (let j = 0; j < list.length; j++) {
        const hi = list[i]!, lo = list[j]!
        if (!(hi.intendedBand > lo.intendedBand)) continue
        pairs++
        const gh = mean(hi.given), gl = mean(lo.given)
        const f: PairFinding = {
          promptId, higher: hi.stepId, lower: lo.stepId,
          intendedHigher: hi.intendedBand, intendedLower: lo.intendedBand,
          givenHigher: gh, givenLower: gl,
        }
        if (gh < gl) inversions.push(f)
        else if (gh === gl && hi.intendedBand - lo.intendedBand >= 1) flat.push(f)
      }
    }
  }
  return { inversions, flat, pairs }
}

export interface SpreadRow { stepId: string; min: number; max: number; spread: number; n: number }

export function spreads(steps: GradedStep[]): SpreadRow[] {
  return steps.map(s => {
    if (s.given.length === 0) throw new Error(`no grades for ${s.stepId}`)
    const min = Math.min(...s.given), max = Math.max(...s.given)
    return { stepId: s.stepId, min, max, spread: max - min, n: s.given.length }
  })
}

export function bandHits(steps: GradedStep[], tolerance = 0.5): { hits: number; n: number } {
  let hits = 0, n = 0
  for (const s of steps) {
    for (const g of s.given) {
      n++
      if (Math.abs(g - s.intendedBand) <= tolerance + 1e-9) hits++
    }
  }
  return { hits, n }
}

/**
 * The hit rate a grader would get by giving EVERY grade the same band —
 * the best such constant, chosen from the data. A hit rate is only
 * evidence above this line: on a ladder concentrated around 2-3, a
 * grader that always says 3 already hits a third of the time.
 */
export function bestConstantHitRate(steps: GradedStep[], tolerance = 0.5): { band: number; hits: number; n: number } {
  let best = { band: 0, hits: -1, n: 0 }
  for (let c = 0; c <= 5; c += 0.5) {
    const constant = steps.map(s => ({ ...s, given: s.given.map(() => c) }))
    const h = bandHits(constant, tolerance)
    if (h.hits > best.hits) best = { band: c, hits: h.hits, n: h.n }
  }
  return best
}

/** Mean of (given − intended) over every individual grade. RELATIVE TO
 *  OUR OWN LADDER — never an offset from ETS raters. */
export function ladderOffset(steps: GradedStep[]): { offset: number; n: number } {
  const ds: number[] = []
  for (const s of steps) for (const g of s.given) ds.push(g - s.intendedBand)
  if (ds.length === 0) throw new Error('offset over zero grades')
  return { offset: mean(ds), n: ds.length }
}

export type EdgeVerdict = 'lowered' | 'flat' | 'raised' | 'held' | 'moved'

export interface EdgeRow {
  promptId: string
  parent: string
  child: string
  dimension: string
  expectedDrop: number
  givenDrop: number
  verdict: EdgeVerdict
}

/** One row per parent→child edge: did changing ONE dimension move the
 *  band the way the ladder says? Invariance edges (expected drop 0) are
 *  'held' when the band moved by at most half a band. */
export function edges(steps: GradedStep[]): EdgeRow[] {
  const key = (p: string, s: string) => `${p}::${s}`
  const byKey = new Map(steps.map(s => [key(s.promptId, s.stepId), s]))
  const out: EdgeRow[] = []
  for (const s of steps) {
    if (s.parent === null || s.changed === null) continue
    const parent = byKey.get(key(s.promptId, s.parent))
    if (!parent) throw new Error(`edge ${s.stepId}: parent ${s.parent} was not graded`)
    const expectedDrop = parent.intendedBand - s.intendedBand
    const givenDrop = mean(parent.given) - mean(s.given)
    let verdict: EdgeVerdict
    if (expectedDrop === 0) verdict = Math.abs(givenDrop) <= 0.5 + 1e-9 ? 'held' : 'moved'
    else verdict = givenDrop > 1e-9 ? 'lowered' : givenDrop < -1e-9 ? 'raised' : 'flat'
    out.push({ promptId: s.promptId, parent: s.parent, child: s.stepId, dimension: s.changed, expectedDrop, givenDrop, verdict })
  }
  return out
}

export interface DimensionRow {
  dimension: string
  n: number
  lowered: number
  flat: number
  raised: number
  held: number
  moved: number
  meanExpectedDrop: number
  meanGivenDrop: number
}

export function sensitivityByDimension(rows: EdgeRow[]): DimensionRow[] {
  const by = new Map<string, EdgeRow[]>()
  for (const r of rows) by.set(r.dimension, [...(by.get(r.dimension) ?? []), r])
  return [...by.entries()].map(([dimension, rs]) => ({
    dimension,
    n: rs.length,
    lowered: rs.filter(r => r.verdict === 'lowered').length,
    flat: rs.filter(r => r.verdict === 'flat').length,
    raised: rs.filter(r => r.verdict === 'raised').length,
    held: rs.filter(r => r.verdict === 'held').length,
    moved: rs.filter(r => r.verdict === 'moved').length,
    meanExpectedDrop: mean(rs.map(r => r.expectedDrop)),
    meanGivenDrop: mean(rs.map(r => r.givenDrop)),
  })).sort((a, b) => a.dimension.localeCompare(b.dimension))
}

export interface OrderingSummary {
  n: number
  spearman: number | null
  kendall: number | null
  /** Why a correlation is null, when it is. */
  undefinedReason: string | null
}

/** Ordering over per-step MEAN given bands. */
export function ordering(steps: GradedStep[]): OrderingSummary {
  const intended = steps.map(s => s.intendedBand)
  const given = steps.map(s => mean(s.given))
  const rho = spearman(intended, given)
  const tau = kendallTauB(intended, given)
  let undefinedReason: string | null = null
  if (rho === null || tau === null) {
    if (steps.length < 2) undefinedReason = 'fewer than 2 steps'
    else if (new Set(given).size === 1) undefinedReason = 'grader gave every step the same band — no ordering information'
    else if (new Set(intended).size === 1) undefinedReason = 'every step has the same intended band'
    else undefinedReason = 'degenerate input'
  }
  return { n: steps.length, spearman: rho, kendall: tau, undefinedReason }
}

// ---------------------------------------------------------------------------
// Break-test helpers (used by --shuffle-ladder and the tests)
// ---------------------------------------------------------------------------

/** Deterministic PRNG so a shuffled run is reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Permute the intended-band LABELS among a prompt's steps while leaving
 * the answers where they are. A grader keyed to the content then
 * disagrees with the labels, which is what the ordering statistics must
 * detect. Retries until the permutation is not the identity on bands.
 */
export function shuffleIntended<T extends { intendedBand: number }>(steps: T[], seed: number): T[] {
  const rnd = mulberry32(seed)
  const bands = steps.map(s => s.intendedBand)
  if (new Set(bands).size < 2) return steps.map(s => ({ ...s }))
  for (let attempt = 0; attempt < 100; attempt++) {
    const perm = [...bands]
    for (let i = perm.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1))
      ;[perm[i], perm[j]] = [perm[j]!, perm[i]!]
    }
    if (perm.some((b, i) => b !== bands[i])) return steps.map((s, i) => ({ ...s, intendedBand: perm[i]! }))
  }
  throw new Error('could not find a non-identity shuffle')
}
