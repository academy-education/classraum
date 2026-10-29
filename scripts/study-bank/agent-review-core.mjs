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
 * Drop rules (prereg §3): any grader's non-unique verdict drops the item; a dropped
 * item takes its whole passage group; a batch pattern named by >= 2 graders on >= 3
 * shared items holds the whole cohort for re-authoring.
 */
import { createHash } from 'node:crypto'
import { rng, shuffleWith } from './seeded-shuffle.mjs'

export const GRADERS = ['a', 'b', 'c']
export const VERDICTS = new Set(['unique', 'alternative', 'broken', 'hold'])
export const PATTERN_MIN_SHARED = 3

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

/** Two graders name the same tell: >= 3 shared items, and the same named type (or either is a custom name). */
export function samePattern(p, q) {
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
      if (samePattern(p, q)) confirmed.push({ graders: [GRADERS[i], GRADERS[j]], pattern: p.pattern, other: q.pattern, items: p.items.filter(x => q.items.includes(x)) })
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
    const badGroups = new Set(c.rows.filter(r => c.dropped.has(r.id) && !r.group.startsWith('item:')).map(r => r.group))
    const dropped = {}
    for (const r of c.rows) {
      if (c.dropped.has(r.id)) dropped[r.id] = c.dropped.get(r.id)
      else if (badGroups.has(r.group)) dropped[r.id] = `passage: ${r.group} lost an item`
    }
    const hold = c.patterns.length > 0
    const cleared = hold ? [] : c.rows.map(r => r.id).filter(id => !dropped[id]).sort()
    out[cohort] = { total: c.rows.length, cleared, dropped, hold, patterns: c.patterns }
  }
  return out
}
