#!/usr/bin/env node
/**
 * map-adapt-checks.mjs [batch.json]   stage 0 exact checks, MAP adaptation pilot
 * map-adapt-checks.mjs --fidelity     also score map-adapt/fidelity.json (+ fidelity-2.json if present)
 * map-adapt-checks.mjs --selftest     break every check first
 *
 * Bars: MAP-ADAPT-PILOT-2026-10-07.prereg.md, stage 0. Refuses (exit 2) on a
 * missing file or a short population; exit 1 if any item fails.
 *
 *   X1  provenance: ids MAPA-01..24, each source_id the one sources.json fixes,
 *       set/grade/band/strand/stratum as fixed there
 *   X2  four distinct choices, key among them (batch 1's E6 + key)
 *   X3  sets: identical passage on all four items, 200-350 words, 3-6 paragraphs;
 *       standalone passage 40-120 words
 *   X4  key preserved where it is decidable by string: a WIC or transition key
 *       equals the source key (case/punctuation folded); a passage vocabulary
 *       stem names the source's target word
 *   X5  record: 3 distractor_map entries; dropped_distractor is one of the
 *       source's wrong options iff the source had five choices; changes
 *       non-empty; no KEY-AT-RISK
 *   E1/E3  batch 1's readability and key-length checks, imported unchanged
 *   F   (--fidelity) key_preserved true AND new_defensible false
 */
import { readFileSync, existsSync } from 'node:fs'
import { checkItem } from './map-pilot-checks.mjs'

const argv = process.argv.slice(2), argOf = f => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null }
const D = argOf('--dir') ?? 'scripts/study-bank/map-adapt/'   // pilot 6: --dir scripts/study-bank/map-adapt6/ --n 12
const NSRC = Number(argOf('--n') ?? 24)
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const rd = p => { if (!existsSync(p)) die(`missing ${p}`); return JSON.parse(readFileSync(p, 'utf8')) }
const fold = s => String(s ?? '').toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()
const wc = s => String(s ?? '').split(/\s+/).filter(w => /[a-z]/i.test(w)).length
const paras = s => String(s ?? '').split(/\n\s*\n/).filter(p => p.trim()).length
export const stratumOf = s => s.map_area === 'Vocabulary' ? 'vocab' : /^Writing/.test(s.map_area) ? 'writing' : 'comprehension'
const targetWord = p => (String(p).match(/[“"]([^”"]+)[”"]/) ?? [])[1]

export function checkOne(it, src, setPassages) {
  const e = []
  if (!src) return ['X1 no source entry']
  if (it.source_id !== src.source_id) e.push(`X1 source_id ${it.source_id} != ${src.source_id}`)
  if ((it.set_id ?? null) !== (src.set ?? null)) e.push(`X1 set ${it.set_id} != ${src.set}`)
  if (it.target_band !== src.target_band || Number(it.grade_target) !== src.grade_target) e.push('X1 grade/band differs from sources.json')
  if (it.map_strand !== src.map_strand || it.map_area !== src.map_area) e.push('X1 strand differs from sources.json')
  if (it.stratum !== stratumOf(src)) e.push(`X1 stratum ${it.stratum} != ${stratumOf(src)}`)
  const ch = (it.choices ?? []).map(String)
  if (ch.length !== 4 || new Set(ch.map(fold)).size !== 4) e.push(`X2 need 4 distinct choices (got ${ch.length})`)
  if (!ch.includes(String(it.correct_answer))) e.push('X2 key not among choices')
  if (it.set_id) {
    if (setPassages && setPassages.size !== 1) e.push(`X3 set ${it.set_id} passage differs across its items`)
    const w = wc(it.passage), p = paras(it.passage)
    if (w < 200 || w > 350) e.push(`X3 set passage ${w} words (200-350)`)
    if (p < 3 || p > 6) e.push(`X3 set passage ${p} paragraphs (3-6)`)
  } else { const w = wc(it.passage); if (w < 40 || w > 120) e.push(`X3 standalone passage ${w} words (40-120)`) }
  if (src.standalone === 'wic' || src.standalone === 'transition') { if (fold(it.correct_answer) !== fold(src.item.correct_answer)) e.push(`X4 key "${it.correct_answer}" != source "${src.item.correct_answer}"`) }
  if (src.set && src.map_area === 'Vocabulary') { const t = targetWord(src.item.prompt); if (!t || !fold(it.prompt).includes(fold(t))) e.push(`X4 vocabulary stem does not name the source word "${t}"`) }
  if (!Array.isArray(it.distractor_map) || it.distractor_map.length !== 3) e.push('X5 distractor_map must have 3 entries')
  const srcWrong = src.item.choices.filter(c => c !== src.item.correct_answer).map(fold)
  if (src.item.choices.length === 5) { if (!it.dropped_distractor || !srcWrong.includes(fold(it.dropped_distractor))) e.push('X5 five-choice source needs dropped_distractor = one source wrong option') }
  else if (it.dropped_distractor) e.push('X5 four-choice source must not drop an option')
  if (!Array.isArray(it.changes) || !it.changes.length) e.push('X5 changes empty')
  if ((it.changes ?? []).some(c => /KEY-AT-RISK/.test(c))) e.push('X5 author flagged KEY-AT-RISK')
  const r = checkItem(it)
  e.push(...r.errs.filter(x => x.startsWith('E1')))
  return e
}
export function lengthTell(items) {
  let longest = 0, shortest = 0
  for (const it of items) {
    const L = it.choices.map(c => String(c).length), k = L[it.choices.map(String).indexOf(String(it.correct_answer))]
    if (k === Math.max(...L) && L.filter(x => x === k).length === 1) longest++
    if (k === Math.min(...L) && L.filter(x => x === k).length === 1) shortest++
  }
  return { longest, shortest, n: items.length }
}
export const fidelityFail = f => !f || f.key_preserved !== true || f.new_defensible !== false

function selftest() {
  let fail = 0
  const expect = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fail++ }
  const P = 'Mia ran to the shop. She got milk. It was a good day for a walk.\n\nThe sun was out. Birds sang in the trees by the road home.\n\nShe was glad she went.'
  const passage = (P + ' ').repeat(6).trim()
  const src = { source_id: 's1', set: 'P1', grade_target: 6, target_band: 'RIT 190-199', map_area: 'Vocabulary', map_strand: 'Vocabulary', item: { prompt: 'In the passage, the word "ran" most nearly means', choices: ['a', 'b', 'c', 'd', 'e'], correct_answer: 'a' } }
  const it = { source_id: 's1', set_id: 'P1', grade_target: 6, target_band: 'RIT 190-199', map_area: 'Vocabulary', map_strand: 'Vocabulary', stratum: 'vocab', passage, prompt: 'What does the word ran mean in paragraph 1?', choices: ['moved fast', 'stretched out', 'was in charge of', 'flowed'], correct_answer: 'stretched out', distractor_map: [1, 2, 3], dropped_distractor: 'e', changes: ['x'] }
  const base = checkOne(it, src, new Set([passage]))
  expect(base.filter(x => !x.startsWith('E1') && !x.startsWith('X3')).length === 0, `a sound item passes X1/X2/X4/X5 (${base.join('; ') || 'none'})`)
  expect(checkOne({ ...it, choices: ['a', 'a', 'b', 'stretched out'] }, src).some(x => x.startsWith('X2')), 'X2: duplicate choice fails')
  expect(checkOne({ ...it, prompt: 'What does the word go mean?' }, src).some(x => x.startsWith('X4')), 'X4: vocabulary stem without the source word fails')
  expect(checkOne({ ...it, dropped_distractor: null }, src).some(x => x.startsWith('X5')), 'X5: five-choice source without a dropped option fails')
  expect(checkOne({ ...it, dropped_distractor: 'zzz' }, src).some(x => x.startsWith('X5')), 'X5: dropping an option the source never had fails')
  expect(checkOne({ ...it, changes: ['KEY-AT-RISK'] }, src).some(x => x.startsWith('X5')), 'X5: KEY-AT-RISK fails')
  expect(checkOne({ ...it, stratum: 'comprehension' }, src).some(x => x.startsWith('X1')), 'X1: wrong stratum fails')
  expect(checkOne(it, src, new Set([passage, passage + ' x'])).some(x => x.startsWith('X3')), 'X3: a set whose passage differs fails')
  expect(checkOne({ ...it, passage: 'Too short.' }, src).some(x => x.startsWith('X3')), 'X3: a 2-word set passage fails')
  const wsrc = { ...src, set: null, standalone: 'wic', map_area: 'Vocabulary', item: { prompt: 'x', choices: ['blame', 'b', 'c', 'd'], correct_answer: 'blame' } }
  const wit = { ...it, set_id: null, passage: 'word '.repeat(60), correct_answer: 'fault', choices: ['fault', 'b', 'c', 'd'], dropped_distractor: null }
  expect(checkOne(wit, wsrc).some(x => x.startsWith('X4')), 'X4: a WIC key that changed word fails')
  const hard = { ...it, passage: 'Notwithstanding considerable epistemological reservations, contemporary historiographical methodologies systematically reconceptualize institutional responsibilities. '.repeat(30) }
  expect(checkOne(hard, src).some(x => x.startsWith('E1')), 'E1 (imported): a grade-16 passage fails')
  const lt = lengthTell([{ choices: ['long key here', 'a', 'b', 'c'], correct_answer: 'long key here' }, { choices: ['a', 'bb', 'cc', 'dd'], correct_answer: 'bb' }])
  expect(lt.longest === 1 && lt.shortest === 0, 'E3: unique-longest counted, tie not counted')
  expect(fidelityFail({ key_preserved: false, new_defensible: false }) && fidelityFail({ key_preserved: true, new_defensible: true }) && fidelityFail(undefined) && !fidelityFail({ key_preserved: true, new_defensible: false }), 'F: key changed or new defensible or missing verdict fails')
  console.log(fail ? `SELFTEST FAILED (${fail})` : 'selftest passed: every check can fail')
  process.exit(fail ? 1 : 0)
}

const args = process.argv.slice(2)
if (import.meta.url !== `file://${process.argv[1]}`) { /* imported */ }
else if (args[0] === '--selftest') selftest()
else {
  const file = args.find((a, i) => !a.startsWith('--') && !['--dir', '--n'].includes(args[i - 1])) ?? D + 'batch.json'
  const items = rd(file), sources = rd(D + 'sources.json')
  if (!Array.isArray(items)) die('batch is not an array')
  if (sources.length !== NSRC) die(`sources.json holds ${sources.length}, prereg fixes ${NSRC}`)
  console.log(`denominator: ${items.length} adapted items against ${NSRC} fixed sources`)
  const byId = Object.fromEntries(sources.map(s => [s.adapt_id, s]))
  const sets = {}; for (const it of items) if (it.set_id) (sets[it.set_id] ??= new Set()).add(it.passage)
  let bad = 0
  const fid = args.includes('--fidelity') ? [D + 'fidelity.json', D + 'fidelity-2.json'].filter(existsSync).map(rd).reduce((a, f) => ({ ...a, ...(f.labels ?? f) }), {}) : null
  if (fid && !Object.keys(fid).length) die('--fidelity given but no fidelity verdicts found')
  const missing = sources.filter(s => !items.some(i => i.id === s.adapt_id)).map(s => s.adapt_id)
  for (const it of items) {
    const e = checkOne(it, byId[it.id], it.set_id ? sets[it.set_id] : null)
    if (fid && fidelityFail(fid[it.id])) e.push(`F fidelity: key_preserved=${fid[it.id]?.key_preserved} new_defensible=${fid[it.id]?.new_defensible} - ${String(fid[it.id]?.note ?? 'no verdict').slice(0, 160)}`)
    const w = it.set_id ? '' : ` ${wc(it.passage)}w`
    console.log(`${e.length ? 'FAIL' : 'ok  '} ${it.id} [${it.stratum} ${it.target_band}${it.set_id ? ' ' + it.set_id : ''}]${w}`)
    for (const x of e) console.log(`       x ${x}`)
    if (e.length) bad++
  }
  for (const [s, p] of Object.entries(sets)) { const t = [...p][0]; console.log(`set ${s}: ${wc(t)} words, ${paras(t)} paragraphs, ${p.size} distinct text(s)`) }
  const lt = lengthTell(items)
  const ltBad = lt.longest / lt.n > 0.25 || lt.shortest / lt.n > 0.25
  console.log(`E3 key uniquely longest ${lt.longest}/${lt.n}, uniquely shortest ${lt.shortest}/${lt.n} (bar <= 25% each) ${ltBad ? 'FAIL' : 'ok'}`)
  if (missing.length) console.log(`MISSING (count as failed): ${missing.join(', ')}`)
  const failed = bad + missing.length + (ltBad ? 1 : 0)
  console.log(failed ? `\n${bad + missing.length} item(s) failing${ltBad ? ' + E3 batch failure' : ''}` : '\nall stage-0 exact checks pass')
  process.exit(failed ? 1 : 0)
}
