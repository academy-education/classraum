/**
 * agent-review-core.mjs — the PURE half of the SSAT/MAP agent-review gate
 * (AGENT-REVIEW-SSAT-MAP.prereg.md). No DB client and no file reads, so every
 * rule is pinned by src/lib/study/__tests__/agent-review-score.test.ts.
 *
 *   planPackets   cohort rows -> packets (whole passages, <= maxItems, <= maxGroups)
 *   dealPacket    one packet -> shuffled packet.json + index.json (seeded, unbiased)
 *   validateGrades  a grader file -> throws on anything malformed or incomplete
 *   scorePacket   index + the three graders -> per-item drops, confirmed patterns
 *   scoreCohorts  every packet's score -> per-cohort cleared / dropped / hold
 *
 * Drop rules (prereg §3 + Amendment A1): any grader's non-unique verdict drops the
 * item; a dropped item takes its whole passage group; a batch pattern named by >= 2
 * graders on >= 3 shared items counts. Answer-letter patterns never count (A1.1: the
 * packet's letters are our own deal and the app reshuffles per student). The union of
 * every counted pattern's items holds the cohort when it covers >= 50% of the cohort's
 * items; below that, only those items (and their passages) drop (A1.2).
 */
import { joinLedger, isMiss } from './autonomy-core.mjs'
import { createHash } from 'node:crypto'
import { rng, shuffleWith } from './seeded-shuffle.mjs'

export const GRADERS = ['a', 'b', 'c']
export const VERDICTS = new Set(['unique', 'alternative', 'broken', 'hold'])
export const PATTERN_MIN_SHARED = 3
/** A1.2: a cohort is held when counted patterns name at least this share of its items. */
export const HOLD_SHARE = 0.5

export class ReviewError extends Error {}

/** A passage group id, or the item's own id for a standalone item. */
export const unitOf = r => r.passage_group_id || `item:${r.id}`

/** Split each cohort into packets of whole units, as evenly as the limits allow. */
export function planPackets(rows, { maxItems = 55, maxGroups = 10 } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) throw new ReviewError('planPackets: no rows')
  const byCohort = new Map()
  for (const r of rows) {
    if (!r.id || !r.cohort) throw new ReviewError(`planPackets: row without id/cohort: ${JSON.stringify(r).slice(0, 120)}`)
    if (!byCohort.has(r.cohort)) byCohort.set(r.cohort, new Map())
    const units = byCohort.get(r.cohort)
    const u = unitOf(r)
    if (!units.has(u)) units.set(u, [])
    units.get(u).push(r)
  }
  const packets = []
  for (const [cohort, units] of [...byCohort].sort(([a], [b]) => a.localeCompare(b))) {
    const list = [...units].sort(([a], [b]) => a.localeCompare(b)).map(([id, items]) => ({ id, items: items.sort((x, y) => x.id.localeCompare(y.id)) }))
    const total = list.reduce((s, u) => s + u.items.length, 0)
    const grouped = list.filter(u => !u.id.startsWith('item:')).length
    const n = Math.max(1, Math.ceil(total / maxItems), grouped ? Math.ceil(grouped / maxGroups) : 1)
    const target = Math.ceil(total / n)
    let cur = []
    let curItems = 0
    const flush = () => { if (cur.length) packets.push({ cohort, units: cur }); cur = []; curItems = 0 }
    for (const u of list) {
      if (cur.length && (curItems + u.items.length > target || curItems + u.items.length > maxItems)) flush()
      cur.push(u)
      curItems += u.items.length
    }
    flush()
  }
  return packets.map((p, i, all) => {
    const k = all.slice(0, i).filter(q => q.cohort === p.cohort).length + 1
    return { ...p, id: `${p.cohort}--p${k}`, items: p.units.reduce((s, u) => s + u.items.length, 0), groups: p.units.filter(u => !u.id.startsWith('item:')).length }
  })
}

export const seedOf = s => parseInt(createHash('sha256').update(s).digest('hex').slice(0, 8), 16)

/** Deal one packet: unit order and choice order shuffled (seeded), a passage's items stay together. */
export function dealPacket(packet) {
  const rand = rng(seedOf(`agent-review:${packet.id}`))
  const units = shuffleWith([...packet.units], rand)
  const items = []
  const index = []
  for (const u of units) {
    for (const r of u.items) {
      const it = r.item || {}
      if (!it.prompt || !Array.isArray(it.choices) || it.choices.length < 2 || it.correct_answer == null) {
        throw new ReviewError(`dealPacket: ${r.id} lacks prompt/choices/correct_answer`)
      }
      if (!it.choices.includes(it.correct_answer)) throw new ReviewError(`dealPacket: ${r.id} correct_answer is not one of its choices`)
      const n = items.length + 1
      items.push({
        n, family: r.family, section: r.section,
        ...(it.passage ? { passage: it.passage } : {}),
        ...(it.graphic ? { graphic: it.graphic } : {}),
        prompt: it.prompt,
        choices: shuffleWith([...it.choices], rand),
        correct_answer: it.correct_answer,
      })
      index.push({ n, id: r.id, cohort: r.cohort, group: unitOf(r) })
    }
  }
  return { items, index }
}

/** Throw unless `g` is a complete grader file for a packet of `nItems` items. */
export function validateGrades(g, nItems, label = 'grades') {
  if (!g || typeof g !== 'object' || Array.isArray(g)) throw new ReviewError(`${label}: not a JSON object`)
  if (!Array.isArray(g.batch_patterns)) throw new ReviewError(`${label}: batch_patterns missing or not an array`)
  for (let n = 1; n <= nItems; n++) {
    const v = g[String(n)]
    if (!v || typeof v !== 'object') throw new ReviewError(`${label}: item ${n} missing`)
    if (!VERDICTS.has(v.verdict)) throw new ReviewError(`${label}: item ${n} verdict ${JSON.stringify(v.verdict)} is not one of ${[...VERDICTS].join('/')}`)
    if (v.verdict !== 'unique' && !v.defect_type) throw new ReviewError(`${label}: item ${n} is ${v.verdict} without a defect_type`)
  }
  const extra = Object.keys(g).filter(k => k !== 'batch_patterns' && !(Number(k) >= 1 && Number(k) <= nItems))
  if (extra.length) throw new ReviewError(`${label}: unexpected keys ${extra.slice(0, 5).join(', ')}`)
  for (const p of g.batch_patterns) {
    if (!p || typeof p.pattern !== 'string' || !Array.isArray(p.items)) throw new ReviewError(`${label}: malformed batch_pattern ${JSON.stringify(p).slice(0, 120)}`)
  }
  return true
}

const KNOWN = new Set(['key_position', 'key_form', 'identical_key_prose', 'one_template', 'reused_option_set'])

/** A1.1: patterns about answer-letter position cannot reach a student (choices are reshuffled per student). */
export const isPositionOnly = name => /position|letter/i.test(String(name))

/** Two graders name the same tell: >= 3 shared items, and the same named type (or either is a custom name).
 *  Answer-letter patterns never match anything (A1.1). */
export function samePattern(p, q) {
  if (isPositionOnly(p.pattern) || isPositionOnly(q.pattern)) return false
  const shared = p.items.filter(x => q.items.includes(x)).length
  if (shared < PATTERN_MIN_SHARED) return false
  const a = p.pattern.toLowerCase(), b = q.pattern.toLowerCase()
  return a === b || !KNOWN.has(a) || !KNOWN.has(b)
}

/** Score one packet. `grades` maps grader -> validated grader file. */
export function scorePacket(index, grades) {
  const missing = GRADERS.filter(k => !grades[k])
  if (missing.length) throw new ReviewError(`scorePacket: missing grader file(s) ${missing.join(', ')}`)
  for (const k of GRADERS) validateGrades(grades[k], index.length, `grader ${k}`)
  const dropped = new Map()
  for (const row of index) {
    const why = GRADERS.filter(k => grades[k][String(row.n)].verdict !== 'unique').map(k => {
      const v = grades[k][String(row.n)]
      return `${k}:${v.verdict}/${v.defect_type}`
    })
    if (why.length) dropped.set(row.id, `item: ${why.join(', ')}`)
  }
  const confirmed = []
  for (let i = 0; i < GRADERS.length; i++) for (let j = i + 1; j < GRADERS.length; j++) {
    for (const p of grades[GRADERS[i]].batch_patterns) for (const q of grades[GRADERS[j]].batch_patterns) {
      if (samePattern(p, q)) {
        const items = p.items.filter(x => q.items.includes(x))
        const ids = items.map(n => index.find(r => r.n === Number(n))?.id).filter(Boolean)
        confirmed.push({ graders: [GRADERS[i], GRADERS[j]], pattern: p.pattern, other: q.pattern, items, ids })
      }
    }
  }
  return { dropped, confirmed }
}

/** Aggregate packet scores into per-cohort results. `packets`: [{index, score}]. */
export function scoreCohorts(packets) {
  const cohorts = new Map()
  for (const { index, score } of packets) {
    for (const row of index) {
      if (!cohorts.has(row.cohort)) cohorts.set(row.cohort, { rows: [], dropped: new Map(), patterns: [] })
      const c = cohorts.get(row.cohort)
      c.rows.push(row)
      if (score.dropped.has(row.id)) c.dropped.set(row.id, score.dropped.get(row.id))
    }
    if (score.confirmed.length && index.length) cohorts.get(index[0].cohort).patterns.push(...score.confirmed)
  }
  const out = {}
  for (const [cohort, c] of cohorts) {
    // A1.2: the union of counted patterns' items. Cohort-wide (>= HOLD_SHARE) holds; a subset drops.
    const patternIds = new Set(c.patterns.flatMap(p => p.ids || []))
    const hold = c.patterns.length > 0 && patternIds.size >= HOLD_SHARE * c.rows.length
    const itemDrop = new Map(c.dropped)
    if (!hold) for (const id of patternIds) if (!itemDrop.has(id)) {
      itemDrop.set(id, `pattern: ${c.patterns.filter(p => (p.ids || []).includes(id)).map(p => p.pattern).join(', ')}`)
    }
    const badGroups = new Set(c.rows.filter(r => itemDrop.has(r.id) && !r.group.startsWith('item:')).map(r => r.group))
    const dropped = {}
    for (const r of c.rows) {
      if (itemDrop.has(r.id)) dropped[r.id] = itemDrop.get(r.id)
      else if (badGroups.has(r.group)) dropped[r.id] = `passage: ${r.group} lost an item`
    }
    const cleared = hold ? [] : c.rows.map(r => r.id).filter(id => !dropped[id]).sort()
    out[cohort] = { total: c.rows.length, cleared, dropped, hold, patternShare: c.rows.length ? patternIds.size / c.rows.length : 0, patterns: c.patterns }
  }
  return out
}

/* ---- Pre-release audit (prereg "Release after A1", owner 2026-10-29): Daniel sits a small sample of the cleared
 * items before anything is released. ---- */
export const AUDIT_CAP = 24

/** Items per cleared cohort, in the owner's order: SSAT Reading (2, one passage), MAP Language (2; 1 when the cohort
 * cleared fewer than 20), then everything else (1). `cohorts`: [{cohort, cleared, family, section}]. */
export function auditPlan(cohorts) {
  const rank = c => c.family === 'ssat' && c.section === 'reading' ? 0 : c.family === 'map' && c.section === 'language' ? 1 : 2
  return cohorts.filter(c => c.cleared > 0)
    .map(c => ({ cohort: c.cohort, cleared: c.cleared, rank: rank(c), n: rank(c) === 2 || (rank(c) === 1 && c.cleared < 20) ? 1 : 2 }))
    .sort((a, b) => a.rank - b.rank || a.cohort.localeCompare(b.cohort))
}

/** Decide release per cohort from the closed audit run. Pure.
 *  sample:  {cohort: [item ids sampled]}      cleared: {cohort: [cleared item ids]}
 *  reviews: the run's rows [{id, item_id, run_id, verdict, note, blind_at, reviewer_kind}]
 *  ledger:  notes-ledger entries (cofounder-notes.json), joined exactly as release-by-shape does (autonomy-core)
 * Throws ReviewError, deciding nothing, while any row is unanswered, on a non-human row, a run row outside the sample,
 * a sampled item with no row, or any ledger problem (an unclassified note included). A cohort releases its cleared
 * items only if no sampled item is a miss (autonomy-core isMiss: a verdict other than unique, or a would_block note);
 * one miss holds the whole cohort. */
export function decideRelease({ sample, cleared, reviews, ledger }) {
  if (!reviews.length) throw new ReviewError('the audit run has no rows')
  const open = reviews.filter(r => r.blind_at == null || r.verdict == null)
  if (open.length) throw new ReviewError(`the audit run is still open (${open.length} of ${reviews.length} rows unanswered)`)
  if (reviews.some(r => r.reviewer_kind !== 'human')) throw new ReviewError('the audit run is not a human sitting')
  const sampledIds = new Set(Object.values(sample).flat())
  const stray = reviews.filter(r => !sampledIds.has(r.item_id))
  if (stray.length) throw new ReviewError(`${stray.length} run rows are not in the audit sample (wrong run?)`)
  const { byReview, errors } = joinLedger(reviews, ledger.filter(e => e.review_id == null ? (e.linked_review_ids ?? []).some(id => reviews.some(r => r.id === id)) : reviews.some(r => r.id === e.review_id)))
  if (errors.length) throw new ReviewError(`${errors.length} ledger problem(s): ${errors.slice(0, 5).join('; ')}`)
  const byItem = new Map(reviews.map(r => [r.item_id, r]))
  const out = {}
  for (const [cohort, ids] of Object.entries(sample)) {
    if (!cleared[cohort]?.length) throw new ReviewError(`${cohort}: sampled but has no cleared items`)
    const defects = []
    for (const id of ids) {
      const r = byItem.get(id)
      if (!r) throw new ReviewError(`${cohort}: sampled item ${id} has no row in the run`)
      if (!cleared[cohort].includes(id)) throw new ReviewError(`${cohort}: sampled item ${id} is not a cleared item`)
      const entries = byReview.get(r.id) ?? []
      if (isMiss(r, entries)) defects.push(`${id}: ${r.verdict !== 'unique' ? `verdict ${r.verdict}` : `would_block note (${entries.find(e => e.would_block)?.defect_type})`}`)
    }
    out[cohort] = { release: !defects.length, defects, ids: cleared[cohort] }
  }
  return out
}
