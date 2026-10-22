#!/usr/bin/env node
/**
 * sec23-template-cover.mjs --kept <kept.json> [--sha <sha256 file>] [--phase2 d2.json,e2.json,f2.json]
 *                          [--out <held.json>] <grader-d.json> <grader-e.json> <grader-f.json>
 *
 * COPIED from sec22-template-cover.mjs (v22) with ids and paths changed to v23 and nothing
 * else: the rule is unchanged (PREREG-SEC23 "Bars"). Replay-tested on v22 data.
 *
 * The template-pair hold of PREREG-SEC23-2026-10-23.md ("Template pair, minimum
 * cover with a fixed tie-break"), committed with the freeze and run after
 * gate-verdict.mjs. It replaces v17's "lower difficulty, higher id" rule.
 *
 * INPUT SHAPES
 *   grader files  EXACTLY three, the PHASE-1 SNAPSHOTS (the files whose sha256 is
 *                 in sec23.ws-phase1.sha256). Each is a JSON object with
 *                   - near_duplicates at `summary.near_duplicates` (v17 shape) or
 *                     top level `near_duplicates`. REQUIRED: a file without the
 *                     field is refused (exit 2). An empty array is a valid "none".
 *                     Each entry names ONE template group, as either
 *                       an array of strings: the strings that are batch ids form
 *                         the group, any string containing a space is a
 *                         description and ignored ("[id, id, 'why']", v17 grader d);
 *                       or an object with an `ids`, `items` or `pair` array.
 *                     A group of k ids contributes all k(k-1)/2 unordered pairs.
 *                     A group with fewer than 2 distinct ids, or an id-like string
 *                     (no spaces) that is not a batch id, is refused: a pair the
 *                     script cannot read is not silently dropped.
 *                   - per-item rows with `difficulty` in {easy, medium, hard}, at
 *                     `.items` (object keyed by id, or array of rows with `id`),
 *                     the same shapes gate-verdict.mjs reads. The three files must
 *                     cover the same ids. PANEL difficulty = the median of the
 *                     three graders' `difficulty` (prereg "Difficulty").
 *   --kept        JSON array of ids (or {"kept": [...]}) that are otherwise KEPT:
 *                 survived rules 1-7, recommend_drop, off-blueprint, the near-dup
 *                 hold and the easy drop. Required. Every id must be a batch id,
 *                 and none may be panel-easy (an easy item is dropped, so a kept
 *                 list containing one is inconsistent and refused).
 *   --sha         optional: a sha256sum-style file; each grader file's sha256
 *                 must appear in it, else refused. Use sec23.ws-phase1.sha256.
 *   --phase2      optional: the three phase-2 files. Pairs majority-named there
 *                 but not in phase 1 are printed as RECORDED ONLY; they never
 *                 become edges.
 *   --out         optional: write the held ids as a JSON array.
 *   --no-key1     BREAK-TEST ONLY: drops key 1 to show it is the key doing the
 *                 work. Never use on a real run; the output says so.
 *
 * THE RULE (prereg, verbatim in effect)
 *   Edge: an unordered pair named by 2+ of the 3 graders in the phase-1
 *   snapshot, with BOTH items otherwise kept (an edge to a non-shipping item is
 *   ignored and printed). A pair named by one grader is recorded only.
 *   Hold set H: a vertex cover of the edge graph, chosen among ALL covers by
 *     1. fewest panel-hard items in H;
 *     2. fewest items in H;
 *     3. listing each cover's items in the FIXED ORDER (sha256 of the id string,
 *        ascending hex) and taking the lexicographically first list, i.e. hold
 *        the item that comes earliest in that order.
 *   Computed per connected component by exhaustive enumeration; a component of
 *   more than 20 items is refused (exit 2), never approximated. Keys 1-2 are
 *   sums over components and key 3 composes too (ids are disjoint across
 *   components, so the merged list of per-component lexicographic minima is the
 *   global lexicographic minimum), so the per-component answer IS the global one.
 *   A greedy max-degree cover is printed per component as a DIAGNOSTIC ONLY.
 *
 * EXIT 0 computed; 2 refused (missing/unreadable input, wrong number of grader
 * files, no near_duplicates field, unreadable group, id mismatch, sha mismatch,
 * component > 20).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const args = process.argv.slice(2)
const opt = {}; const files = []
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--no-key1') opt.noKey1 = true
  else if (['--kept', '--sha', '--phase2', '--out'].includes(a)) { const v = args[++i]; if (!v) die(`${a} needs a value`); opt[a.slice(2)] = v }
  else if (a.startsWith('--')) die(`unknown flag ${a}`)
  else files.push(a)
}
if (files.length !== 3) die(`need exactly three grader files (phase-1 snapshots), got ${files.length}. A partial panel is not a panel.`)
if (!opt.kept) die('--kept <kept.json> is required: edges count only between otherwise-kept items')
const raw = f => { try { return readFileSync(f) } catch (e) { die(`cannot read ${f}: ${e.message}`) } }
const json = f => { try { return JSON.parse(raw(f).toString('utf8')) } catch (e) { die(`cannot parse ${f}: ${e.message}`) } }
const sha = s => createHash('sha256').update(s).digest('hex')

if (opt.sha) {
  const known = new Set(raw(opt.sha).toString('utf8').split('\n').map(l => l.trim().split(/\s+/)[0]).filter(h => /^[0-9a-f]{64}$/.test(h)))
  if (!known.size) die(`${opt.sha} lists no sha256 values`)
  for (const f of files) { const h = sha(raw(f)); if (!known.has(h)) die(`${f} sha256 ${h.slice(0, 12)}... is not in ${opt.sha}: not the phase-1 snapshot`) }
  console.log(`sha: all three grader files match ${opt.sha}`)
}

function rowsOf(g, f) {
  if (g && g.items && typeof g.items === 'object' && !Array.isArray(g.items)) return g.items
  if (g && Array.isArray(g.items) && g.items.every(r => r && r.id)) return Object.fromEntries(g.items.map(r => [r.id, r]))
  die(`${f}: no per-item rows at .items (object keyed by id, or array of rows with id)`)
}
function groupsOf(g, f, ids) {
  const nd = g?.summary && 'near_duplicates' in g.summary ? g.summary.near_duplicates : 'near_duplicates' in (g ?? {}) ? g.near_duplicates : undefined
  if (nd === undefined) die(`${f}: no near_duplicates field (summary.near_duplicates or top level)`)
  if (!Array.isArray(nd)) die(`${f}: near_duplicates is not an array`)
  return nd.map((e, i) => {
    const list = Array.isArray(e) ? e : e && typeof e === 'object' ? (e.ids ?? e.items ?? e.pair) : null
    if (!Array.isArray(list)) die(`${f}: near_duplicates[${i}] is neither an array nor an object with ids/items/pair`)
    const got = []
    for (const s of list) {
      if (typeof s !== 'string') die(`${f}: near_duplicates[${i}] has a non-string element ${JSON.stringify(s)}`)
      if (ids.has(s)) { if (!got.includes(s)) got.push(s) }
      else if (!/\s/.test(s.trim())) die(`${f}: near_duplicates[${i}] names "${s}", which is not a batch id`)
    }
    if (got.length < 2) die(`${f}: near_duplicates[${i}] names ${got.length} batch id(s); a template group needs 2+`)
    return got
  })
}

const G = files.map(f => ({ f, g: json(f) }))
const R = G.map(({ f, g }) => rowsOf(g, f))
const ids = Object.keys(R[0]).sort()
R.forEach((r, i) => { const k = Object.keys(r).sort(); if (k.length !== ids.length || k.some((x, j) => x !== ids[j])) die(`${files[i]} covers ${k.length} ids, not the same ${ids.length} as ${files[0]}`) })
if (!ids.length) die('grader files have no item rows')
const idSet = new Set(ids)
const ORD = { easy: 0, medium: 1, hard: 2 }
const panel = {}
for (const id of ids) {
  const v = R.map((r, i) => { const d = r[id]?.difficulty; if (!(d in ORD)) die(`${files[i]}: ${id} difficulty ${JSON.stringify(d)} is not easy/medium/hard`); return ORD[d] }).sort((a, b) => a - b)
  panel[id] = ['easy', 'medium', 'hard'][v[1]]
}
let kept = json(opt.kept); if (kept && !Array.isArray(kept)) kept = kept.kept
if (!Array.isArray(kept) || !kept.length) die(`${opt.kept}: kept must be a non-empty array of ids (or {"kept": [...]})`)
for (const id of kept) { if (!idSet.has(id)) die(`kept id ${id} is not in the grader files`); if (panel[id] === 'easy') die(`kept id ${id} is panel-easy, which the prereg drops: the kept list is inconsistent`) }
const keptSet = new Set(kept)

const pairKey = (a, b) => [a, b].sort().join(' ~ ')
function namedPairs(groups) { const s = new Set(); for (const gr of groups) for (let i = 0; i < gr.length; i++) for (let j = i + 1; j < gr.length; j++) s.add(pairKey(gr[i], gr[j])); return s }
const P1 = G.map(({ f, g }) => namedPairs(groupsOf(g, f, idSet)))
const count = new Map()
P1.forEach((s, gi) => s.forEach(p => count.set(p, (count.get(p) ?? []).concat('def'[gi] ?? String(gi)))))

console.log(`${ids.length} items in the grader files; ${kept.length} otherwise kept; graders ${files.map((f, i) => `${'def'[i]}=${f.replace(/^.*\//, '')} (${P1[i].size} pair(s))`).join(', ')}`)
console.log(`panel difficulty (median of 3): ${Object.entries(Object.groupBy ? Object.groupBy(ids, id => panel[id]) : ids.reduce((a, id) => ((a[panel[id]] ??= []).push(id), a), {})).map(([d, l]) => `${d} ${l.length}`).join(', ')}`)

const edges = [], ignored = [], single = []
for (const [p, gs] of [...count.entries()].sort()) {
  const [a, b] = p.split(' ~ ')
  if (gs.length < 2) { single.push(`${p} (${gs.join('')})`); continue }
  if (!keptSet.has(a) || !keptSet.has(b)) { ignored.push(`${p} (${gs.join('')}; not kept: ${[a, b].filter(x => !keptSet.has(x)).join(', ')})`); continue }
  edges.push([a, b, gs])
}
console.log(`\nEDGES (named by 2+ of 3 in phase 1, both kept): ${edges.length}`)
for (const [a, b, gs] of edges) console.log(`  ${a} [${panel[a]}] ~ ${b} [${panel[b]}]   named by ${gs.join(',')}`)
console.log(`ignored majority pairs (an endpoint not kept): ${ignored.length}${ignored.length ? '\n  ' + ignored.join('\n  ') : ''}`)
console.log(`single-grader pairs (recorded only): ${single.length}${single.length ? '\n  ' + single.join('\n  ') : ''}`)

if (opt.phase2) {
  const f2 = opt.phase2.split(',').filter(Boolean)
  if (f2.length !== 3) die('--phase2 needs exactly three files')
  const P2 = f2.map(f => namedPairs(groupsOf(json(f), f, idSet)))
  const c2 = new Map(); P2.forEach(s => s.forEach(p => c2.set(p, (c2.get(p) ?? 0) + 1)))
  const fresh = [...c2.entries()].filter(([p, c]) => c >= 2 && (count.get(p)?.length ?? 0) < 2).map(([p, c]) => `${p} (${c} of 3 in phase 2)`)
  console.log(`pairs reaching a majority only in phase 2 (recorded only, not edges): ${fresh.length}${fresh.length ? '\n  ' + fresh.join('\n  ') : ''}`)
}

// fixed order
const hash = Object.fromEntries(ids.map(id => [id, sha(id)]))
const byOrder = (a, b) => (hash[a] < hash[b] ? -1 : hash[a] > hash[b] ? 1 : 0)
const order = ids.slice().sort(byOrder)
console.log(`\nFIXED ORDER (sha256 of id, ascending): ${order.map((id, i) => `${i + 1} ${id}`).join('  ')}`)

// components
const adj = new Map(); for (const [a, b] of edges) { (adj.get(a) ?? adj.set(a, new Set()).get(a)).add(b); (adj.get(b) ?? adj.set(b, new Set()).get(b)).add(a) }
const seen = new Set(), comps = []
for (const v of [...adj.keys()].sort(byOrder)) {
  if (seen.has(v)) continue
  const c = [], st = [v]; seen.add(v)
  while (st.length) { const x = st.pop(); c.push(x); for (const y of adj.get(x)) if (!seen.has(y)) { seen.add(y); st.push(y) } }
  comps.push(c.sort(byOrder))
}
for (const c of comps) if (c.length > 20) die(`component of ${c.length} items (${c.join(' ')}) exceeds 20; refusing rather than approximating`)

const isHard = id => panel[id] === 'hard'
function better(x, y) { // x, y: {hard, size, list(sorted by order)}; true if x precedes y
  if (!opt.noKey1 && x.hard !== y.hard) return x.hard < y.hard
  if (x.size !== y.size) return x.size < y.size
  for (let i = 0; i < x.list.length; i++) { const d = byOrder(x.list[i], y.list[i]); if (d) return d < 0 }
  return false
}
if (opt.noKey1) console.log('\n*** BREAK-TEST MODE: key 1 (fewest hard) DISABLED. This output is not the prereg rule. ***')
const held = []
console.log(`\nCOMPONENTS: ${comps.length}`)
for (const c of comps) {
  const E = edges.filter(([a]) => c.includes(a)).map(([a, b]) => [c.indexOf(a), c.indexOf(b)])
  let best = null, nBest = 0, nCovers = 0
  for (let m = 1; m < 1 << c.length; m++) {
    if (!E.every(([i, j]) => (m >> i & 1) || (m >> j & 1))) continue
    nCovers++
    const list = c.filter((_, i) => m >> i & 1)
    const cand = { hard: list.filter(isHard).length, size: list.length, list }
    if (!best || better(cand, best)) { best = cand; nBest = 1 }
    else if (!better(best, cand)) nBest++
  }
  // how many covers tie with best on keys 1-2 (i.e. how often key 3 decided)
  let tie12 = 0
  for (let m = 1; m < 1 << c.length; m++) {
    if (!E.every(([i, j]) => (m >> i & 1) || (m >> j & 1))) continue
    const list = c.filter((_, i) => m >> i & 1)
    if ((opt.noKey1 || list.filter(isHard).length === best.hard) && list.length === best.size) tie12++
  }
  // greedy diagnostic: repeatedly take the max-degree vertex (ties: fixed order)
  const rem = edges.filter(([a]) => c.includes(a)).map(([a, b]) => [a, b]); const greedy = []
  while (rem.length) {
    const deg = {}; for (const [a, b] of rem) { deg[a] = (deg[a] ?? 0) + 1; deg[b] = (deg[b] ?? 0) + 1 }
    const v = Object.keys(deg).sort((x, y) => deg[y] - deg[x] || byOrder(x, y))[0]
    greedy.push(v); for (let i = rem.length - 1; i >= 0; i--) if (rem[i].includes(v)) rem.splice(i, 1)
  }
  greedy.sort(byOrder)
  const gHard = greedy.filter(isHard).length
  const same = greedy.length === best.list.length && greedy.every((x, i) => x === best.list[i])
  console.log(`  component {${c.map(x => `${x}[${panel[x][0]}]`).join(', ')}}: ${E.length} edge(s), ${nCovers} covers enumerated`)
  console.log(`    HOLD {${best.list.join(', ')}}  hard ${best.hard}, size ${best.size}; ${tie12} cover(s) tie on keys 1-2${tie12 > 1 ? ' -> key 3 (fixed order) decided' : ''}`)
  console.log(`    greedy max-degree (diagnostic only): {${greedy.join(', ')}} hard ${gHard}, size ${greedy.length}${same ? ' (same)' : ' (DIFFERS from the exhaustive cover)'}`)
  held.push(...best.list)
}
held.sort(byOrder)
const hh = held.filter(isHard)
console.log(`\nHELD ${held.length} item(s), ${hh.length} panel-hard: ${held.map(id => `${id}[${panel[id]}]`).join(' ') || 'none'}`)
console.log(`kept and not held: ${kept.length - held.length} (panel-hard ${kept.filter(id => isHard(id) && !held.includes(id)).length})`)
console.log(`HELD_JSON ${JSON.stringify(held)}`)
if (opt.out) { writeFileSync(opt.out, JSON.stringify(held, null, 1) + '\n'); console.log(`wrote ${opt.out}`) }
