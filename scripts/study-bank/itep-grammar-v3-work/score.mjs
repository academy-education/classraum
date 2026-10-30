#!/usr/bin/env node
/**
 * score.mjs — scores the iTEP SLATE Grammar v3 gate under ITEP-SLATE-GRAMMAR-V3.prereg.md §3: the v2 scorer
 * unchanged in its rules (v1 rules per packet, 3 packets x 3 graders). Changes are plumbing only: keys live in
 * <root>/keys/ (not in the graders' packet folder) and each cold file's sha256 was recorded by the grader's own
 * --keyed call in results/coldsha/.
 *
 *   node scripts/study-bank/itep-grammar-v3-work/score.mjs [--root scratchpad/itep-grammar-v3] [--out <file>]
 *
 * Rules per packet: (1) cold drop: any cold pick != key or non-empty also_correct; (2) keyed drop: any
 * non-unique verdict; (3) a pattern named by two graders of the packet on >= 3 shared items drops those items,
 * and holds the packet when the union reaches 50% of it; (4) letter/position patterns count on Part 2 items only.
 * Exits 2, writing nothing, if any of the 18 grader files is missing/malformed, a cold file changed after its packet's
 * keyed file was built, or coverage is short.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateGrades, isPositionOnly, PATTERN_MIN_SHARED, HOLD_SHARE, GRADERS } from '../agent-review-core.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '../../..')
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d }
const PROOT = resolve(ROOT, arg('--root', 'scratchpad/itep-grammar-v3'))
const OUT = resolve(ROOT, arg('--out', join(HERE, 'results/itep-grammar-v3.score.json')))
const die = m => { console.error(`score: ${m}`); process.exit(2) }
const read = (p, label) => { if (!existsSync(p)) die(`${label}: missing (${p})`); try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { die(`${label}: not valid JSON (${e.message})`) } }
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex')
const KNOWN = new Set(['key_position', 'key_form', 'identical_key_prose', 'one_template', 'reused_option_set'])
const P1 = 'Part 1: Sentence Completion', P2 = 'Part 2: Error Identification'

const manifest = read(join(HERE, 'MANIFEST.json'), 'manifest')
if (!Array.isArray(manifest.packets) || manifest.packets.reduce((a, b) => a + b, 0) !== manifest.items) die('manifest packet sizes do not sum to items')

const dropped = {}, packetsOut = [], allIds = []
const add = (id, why) => { (dropped[id] ??= []).push(why) }
const den = { cold_picks: 0, cold_miss: 0, cold_also_correct: 0, keyed_verdicts: 0, keyed_non_unique: 0 }
let held = 0
manifest.packets.forEach((size, pi) => {
  const name = `packet${pi + 1}`, DIR = join(PROOT, name)
  const index = read(join(PROOT, 'keys', `${name}.index.json`), `${name} index`)
  const cold = read(join(DIR, 'packet-cold.json'), `${name} cold packet`)
  if (index.length !== size || cold.length !== size) die(`${name}: index ${index.length} / cold ${cold.length} / manifest ${size} disagree`)
  const part2 = new Set(index.filter(r => r.part === P2).map(r => r.n))
  const colds = {}, grades = {}
  for (const k of GRADERS) {
    const p = join(DIR, `cold-${k}.json`)
    colds[k] = read(p, `${name} cold-${k}`)
    const sf = join(HERE, 'results/coldsha', `${name}-${k}.sha256`)
    const rec = existsSync(sf) ? readFileSync(sf, 'utf8').trim() : null
    if (!rec) die(`${name}: no recorded sha256 for cold-${k} (keyed packet never built?)`)
    if (sha(p) !== rec) die(`${name}: cold-${k}.json changed after the keyed packet was built`)
    for (let n = 1; n <= size; n++) {
      const c = colds[k][String(n)]
      if (!c || typeof c.pick !== 'string' || !Array.isArray(c.also_correct)) die(`${name} cold-${k} item ${n} malformed`)
      if (!cold[n - 1].choices.includes(c.pick)) die(`${name} cold-${k} item ${n} pick ${JSON.stringify(c.pick)} is not one of its choices`)
    }
    grades[k] = read(join(DIR, `grades-${k}.json`), `${name} grades-${k}`)
    try { validateGrades(grades[k], size, `${name} grades-${k}`) } catch (e) { die(e.message) }
  }
  for (const r of index) {
    allIds.push(r)
    for (const k of GRADERS) {
      const c = colds[k][String(r.n)]
      den.cold_picks++
      if (c.pick !== r.key) { den.cold_miss++; add(r.id, `cold ${k}: picked ${JSON.stringify(c.pick)}`) }
      if (c.also_correct.length) { den.cold_also_correct++; add(r.id, `cold ${k}: also_correct ${JSON.stringify(c.also_correct)}`) }
      const g = grades[k][String(r.n)]
      den.keyed_verdicts++
      if (g.verdict !== 'unique') { den.keyed_non_unique++; add(r.id, `keyed ${k}: ${g.verdict}/${g.defect_type}: ${g.reason || ''}`.trim()) }
    }
  }
  const confirmed = []
  for (let i = 0; i < GRADERS.length; i++) for (let j = i + 1; j < GRADERS.length; j++) {
    for (const p of grades[GRADERS[i]].batch_patterns) for (const q of grades[GRADERS[j]].batch_patterns) {
      const pos = isPositionOnly(p.pattern) || isPositionOnly(q.pattern)
      let shared = p.items.map(Number).filter(x => q.items.map(Number).includes(x))
      if (pos) {
        if (!(isPositionOnly(p.pattern) && isPositionOnly(q.pattern))) continue
        shared = shared.filter(n => part2.has(n))
      } else {
        const a = p.pattern.toLowerCase(), b = q.pattern.toLowerCase()
        if (!(a === b || !KNOWN.has(a) || !KNOWN.has(b))) continue
      }
      if (shared.length < PATTERN_MIN_SHARED) continue
      confirmed.push({ graders: [GRADERS[i], GRADERS[j]], pattern: p.pattern, other: q.pattern, items: shared, ids: shared.map(n => index[n - 1].id) })
    }
  }
  const patternIds = new Set(confirmed.flatMap(c => c.ids))
  const hold = confirmed.length > 0 && patternIds.size >= HOLD_SHARE * size
  if (hold) { held++; for (const r of index) add(r.id, `${name} HELD (pattern union ${patternIds.size}/${size})`) }
  else for (const id of patternIds) add(id, `pattern: ${confirmed.filter(c => c.ids.includes(id)).map(c => c.pattern).join(', ')}`)
  packetsOut.push({ packet: name, size, hold, patterns: confirmed, all_batch_patterns: Object.fromEntries(GRADERS.map(k => [k, grades[k].batch_patterns])) })
})

const N = allIds.length
if (N !== manifest.items) die(`covered ${N} items, manifest says ${manifest.items}`)
const cleared = allIds.map(r => r.id).filter(id => !dropped[id]).sort()
const partOf = Object.fromEntries(allIds.map(r => [r.id, r.part]))
const byPart = p => ({ total: allIds.filter(r => r.part === p).length, cleared: cleared.filter(id => partOf[id] === p).length })
const band = held >= 2 || cleared.length < 0.5 * N ? 'broken (cut the brief before authoring more)' : cleared.length < 0.75 * N ? 'scale with pending lessons queued' : 'brief works'
const res = { cohort: 'itep-grammar-v3', total: N, graders_per_packet: GRADERS.length, packets_held: held, denominators: den, cleared, dropped, by_part: { [P1]: byPart(P1), [P2]: byPart(P2) }, band, packets: packetsOut }
writeFileSync(OUT, JSON.stringify(res, null, 1) + '\n')
console.log(`scored ${N} items in ${manifest.packets.length} packets x ${GRADERS.length} graders | cold picks ${den.cold_picks}: ${den.cold_miss} off key, ${den.cold_also_correct} with also_correct | keyed ${den.keyed_verdicts}: ${den.keyed_non_unique} non-unique | packets held ${held}`)
for (const p of packetsOut) console.log(`  ${p.packet}: ${p.patterns.length} counted pattern(s)${p.hold ? ' -> HELD' : ''}${p.patterns.map(c => ` [${c.pattern}/${c.other} ${c.graders.join('+')}: ${c.ids.join(',')}]`).join('')}`)
console.log(`cleared ${cleared.length}/${N} | Part 1 ${res.by_part[P1].cleared}/${res.by_part[P1].total} | Part 2 ${res.by_part[P2].cleared}/${res.by_part[P2].total} | band: ${band}`)
for (const [id, why] of Object.entries(dropped).sort()) console.log(`  DROP ${id}: ${why.join(' | ')}`)
console.log(`wrote ${OUT}`)
