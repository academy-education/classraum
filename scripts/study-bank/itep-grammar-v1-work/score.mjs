#!/usr/bin/env node
/**
 * score.mjs — scores the iTEP SLATE Grammar v1 gate under ITEP-SLATE-GRAMMAR-V1.prereg.md §3.
 *
 *   node scripts/study-bank/itep-grammar-v1-work/score.mjs [--dir scratchpad/itep-grammar-v1/packet1] [--out <file>]
 *
 * Rules: (1) cold drop: any grader's cold pick != key, or non-empty also_correct; (2) keyed drop: any
 * non-unique verdict; (3) a pattern named by two graders on >= 3 shared items drops those items, and holds
 * the batch when the union reaches 50%; (4) letter/position patterns count only on Part 2 items (Part 1
 * choices are reshuffled at draw time; Part 2 segment order cannot be).
 * Exits 2, writing nothing, on any missing/malformed file, a cold file changed since the keyed packet was
 * built, or incomplete coverage. Uses the agent-review core's grader-file validator.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateGrades, isPositionOnly, PATTERN_MIN_SHARED, HOLD_SHARE, GRADERS } from '../agent-review-core.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '../../..')
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d }
const DIR = resolve(ROOT, arg('--dir', 'scratchpad/itep-grammar-v1/packet1'))
const OUT = resolve(ROOT, arg('--out', join(HERE, 'results/itep-grammar-v1.score.json')))
const die = m => { console.error(`score: ${m}`); process.exit(2) }
const read = (p, label) => { if (!existsSync(p)) die(`${label}: missing (${p})`); try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { die(`${label}: not valid JSON (${e.message})`) } }
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex')
const KNOWN = new Set(['key_position', 'key_form', 'identical_key_prose', 'one_template', 'reused_option_set'])

const manifest = read(join(HERE, 'MANIFEST.json'), 'manifest')
const index = read(join(DIR, 'index.json'), 'index')
const cold = read(join(DIR, 'packet-cold.json'), 'cold packet')
if (!Array.isArray(index) || index.length !== manifest.items || cold.length !== index.length) die(`index ${index?.length} / cold packet ${cold?.length} / manifest ${manifest.items} disagree`)
const N = index.length
const part2 = new Set(index.filter(r => r.part.startsWith('Part 2')).map(r => r.n))

const colds = {}, grades = {}
for (const k of GRADERS) {
  const p = join(DIR, `cold-${k}.json`)
  colds[k] = read(p, `cold-${k}`)
  if (!manifest.cold_sha256?.[k]) die(`manifest has no recorded sha256 for cold-${k} (keyed packet never built?)`)
  if (sha(p) !== manifest.cold_sha256[k]) die(`cold-${k}.json changed after the keyed packet was built`)
  for (let n = 1; n <= N; n++) {
    const c = colds[k][String(n)]
    if (!c || typeof c.pick !== 'string' || !Array.isArray(c.also_correct)) die(`cold-${k} item ${n} malformed`)
    if (!cold[n - 1].choices.includes(c.pick)) die(`cold-${k} item ${n} pick ${JSON.stringify(c.pick)} is not one of its choices`)
  }
  grades[k] = read(join(DIR, `grades-${k}.json`), `grades-${k}`)
  try { validateGrades(grades[k], N, `grades-${k}`) } catch (e) { die(e.message) }
}

const dropped = {}
const add = (id, why) => { (dropped[id] ??= []).push(why) }
let coldMiss = 0, coldAlso = 0, keyedFlags = 0
for (const r of index) {
  for (const k of GRADERS) {
    const c = colds[k][String(r.n)]
    if (c.pick !== r.key) { coldMiss++; add(r.id, `cold ${k}: picked ${JSON.stringify(c.pick)}`) }
    if (c.also_correct.length) { coldAlso++; add(r.id, `cold ${k}: also_correct ${JSON.stringify(c.also_correct)}`) }
    const g = grades[k][String(r.n)]
    if (g.verdict !== 'unique') { keyedFlags++; add(r.id, `keyed ${k}: ${g.verdict}/${g.defect_type}: ${g.reason || ''}`.trim()) }
  }
}

const confirmed = []
for (let i = 0; i < GRADERS.length; i++) for (let j = i + 1; j < GRADERS.length; j++) {
  for (const p of grades[GRADERS[i]].batch_patterns) for (const q of grades[GRADERS[j]].batch_patterns) {
    const pos = isPositionOnly(p.pattern) || isPositionOnly(q.pattern)
    let shared = p.items.map(Number).filter(x => q.items.map(Number).includes(x))
    if (pos) {
      if (!(isPositionOnly(p.pattern) && isPositionOnly(q.pattern))) continue
      shared = shared.filter(n => part2.has(n)) // rule 4: letters count on Part 2 only
    } else {
      const a = p.pattern.toLowerCase(), b = q.pattern.toLowerCase()
      if (!(a === b || !KNOWN.has(a) || !KNOWN.has(b))) continue
    }
    if (shared.length < PATTERN_MIN_SHARED) continue
    confirmed.push({ graders: [GRADERS[i], GRADERS[j]], pattern: p.pattern, other: q.pattern, items: shared, ids: shared.map(n => index[n - 1].id) })
  }
}
const patternIds = new Set(confirmed.flatMap(c => c.ids))
const hold = confirmed.length > 0 && patternIds.size >= HOLD_SHARE * N
for (const id of patternIds) add(id, `pattern: ${confirmed.filter(c => c.ids.includes(id)).map(c => c.pattern).join(', ')}`)
const cleared = hold ? [] : index.map(r => r.id).filter(id => !dropped[id]).sort()

const byPart = p => ({ total: index.filter(r => r.part === p).length, cleared: cleared.filter(id => index.find(r => r.id === id).part === p).length })
const P1 = 'Part 1: Sentence Completion', P2 = 'Part 2: Error Identification'
const res = {
  cohort: 'itep-grammar-v1', total: N, graders: GRADERS.length,
  denominators: { cold_picks: N * GRADERS.length, cold_miss: coldMiss, cold_also_correct: coldAlso, keyed_verdicts: N * GRADERS.length, keyed_non_unique: keyedFlags },
  cleared, dropped, hold, patternShare: patternIds.size / N, patterns: confirmed,
  by_part: { [P1]: byPart(P1), [P2]: byPart(P2) },
  all_batch_patterns: Object.fromEntries(GRADERS.map(k => [k, grades[k].batch_patterns])),
}
const band = hold || cleared.length < 12 ? 'broken (cut v2 before scaling)' : cleared.length < 18 ? 'scale with pending lessons queued' : 'brief works, scale it'
res.band = band
writeFileSync(OUT, JSON.stringify(res, null, 1) + '\n')
console.log(`scored ${N} items x ${GRADERS.length} graders | cold picks ${N * GRADERS.length}: ${coldMiss} off key, ${coldAlso} with also_correct | keyed verdicts ${N * GRADERS.length}: ${keyedFlags} non-unique`)
console.log(`patterns counted: ${confirmed.length} (union ${patternIds.size}/${N})${hold ? ' -> BATCH HOLD' : ''}`)
console.log(`cleared ${cleared.length}/${N} | Part 1 ${res.by_part[P1].cleared}/${res.by_part[P1].total} | Part 2 ${res.by_part[P2].cleared}/${res.by_part[P2].total} | band: ${band}`)
for (const [id, why] of Object.entries(dropped).sort()) console.log(`  DROP ${id}: ${why.join(' | ')}`)
console.log(`wrote ${OUT}`)
