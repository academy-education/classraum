/**
 * Item statistics from real student attempts — the "second ground truth" that
 * AMENDMENT-3-TRUST-LEVELS.md names as the only route past the L2 cap without a
 * second reviewer (real students, >= 30 non-internal attempts on an audit sample).
 *
 * REPORTS ONLY. Nothing here edits, hides or releases an item. See
 * scripts/study-bank/ITEM-STATS.md for what each flag means and how a flag might
 * one day count as a "miss" (not wired into the tracker).
 *
 * Guards, each pinned by a test that fails when the guard is removed:
 *  - internal/test accounts are dropped BEFORE anything is computed, and counted;
 *  - only a student's FIRST attempt on an item counts;
 *  - nothing flags below `minN` (default 30, the amendment's number), and every
 *    stat carries the n it was computed over;
 *  - input that cannot be read throws — an empty or malformed attempt list never
 *    returns a number (CLAUDE.md: a check that cannot read its input must not).
 */

export interface AttemptRow {
  itemId: string
  studentId: string
  sessionId: string
  /** The option TEXT the student chose (choices are shuffled per session), or free text. */
  answer: string | null
  isCorrect: boolean
  timeSec: number | null
  createdAt: string
}

export interface ItemMeta {
  id: string
  /** family/section, e.g. "isee/reading" */
  section: string
  key: string | null
  choices: string[] | null
  hasPassage: boolean
}

export interface StatsOptions {
  /** Students to drop before computing anything (users.is_internal, study test users). */
  excludedStudentIds: ReadonlySet<string>
  minN?: number
  /** Point-biserial below this (and >= 0) is "near zero". */
  nearZeroDiscrimination?: number
  pLow?: number
  pHigh?: number
  /** A distractor chosen by less than this share of attempts is "unused". */
  unusedShare?: number
  /** A correct answer faster than this fraction of the section's median time is "fast". */
  fastFraction?: number
  /** Flag when at least this share of an item's correct answers are fast. */
  fastShareFlag?: number
}

export type Severity = 'high' | 'medium' | 'low'

export interface ItemFlag {
  code:
    | 'top_below_bottom'
    | 'distractor_beats_key_top'
    | 'negative_discrimination'
    | 'distractor_beats_key'
    | 'near_zero_discrimination'
    | 'fast_correct'
    | 'too_hard'
    | 'too_easy'
    | 'unused_distractor'
  severity: Severity
  reason: string
}

export interface ItemStat {
  itemId: string
  section: string
  n: number
  pValue: number
  /** n of attempts with a rest score (another scored item in the same session). */
  nDiscrimination: number
  pointBiserial: number | null
  /** upper-27% p minus lower-27% p, over attempts with a rest score. */
  discriminationIndex: number | null
  nGroup: number
  choiceCounts: Record<string, number>
  topGroupChoiceCounts: Record<string, number>
  medianTimeSec: number | null
  flags: ItemFlag[]
}

export interface StatsReport {
  attemptsRead: number
  attemptsExcludedAccounts: number
  studentsExcluded: number
  repeatAttemptsDropped: number
  attemptsWithoutMeta: number
  studentsCounted: number
  attemptsCounted: number
  minN: number
  itemsSeen: number
  itemsAtMinN: number
  items: ItemStat[]
}

const UNANSWERED = '(no answer)'

function median(xs: number[]): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function pointBiserial(correct: number[], rest: number[]): number | null {
  const n = correct.length
  if (n < 2) return null
  const mc = correct.reduce((a, b) => a + b, 0) / n
  const mr = rest.reduce((a, b) => a + b, 0) / n
  let cov = 0, vc = 0, vr = 0
  for (let i = 0; i < n; i++) {
    cov += (correct[i] - mc) * (rest[i] - mr)
    vc += (correct[i] - mc) ** 2
    vr += (rest[i] - mr) ** 2
  }
  if (vc === 0 || vr === 0) return null
  return cov / Math.sqrt(vc * vr)
}

function validate(attempts: unknown): asserts attempts is AttemptRow[] {
  if (!Array.isArray(attempts) || attempts.length === 0) {
    throw new Error('item-stats: no attempts to read — refusing to return a number')
  }
  attempts.forEach((a, i) => {
    const r = a as Partial<AttemptRow>
    if (!r || typeof r.itemId !== 'string' || !r.itemId || typeof r.studentId !== 'string' || !r.studentId ||
        typeof r.sessionId !== 'string' || !r.sessionId || typeof r.isCorrect !== 'boolean' ||
        typeof r.createdAt !== 'string' || Number.isNaN(Date.parse(r.createdAt))) {
      throw new Error(`item-stats: malformed attempt at index ${i}`)
    }
  })
}

export function computeItemStats(
  attemptsIn: AttemptRow[],
  meta: ReadonlyMap<string, ItemMeta>,
  opts: StatsOptions,
): StatsReport {
  validate(attemptsIn)
  if (!opts || !(opts.excludedStudentIds instanceof Set)) {
    throw new Error('item-stats: excludedStudentIds is required (pass an empty Set only on purpose)')
  }
  const minN = opts.minN ?? 30
  const nearZero = opts.nearZeroDiscrimination ?? 0.1
  const pLow = opts.pLow ?? 0.15
  const pHigh = opts.pHigh ?? 0.95
  const unusedShare = opts.unusedShare ?? 0.02
  const fastFraction = opts.fastFraction ?? 0.3
  const fastShareFlag = opts.fastShareFlag ?? 0.2

  // 1. Excluded accounts go first, before any statistic exists.
  const excludedStudents = new Set<string>()
  const kept: AttemptRow[] = []
  for (const a of attemptsIn) {
    if (opts.excludedStudentIds.has(a.studentId)) excludedStudents.add(a.studentId)
    else kept.push(a)
  }
  const attemptsExcludedAccounts = attemptsIn.length - kept.length

  // 2. First attempt per (student, item).
  const first = new Map<string, AttemptRow>()
  for (const a of kept) {
    const k = `${a.studentId}\u0000${a.itemId}`
    const prev = first.get(k)
    if (!prev || Date.parse(a.createdAt) < Date.parse(prev.createdAt)) first.set(k, a)
  }
  const repeatAttemptsDropped = kept.length - first.size

  // 3. Items without bank metadata are counted and skipped, never guessed at.
  const rows: AttemptRow[] = []
  let attemptsWithoutMeta = 0
  for (const a of first.values()) {
    if (meta.has(a.itemId)) rows.push(a)
    else attemptsWithoutMeta++
  }

  // Rest score: the student's proportion correct on the OTHER counted items of the same session.
  const bySession = new Map<string, { correct: number; total: number }>()
  for (const a of rows) {
    const s = bySession.get(a.sessionId) ?? { correct: 0, total: 0 }
    s.total++
    if (a.isCorrect) s.correct++
    bySession.set(a.sessionId, s)
  }
  const restOf = (a: AttemptRow): number | null => {
    const s = bySession.get(a.sessionId)!
    const others = s.total - 1
    return others > 0 ? (s.correct - (a.isCorrect ? 1 : 0)) / others : null
  }

  // Section median times, for the fast-correct floor.
  const sectionTimes = new Map<string, number[]>()
  for (const a of rows) {
    if (a.timeSec == null || a.timeSec <= 0) continue
    const sec = meta.get(a.itemId)!.section
    const arr = sectionTimes.get(sec) ?? []
    arr.push(a.timeSec)
    sectionTimes.set(sec, arr)
  }
  const sectionMedian = new Map<string, number | null>()
  for (const [sec, ts] of sectionTimes) sectionMedian.set(sec, median(ts))

  const byItem = new Map<string, AttemptRow[]>()
  for (const a of rows) {
    const arr = byItem.get(a.itemId) ?? []
    arr.push(a)
    byItem.set(a.itemId, arr)
  }

  const items: ItemStat[] = []
  for (const [itemId, arr] of byItem) {
    const m = meta.get(itemId)!
    const n = arr.length
    const correctN = arr.filter(a => a.isCorrect).length
    const pValue = correctN / n
    const choiceCounts: Record<string, number> = {}
    for (const c of m.choices ?? []) choiceCounts[c] = 0
    for (const a of arr) {
      const k = a.answer == null || a.answer === '' ? UNANSWERED : a.answer
      choiceCounts[k] = (choiceCounts[k] ?? 0) + 1
    }

    const withRest = arr.map(a => ({ a, r: restOf(a) })).filter(x => x.r != null) as { a: AttemptRow; r: number }[]
    const nDisc = withRest.length
    const pb = pointBiserial(withRest.map(x => (x.a.isCorrect ? 1 : 0)), withRest.map(x => x.r))
    let discriminationIndex: number | null = null
    let nGroup = 0
    const topGroupChoiceCounts: Record<string, number> = {}
    if (nDisc >= 2) {
      const sorted = [...withRest].sort((x, y) => x.r - y.r)
      nGroup = Math.max(1, Math.round(nDisc * 0.27))
      const lower = sorted.slice(0, nGroup)
      const upper = sorted.slice(sorted.length - nGroup)
      const p = (g: typeof sorted) => g.filter(x => x.a.isCorrect).length / g.length
      discriminationIndex = p(upper) - p(lower)
      for (const x of upper) {
        const k = x.a.answer == null || x.a.answer === '' ? UNANSWERED : x.a.answer
        topGroupChoiceCounts[k] = (topGroupChoiceCounts[k] ?? 0) + 1
      }
    }

    const times = arr.map(a => a.timeSec).filter((t): t is number => t != null && t > 0)
    const medianTimeSec = median(times)

    const flags: ItemFlag[] = []
    if (n >= minN) {
      const key = m.key
      const distractors = key && m.choices ? m.choices.filter(c => c !== key) : []
      if (nDisc >= minN && discriminationIndex != null && discriminationIndex < 0) {
        flags.push({ code: 'top_below_bottom', severity: 'high', reason: `top 27% scored below bottom 27% (index ${discriminationIndex.toFixed(2)}, n=${nDisc})` })
      }
      if (key && nDisc >= minN) {
        const keyTop = topGroupChoiceCounts[key] ?? 0
        const beat = distractors.filter(d => (topGroupChoiceCounts[d] ?? 0) > keyTop)
        if (beat.length) flags.push({ code: 'distractor_beats_key_top', severity: 'high', reason: `top group chose "${beat[0]}" (${topGroupChoiceCounts[beat[0]]}) over the key (${keyTop}) of ${nGroup}` })
      }
      if (nDisc >= minN && pb != null) {
        if (pb < 0) flags.push({ code: 'negative_discrimination', severity: 'high', reason: `point-biserial ${pb.toFixed(2)} (n=${nDisc})` })
        else if (pb < nearZero) flags.push({ code: 'near_zero_discrimination', severity: 'medium', reason: `point-biserial ${pb.toFixed(2)} < ${nearZero} (n=${nDisc})` })
      }
      if (key) {
        const keyN = choiceCounts[key] ?? 0
        const beat = distractors.filter(d => (choiceCounts[d] ?? 0) > keyN)
        if (beat.length) flags.push({ code: 'distractor_beats_key', severity: 'medium', reason: `"${beat[0]}" chosen ${choiceCounts[beat[0]]} times vs key ${keyN} (n=${n})` })
      }
      if (m.hasPassage && correctN > 0) {
        const secMed = sectionMedian.get(m.section) ?? null
        if (secMed != null) {
          const floor = fastFraction * secMed
          const fast = arr.filter(a => a.isCorrect && a.timeSec != null && a.timeSec > 0 && a.timeSec < floor).length
          if (fast / correctN >= fastShareFlag) flags.push({ code: 'fast_correct', severity: 'medium', reason: `${fast} of ${correctN} correct answers under ${floor.toFixed(0)}s (${fastFraction} x section median ${secMed}s)` })
        }
      }
      if (pValue < pLow) flags.push({ code: 'too_hard', severity: 'low', reason: `p = ${pValue.toFixed(2)} < ${pLow} (n=${n})` })
      if (pValue > pHigh) flags.push({ code: 'too_easy', severity: 'low', reason: `p = ${pValue.toFixed(2)} > ${pHigh} (n=${n})` })
      for (const d of distractors) {
        if ((choiceCounts[d] ?? 0) / n < unusedShare) flags.push({ code: 'unused_distractor', severity: 'low', reason: `"${d}" chosen ${choiceCounts[d] ?? 0} of ${n} (< ${unusedShare * 100}%)` })
      }
    }

    items.push({
      itemId, section: m.section, n, pValue, nDiscrimination: nDisc, pointBiserial: pb,
      discriminationIndex, nGroup, choiceCounts, topGroupChoiceCounts, medianTimeSec, flags,
    })
  }

  const sevRank: Record<Severity, number> = { high: 0, medium: 1, low: 2 }
  const worst = (s: ItemStat) => Math.min(3, ...s.flags.map(f => sevRank[f.severity]))
  items.sort((a, b) => worst(a) - worst(b) || b.flags.length - a.flags.length || b.n - a.n)

  return {
    attemptsRead: attemptsIn.length,
    attemptsExcludedAccounts,
    studentsExcluded: excludedStudents.size,
    repeatAttemptsDropped,
    attemptsWithoutMeta,
    studentsCounted: new Set(rows.map(a => a.studentId)).size,
    attemptsCounted: rows.length,
    minN,
    itemsSeen: items.length,
    itemsAtMinN: items.filter(s => s.n >= minN).length,
    items,
  }
}
