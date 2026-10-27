/**
 * autonomy-core.mjs — the PURE half of the trust-level tracker (Amendment 3 of
 * COFOUNDER-GRADER-2026-10-22.PREREG.md). No DB client, no file reads, so every
 * rule here is pinned by src/lib/study/__tests__/autonomy-core.test.ts.
 *
 * autonomy-state.mjs reads the bank, the co-founder's reviews and the notes ledger and
 * hands rows to these functions; draw-next.mjs and release-by-shape.mjs use the
 * planning and release halves.
 *
 * Vocabulary (Amendment 3):
 *   stratum   family/section/task (ACT reading and science collapse the genre/format task to '*')
 *   method    authoring brief + construction + author type + grader brief version. Any change = new method
 *   miss      a would_block defect (his verdict OR his note, via the ledger) on an item the AI pre-screen passed
 *   U         Clopper-Pearson one-sided 90% upper bound on the miss rate
 *   L0        full sitting (capped at 36); L1 one 12-item spot per batch; L2 one pooled 12-item run per wave
 *             across up to 6 batches. NO L3: the cap is 2 until a second human ground truth exists.
 */

export const PARAMS = Object.freeze({
  conf: 0.90,
  // promote[L] = the bar U must be strictly under to leave level L. promote[2] (the design's 2% for L3) is
  // kept ONLY so the L2 cap below is a real, testable cap: with maxLevel 2 it can never fire.
  promote: Object.freeze([0.20, 0.05, 0.02]),
  maxLevel: 2,
  neverAutonomousCap: 1,
  priorWeight: 0.5,
  bridgeSize: 12,
  spotSize: 12,
  l0Cap: 36,
  pooledSize: 12,
  pooledMaxBatches: 6,
  floor: 5,
})

/** Strata capped at L1 until the notes-based new checks validate (autonomy-feasibility-2026-10-23.md Part 3.5). */
export const NEVER_AUTONOMOUS = Object.freeze([
  'toefl/listening/choose_response',
  'toefl/listening/conversation',
  'ssat/reading/',
  'isee/reading/',
  'map/reading/',
  'act/science/',
])

export function stratumOf(family, section, task) {
  if (!family || !section) throw new Error(`stratumOf: missing family/section (${family}/${section})`)
  // ACT reading/science store the passage genre/format in `task`, and every batch is a whole form across all of
  // them, so a per-genre stratum would split one batch's spot across four strata.
  if (family === 'act' && (section === 'reading' || section === 'science')) return `act/${section}/*`
  if (!task) throw new Error(`stratumOf: ${family}/${section} row has no task`)
  return `${family}/${section}/${task}`
}

export const sectionOf = stratum => stratum.split('/').slice(0, 2).join('/')

export function capFor(stratum, params = PARAMS) {
  const never = NEVER_AUTONOMOUS.some(p => (p.endsWith('/') ? stratum.startsWith(p) : stratum === p))
  return never ? Math.min(params.neverAutonomousCap, params.maxLevel) : params.maxLevel
}

/* ------------------------------------------------------------------ *
 * Clopper-Pearson
 * ------------------------------------------------------------------ */

function logChooseTable(n) {
  const lf = new Float64Array(n + 1)
  for (let i = 1; i <= n; i++) lf[i] = lf[i - 1] + Math.log(i)
  return k => lf[n] - lf[k] - lf[n - k]
}

/** P(X <= x) for X ~ Binomial(n, p). */
export function binomCdf(x, n, p) {
  if (x >= n) return 1
  if (x < 0) return 0
  if (p <= 0) return 1
  if (p >= 1) return 0
  const lc = logChooseTable(n)
  let s = 0
  for (let k = 0; k <= x; k++) s += Math.exp(lc(k) + k * Math.log(p) + (n - k) * Math.log1p(-p))
  return Math.min(1, s)
}

/**
 * One-sided Clopper-Pearson upper bound: the p at which P(X <= x) = 1 - conf. n = 0 is not a measurement, so it
 * returns 1 (never promotes), and so does x >= n.
 */
export function cpUpper(x, n, conf = PARAMS.conf) {
  if (!Number.isInteger(x) || !Number.isInteger(n) || x < 0 || n < 0) throw new Error(`cpUpper: bad x=${x} n=${n}`)
  if (n === 0 || x >= n) return 1
  const target = 1 - conf
  let lo = 0, hi = 1
  for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (binomCdf(x, n, mid) > target) lo = mid; else hi = mid }
  return hi
}

/** Fewest additional CLEAN items for cpUpper(x, n + k) < bar. null if unreachable within `limit`. */
export function itemsNeeded(x, n, bar, conf = PARAMS.conf, limit = 5000) {
  for (let k = 0; k <= limit; k++) if (cpUpper(x, n + k, conf) < bar) return k
  return null
}

/* ------------------------------------------------------------------ *
 * Input integrity: the infrastructure failures (17 of 43 recorded false passes)
 * ------------------------------------------------------------------ */

export class RefusalError extends Error {
  constructor(msg) { super(msg); this.name = 'RefusalError' }
}

/** A read is complete only if it returned exactly the server's count:'exact'. 1000-row caps fail here. */
export function assertComplete(what, expected, got) {
  if (!Number.isInteger(expected)) throw new RefusalError(`${what}: no exact count from the server (got ${expected})`)
  if (got !== expected) throw new RefusalError(`${what}: read ${got} rows but the server counts ${expected} — truncated or changed mid-read`)
  return got
}

/** A review needs a ledger classification when it carries a note or a non-unique verdict. */
export function needsClassification(r) {
  return (typeof r.note === 'string' && r.note.trim() !== '') || (r.verdict != null && r.verdict !== 'unique')
}

/**
 * Join the notes ledger to the reviews. Two kinds of entry:
 *   review entries   review_id set: the classification of that review's note/flag (one per review)
 *   register entries review_id null, linked_review_ids set: a defect recorded in REGISTER from his notes (e.g. a held
 *                    passage), attached to every linked review in addition to its own classification
 * Refuses (returns errors) on: an entry whose review is absent, an entry whose item/run disagree with the review, an
 * entry with no defect_type or a non-boolean would_block, a register entry with no live link, and any review that
 * needs a classification and has none. Never falls back to verdicts only.
 * Returns byReview: Map review_id -> [entries] (its own entry first, if any).
 */
export function joinLedger(reviews, ledgerEntries) {
  const errors = []
  if (!Array.isArray(ledgerEntries)) return { byReview: new Map(), errors: ['ledger is not an array of entries'] }
  const rv = new Map(reviews.map(r => [r.id, r]))
  const byReview = new Map()
  const own = new Set()
  const add = (id, e, first) => { const a = byReview.get(id) ?? []; first ? a.unshift(e) : a.push(e); byReview.set(id, a) }
  for (const e of ledgerEntries) {
    const label = e.review_id ?? e.register_id ?? '(no id)'
    if (typeof e.defect_type !== 'string' || e.defect_type.trim() === '') errors.push(`ledger entry ${label}: unclassified (no defect_type)`)
    if (typeof e.would_block !== 'boolean') errors.push(`ledger entry ${label}: unclassified (would_block is ${JSON.stringify(e.would_block)})`)
    if (e.review_id == null) {
      const links = Array.isArray(e.linked_review_ids) ? e.linked_review_ids : []
      if (!links.length) { errors.push(`ledger entry ${label}: no review_id and no linked_review_ids (empty join)`); continue }
      const linked = links.map(id => rv.get(id))
      if (linked.some(r => !r)) { errors.push(`ledger entry ${label}: linked review ${links[linked.findIndex(r => !r)]} does not exist (empty join)`); continue }
      if (e.item_id != null && !linked.some(r => r.item_id === e.item_id)) errors.push(`ledger entry ${label}: item_id ${e.item_id} is not the item of any linked review`)
      for (const id of links) add(id, e, false)
      continue
    }
    const r = rv.get(e.review_id)
    if (!r) { errors.push(`ledger entry ${label}: no such review (empty join)`); continue }
    if (e.item_id != null && e.item_id !== r.item_id) errors.push(`ledger entry ${label}: item_id ${e.item_id} != review's ${r.item_id}`)
    if (e.run_id != null && e.run_id !== r.run_id) errors.push(`ledger entry ${label}: run_id ${e.run_id} != review's ${r.run_id}`)
    if (typeof e.note === 'string' && typeof r.note === 'string' && e.note.trim() !== r.note.trim()) errors.push(`ledger entry ${label}: note text differs from the review (classified a different note)`)
    if (own.has(e.review_id)) errors.push(`ledger entry ${label}: duplicated`)
    own.add(e.review_id)
    add(e.review_id, e, true)
  }
  for (const r of reviews) if (needsClassification(r) && !own.has(r.id)) errors.push(`review ${r.id} (run ${r.run_id}) has a note or flag and no ledger entry: unclassified note`)
  return { byReview, errors }
}

/** His verdict OR his note (through any ledger entry on that review) — a would_block defect either way. */
export function isMiss(review, entries) {
  const list = entries == null ? [] : Array.isArray(entries) ? entries : [entries]
  const verdictFlag = review.verdict != null && review.verdict !== 'unique'
  return verdictFlag || list.some(e => e?.would_block === true)
}

/* ------------------------------------------------------------------ *
 * Levels
 * ------------------------------------------------------------------ */

export function effective(cur, prior, bridge, params = PARAMS) {
  const w = bridge === 'clean' ? params.priorWeight : 0
  return { n: Math.floor(cur.n + w * prior.n + 1e-9), x: Math.ceil(cur.x + w * prior.x - 1e-9), w }
}

/**
 * Replay one method's evidence in sitting order.
 *   units: [{ key, items: [{ miss }] }]  (already sorted by sitting time)
 *   prior: the previous method's OWN current-method evidence { n, x } (carried at priorWeight only after a clean bridge)
 * Bridge = the first `bridgeSize` items sat under this method: clean if none is a miss, dirty at the first miss.
 * A miss drops one level. A clean unit can promote one level, never while the bridge is pending.
 */
export function replayMethod(units, { prior = { n: 0, x: 0 }, cap = PARAMS.maxLevel, params = PARAMS } = {}) {
  let level = 0, nCur = 0, xCur = 0, bridge = 'pending', bridgeN = 0
  const history = []
  for (const u of units) {
    const k = u.items.length, m = u.items.filter(i => i.miss).length
    if (bridge === 'pending') {
      for (const it of u.items) {
        if (bridgeN >= params.bridgeSize) break
        bridgeN++
        if (it.miss) { bridge = 'dirty'; break }
      }
      if (bridge === 'pending' && bridgeN >= params.bridgeSize) bridge = 'clean'
    }
    nCur += k; xCur += m
    const from = level
    if (m > 0) level = Math.max(0, level - 1)
    else if (bridge !== 'pending' && level < params.promote.length) {
      const e = effective({ n: nCur, x: xCur }, prior, bridge, params)
      if (cpUpper(e.x, e.n, params.conf) < params.promote[level]) level++
    }
    level = Math.min(level, cap)
    history.push({ key: u.key, k, misses: m, from, to: level, bridge })
  }
  const e = effective({ n: nCur, x: xCur }, prior, bridge, params)
  return { level, nCur, xCur, bridge, bridgeN, n: e.n, x: e.x, w: e.w, U: cpUpper(e.x, e.n, params.conf), history }
}

/**
 * A stratum is a chain of methods in authoring order. Each method replays its own units, with the previous method's
 * own evidence as its prior. firstShape: the first batch of the stratum's first-ever method is an L0 full sitting;
 * the first batch after any change gets a bridge spot whatever the level.
 *   chain: [{ method, units }]  (authoring order; the last is the CURRENT method)
 */
export function stratumState(stratum, chain, params = PARAMS) {
  const cap = capFor(stratum, params)
  const methods = []
  for (const [i, c] of chain.entries()) {
    const prev = i > 0 ? methods[i - 1] : null
    const prior = prev ? { n: prev.nCur, x: prev.xCur } : { n: 0, x: 0 }
    const s = replayMethod(c.units, { prior, cap, params })
    methods.push({ method: c.method, ...s, prior, prevLevel: prev ? prev.level : null, firstShape: prev ? 'bridge' : 'full' })
  }
  const cur = methods[methods.length - 1] ?? null
  return { stratum, cap, methods, current: cur ? withNext(cur, cap, params) : null }
}

function withNext(s, cap, params) {
  if (s.level >= cap) return { ...s, next: null, capped: true }
  const bar = params.promote[s.level]
  const needed = s.bridge === 'pending' ? Math.max(params.bridgeSize - s.bridgeN, itemsNeeded(s.x, s.n, bar, params.conf) ?? Infinity) : itemsNeeded(s.x, s.n, bar, params.conf)
  return { ...s, next: { to: s.level + 1, bar, itemsNeeded: needed }, capped: false }
}

/* ------------------------------------------------------------------ *
 * Run shapes
 * ------------------------------------------------------------------ */

/**
 * The shape the next run on a batch takes, from its method's state.
 *   'bridge'  method's bridge is pending and the stratum had an earlier method: a 12-item spot
 *   'full'    L0 (or the stratum's first-ever method before its first batch is sat): full sitting capped at 36
 *   'spot'    L1: one 12-item spot
 *   'pooled'  L2: 2-3 items in one pooled 12-item run across up to 6 batches
 */
export function shapeFor(methodState) {
  if (methodState.bridge === 'pending') return methodState.firstShape === 'bridge' ? 'bridge' : 'full'
  return ['full', 'spot', 'pooled'][Math.min(methodState.level, 2)]
}

/** Split the pooled run's 12 items over k batches (k <= 6): 2-3 each when k >= 4. */
export function pooledQuotas(k, params = PARAMS) {
  if (k < 1 || k > params.pooledMaxBatches) throw new Error(`pooled run over ${k} batches`)
  const base = Math.floor(params.pooledSize / k), rem = params.pooledSize % k
  return Array.from({ length: k }, (_, i) => base + (i < rem ? 1 : 0))
}

/**
 * Whole groups (passages / sets) for a run. spot/bridge: fewest whole groups reaching >= target items; full: whole
 * groups while the total stays <= cap (at least one). Ungrouped batches take `target`/`cap` single items.
 *   groups: [{ id, size }] in preference order (a pre-chosen spot passage first, then seeded order)
 */
export function pickGroups(groups, shape, params = PARAMS) {
  if (!groups.length) return { groups: [], items: 0 }
  const out = []; let n = 0
  if (shape === 'full') {
    for (const g of groups) { if (out.length && n + g.size > params.l0Cap) continue; out.push(g.id); n += g.size; if (n >= params.l0Cap) break }
  } else {
    for (const g of groups) { if (n >= params.spotSize) break; out.push(g.id); n += g.size }
  }
  return { groups: out, items: n }
}

/** Seeded, stable order (xorshift on a FNV hash) so a dry run and the commit pick the same passages. */
export function seededOrder(ids, seed) {
  let h = 2166136261
  for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0 }
  let s = h || 1
  const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 }
  const a = [...ids].sort()
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

/* ------------------------------------------------------------------ *
 * Floor priority
 * ------------------------------------------------------------------ */

/** Measured depth of a section from depth-snapshot.json: value, or the smallest path (warn early, never late). */
export function sectionDepth(snapshot, section) {
  const e = snapshot?.sections?.[section]
  if (!e) return null
  if (e.byPath) { const v = Object.values(e.byPath).filter(Number.isFinite); return v.length ? Math.min(...v) : null }
  return Number.isFinite(e.value) ? e.value : null
}

/** Sort key: sections under the floor first, fewest live tests first; everything else keeps queue order. */
export function floorRank(depth, params = PARAMS) {
  return depth !== null && depth < params.floor ? depth : Infinity
}

/* ------------------------------------------------------------------ *
 * Release by run shape (Amendment 1 rules, extended to pooled runs)
 * ------------------------------------------------------------------ */

/**
 * Plan the release of ONE batch from the answered rows of one run shape.
 *   batch:   { cohort, items: [{ id, verified, archived, screenFlaggedKept }] }
 *   sampled: [{ item_id, verdict, miss, holds }]   (this batch's answered rows from the run; holds = would_block note)
 *   shape:   'spot' | 'bridge' | 'pooled' | 'full'
 * spot/bridge/pooled: every sampled item clean -> release the sampled items and every unsampled, grader-cleared item;
 *   any miss -> archive verdict-flagged items, HOLD note-blocked items, release nothing else, send the batch to a
 *   full sitting (a queue entry). full: per item (unique -> release, flagged -> archive, note-blocked -> hold);
 *   unanswered items stay staged; two or more misses send the rest of the batch to a full sitting.
 */
export function planBatchRelease(batch, sampled, shape) {
  const open = batch.items.filter(i => !i.verified && !i.archived)
  const sampledIds = new Set(sampled.map(s => s.item_id))
  for (const s of sampled) if (!batch.items.some(i => i.id === s.item_id)) throw new RefusalError(`sampled item ${s.item_id} is not in ${batch.cohort}`)
  const misses = sampled.filter(s => s.miss)
  const release = [], archive = [], hold = [], stay = []
  for (const s of misses) (s.verdict != null && s.verdict !== 'unique' ? archive : hold).push(s.item_id)
  let toFullSitting = false
  if (shape === 'full') {
    for (const s of sampled) if (!s.miss) release.push(s.item_id)
    for (const i of open) if (!sampledIds.has(i.id)) stay.push(i.id)
    toFullSitting = misses.length >= 2 && stay.length > 0
  } else if (['spot', 'bridge', 'pooled'].includes(shape)) {
    if (misses.length === 0) {
      for (const s of sampled) release.push(s.item_id)
      for (const i of open) if (!sampledIds.has(i.id)) (i.screenFlaggedKept ? stay : release).push(i.id)
    } else {
      for (const s of sampled) if (!s.miss) stay.push(s.item_id)
      for (const i of open) if (!sampledIds.has(i.id)) stay.push(i.id)
      toFullSitting = stay.length > 0
    }
  } else throw new RefusalError(`unknown run shape ${shape}`)
  return { cohort: batch.cohort, shape, release, archive, hold, stay, toFullSitting, misses: misses.length }
}

/** The run shape from a run id: -pooled-, -bridgeN-, -spotN-/-spot-, -fullN-/-releaseN-. null when unknown. */
export function shapeOfRun(runId) {
  if (/-pooled(-|$)/.test(runId)) return 'pooled'
  if (/-bridge\d*(-|$)/.test(runId)) return 'bridge'
  if (/-spot\d*(-|$)/.test(runId)) return 'spot'
  if (/-(full|release)\d*(-|$)/.test(runId)) return 'full'
  return null
}

/** The queue entry a flagged spot/pooled batch gets (Amendment 1 rule 2, Amendment 3). */
export function fullSittingEntry(entry, cohort) {
  return {
    cohort, tool: entry?.tool ?? 'item', ...(entry?.domain ? { domain: entry.domain } : {}), ...(entry?.family ? { family: entry.family } : {}),
    size: PARAMS.l0Cap, route: 'full', reason: 'flag in a spot/pooled run (Amendment 3)',
    runId: `${cohort.replace(/[^a-z0-9]+/gi, '')}-full{n}-cofounder-{date}`,
  }
}

/* ------------------------------------------------------------------ *
 * Evidence: reviews -> per-stratum, per-method units
 * ------------------------------------------------------------------ */

/**
 * Method key of a cohort. A bank-declared verify_meta.method_id (uniform over the cohort) wins; it must agree with
 * the table when both exist. 'unknown' becomes a method of its own per cohort (unknown is a NEW method).
 * Throws RefusalError when neither source names the cohort.
 */
/** @param {string} cohort @param {Record<string, {method_id?: string}>} table @param {string|null} [declared] */
export function methodKeyOf(cohort, table, declared = null) {
  const t = table?.[cohort]?.method_id ?? null
  if (declared != null && t != null && declared !== t) throw new RefusalError(`cohort ${cohort}: verify_meta.method_id '${declared}' disagrees with autonomy-methods.json '${t}'`)
  const m = declared ?? t
  if (m == null) throw new RefusalError(`cohort ${cohort} has no method entry (autonomy-methods.json) and no verify_meta.method_id`)
  return m === 'unknown' ? `unknown:${cohort}` : m
}

/**
 * Turn the co-founder's reviews into evidence units.
 *   reviews:  every row of his (any kind)
 *   items:    Map item_id -> { family, section, task, cohort, content_sha }
 *   ledger:   Map review_id -> entry (from joinLedger)
 *   methodOf: cohort -> method key
 *   freshIds: ids in study_item_reviews_fresh (cross-check of the stale computation), or null
 * Excluded and COUNTED: model_assisted, unanswered, stale rows with no defect (never a pass), screen-flagged-kept.
 * Counted: a STALE row that carries a miss — the usual life of a flag is "he flags, the author edits", and dropping
 * those rows would erase exactly the misses the tracker exists to count.
 * One item sat twice counts once (a miss if either sitting found one), in the earlier sitting's unit.
 */
/** @param {{ reviews: any[], items: Map<string, any>, ledger: Map<string, any>, methodOf: (c: string) => string, screenFlaggedKept?: Set<string>, freshIds?: Set<string>|null }} args */
export function buildEvidence({ reviews, items, ledger, methodOf, screenFlaggedKept = new Set(), freshIds = null }) {
  const counts = { reviews: reviews.length, model_assisted: 0, unanswered: 0, stale: 0, stale_excluded: 0, stale_miss_counted: 0, screen_kept_excluded: 0, duplicate_merged: 0, evidence: 0, misses: 0, verdict_misses: 0, note_misses: 0 }
  const errors = []
  const perItem = new Map()
  for (const r of reviews) {
    const it = items.get(r.item_id)
    if (!it) { errors.push(`review ${r.id}: item ${r.item_id} not in the bank read (empty join)`); continue }
    if (r.reviewer_kind !== 'human') { counts.model_assisted++; continue }
    if (!r.blind_at || r.verdict == null) { counts.unanswered++; continue }
    const stale = r.item_sha !== it.content_sha
    if (freshIds && stale === freshIds.has(r.id)) errors.push(`review ${r.id}: stale by content_sha (${stale}) disagrees with study_item_reviews_fresh`)
    const entry = ledger.get(r.id)
    const miss = isMiss(r, entry)
    if (stale) counts.stale++
    if (stale && !miss) { counts.stale_excluded++; continue }
    if (screenFlaggedKept.has(r.item_id)) { counts.screen_kept_excluded++; continue }
    if (stale) counts.stale_miss_counted++
    const at = r.blind_at || r.reviewed_at
    const prev = perItem.get(r.item_id)
    const verdictMiss = r.verdict !== 'unique'
    if (prev) { counts.duplicate_merged++; prev.miss = prev.miss || miss; prev.verdictMiss ||= verdictMiss; if (at < prev.at) { prev.at = at; prev.run = r.run_id }; continue }
    perItem.set(r.item_id, { item_id: r.item_id, review_id: r.id, run: r.run_id, at, miss, verdictMiss, stale, stratum: stratumOf(it.family, it.section, it.task), cohort: it.cohort })
  }
  const units = new Map() // stratum -> method -> unitKey -> unit
  for (const e of perItem.values()) {
    let method
    try { method = methodOf(e.cohort) } catch (err) { errors.push(err.message); continue }
    counts.evidence++
    if (e.miss) { counts.misses++; if (e.verdictMiss) counts.verdict_misses++; else counts.note_misses++ }
    const s = units.get(e.stratum) ?? new Map(); units.set(e.stratum, s)
    const m = s.get(method) ?? new Map(); s.set(method, m)
    const key = e.run
    const u = m.get(key) ?? { key, at: e.at, cohorts: new Set(), items: [] }; m.set(key, u)
    if (e.at < u.at) u.at = e.at
    u.cohorts.add(e.cohort)
    u.items.push({ item_id: e.item_id, miss: e.miss, at: e.at })
  }
  const out = new Map()
  for (const [s, ms] of units) {
    const mm = new Map()
    for (const [m, us] of ms) {
      const list = [...us.values()].map(u => ({ ...u, cohorts: [...u.cohorts].sort(), items: u.items.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0)) }))
      list.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.key.localeCompare(b.key)))
      mm.set(m, list)
    }
    out.set(s, mm)
  }
  return { units: out, counts, errors }
}

/* ------------------------------------------------------------------ *
 * Queue planning: the next runs, and items for the whole queue (old rule vs Amendment 3)
 * ------------------------------------------------------------------ */

/** Sets per run in draw-toefl-conv-runs.mjs (its SHAPE table): conversations 6 x 2, lectures 3 x 4, passages 2 x 5. */
export function setShape(cohort) {
  if (cohort.startsWith('toefl-talk')) return { sets: 3, size: 4 }
  if (cohort.startsWith('toefl-passage')) return { sets: 2, size: 5 }
  return { sets: 6, size: 2 }
}

/**
 * Items the CURRENT queue rule (Amendment 1) still asks of him for one entry, assuming no flags. Mirrors
 * draw-next.mjs: an entry is done when its cohort (or group) has nothing waiting or has reached `upTo` runs.
 *   s: { waiting, runs }  (for a group entry, waiting is the group's)
 */
export function oldRuleItems(entry, s) {
  if (s.waiting === 0 || (entry.upTo != null && s.runs >= entry.upTo)) return { runs: 0, items: 0 }
  const per = entry.tool === 'sets' ? setShape(entry.cohort).sets * setShape(entry.cohort).size : entry.size
  const runs = entry.upTo != null ? entry.upTo - s.runs : Math.ceil(s.waiting / per)
  return { runs, items: Math.min(runs * per, s.waiting) }
}

const cloneChain = chain => chain.map(c => ({ method: c.method, units: c.units.map(u => ({ key: u.key, items: u.items ?? Array.from({ length: u.k }, (_, j) => ({ miss: (u.missIdx ?? []).includes(j) })) })) }))

/**
 * Simulate the queue under Amendment 3, assuming every run comes back clean (the optimistic case; a miss adds runs).
 *   strata:  Map stratum -> chain [{ method, units: [{ key, k, missIdx }] }]   (from autonomy-state.json)
 *   batches: [{ idx, cohort, stratum, method, tool, entry, family, domain, waiting, groups: [{id,size}], drawn,
 *               old: { runs, items } }]  in queue order, one per cohort (drawn batches keep their old rule)
 *   depth:   Map section -> live tests (floor ordering; +1 per batch released in a floor section, an approximation)
 * Returns { runs: [{ stratum, shape, batches: [{cohort, items, groups}], items, level, bridge }], total }
 */
export function simulateQueue({ strata, batches, depth, params = PARAMS, prioritySections = [] }) {
  const chains = new Map([...strata].map(([s, c]) => [s, cloneChain(c)]))
  const depthNow = new Map(depth)
  const left = [...batches]
  const runs = []
  const stateOf = (stratum, method) => {
    const chain = chains.get(stratum)
    if (!chain) throw new RefusalError(`no chain for stratum ${stratum}`)
    const st = stratumState(stratum, chain, params)
    const m = st.methods.find(x => x.method === method)
    if (!m) throw new RefusalError(`stratum ${stratum} has no method ${method} in its chain`)
    return m
  }
  const addClean = (stratum, method, k, key) => { const c = chains.get(stratum).find(x => x.method === method); c.units.push({ key, items: Array.from({ length: k }, () => ({ miss: false })) }) }
  const bump = stratum => { const sec = sectionOf(stratum); const d = depthNow.get(sec); if (d != null && d < params.floor) depthNow.set(sec, d + 1) }
  while (left.length) {
    // owner priority first (cofounder-queue.json `prioritySections`, in listed order), then floor first: the
    // lowest-depth section under the floor, earliest queue entry within it; else queue order. Priority is an
    // explicit owner override of the floor ORDER only; it never changes a depth or a run's shape.
    let pick = 0, best = Infinity
    for (const [i, b] of left.entries()) {
      const pi = prioritySections.indexOf(sectionOf(b.stratum))
      const r = pi >= 0 ? -1e6 + pi : floorRank(depthNow.get(sectionOf(b.stratum)) ?? null, params)
      if (r < best) { best = r; pick = i }
    }
    const b = left.splice(pick, 1)[0]
    if (b.drawn) {
      if (b.old.items > 0) { runs.push({ stratum: b.stratum, shape: 'old-rule', batches: [{ cohort: b.cohort, items: b.old.items }], items: b.old.items, note: `already drawn: ${b.old.runs} more run(s) under its own rule` }); addClean(b.stratum, b.method, b.old.items, `${b.cohort}:old`); bump(b.stratum) }
      continue
    }
    const m = stateOf(b.stratum, b.method)
    const shape = shapeFor(m)
    if (shape === 'pooled') {
      const pool = [b]
      for (let i = 0; i < left.length && pool.length < params.pooledMaxBatches; ) {
        const o = left[i]
        if (!o.drawn && o.stratum === b.stratum && o.method === b.method) { pool.push(o); left.splice(i, 1) } else i++
      }
      const q = pooledQuotas(pool.length, params).map((n, i) => Math.min(n, pool[i].waiting))
      const items = q.reduce((a, n) => a + n, 0)
      runs.push({ stratum: b.stratum, shape, level: m.level, bridge: m.bridge, batches: pool.map((p, i) => ({ cohort: p.cohort, items: q[i] })), items })
      addClean(b.stratum, b.method, items, `${b.cohort}:pooled`)
      for (const p of pool) bump(p.stratum)
      continue
    }
    let items, groups = []
    if (b.groups.length) { const g = pickGroups(b.groups, shape === 'full' ? 'full' : 'spot', params); items = g.items; groups = g.groups }
    else items = Math.min(shape === 'full' ? params.l0Cap : params.spotSize, b.waiting)
    runs.push({ stratum: b.stratum, shape, level: m.level, bridge: m.bridge, batches: [{ cohort: b.cohort, items, groups }], items })
    addClean(b.stratum, b.method, items, `${b.cohort}:${shape}`)
    bump(b.stratum)
  }
  return { runs, total: runs.reduce((a, r) => a + r.items, 0) }
}
