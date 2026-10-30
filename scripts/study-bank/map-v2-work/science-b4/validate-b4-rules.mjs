#!/usr/bin/env node
/**
 * validate-b4-rules.mjs: fixtures and break-tests for batch 4's checker changes (MAP-SCIENCE-B4.prereg.md, rule 10d),
 * run BEFORE any batch-4 item exists. Run from the repo root.
 *
 *   node scripts/study-bank/map-v2-work/science-b4/validate-b4-rules.mjs
 *
 * For each b3-full rule-10a mechanical pattern (RULE10-MATCHES.md) the b4 checker must FIRE on the items both graders named
 * (batch 3 full's 230 items under its own slots) and must go QUIET on them when that one check is disabled:
 *   VARPLAN   "wrote down / noted the <option>" plan      Life L5-17 L6-03 L7-16 L8-16, Phys P5-17 P6-10 P7-11 P8-02,
 *                                                         Earth E6-03 E7-10 E8-12 (E5-10: stated miss, one option only)
 *   SHORTLBL  two-letter label never the key              Earth E5-07 E7-08 E7-15 E8-08 E8-17
 *   KEYWORD   "energy" only on keys (Physical claims)     P7-17 P7-18 P8-17 P8-18
 *   ECHOBAL   only the key echoes a stem word (Life term) L6-04 L6-18 L8-18
 *   XKEY      one item names another item's key (B7)      E8-04 -> E8-13, E8-07 -> E8-18
 *   LAMARCK   need/will change never the key (Life)       L5-06 L6-06 L6-19 L7-13 L8-13
 *   MISCDECL  presence of the B31 declarations            fires on a b3 model item; quiet once declared
 * Plus: b4 drops the per-item ECHO ban (ECHOBAL replaces it); band edges for SHORTLBL and ECHOBAL; and the false-fire count
 * on batch 2 (224, no grader named any of these except ECHO) is PRINTED, so the reach of each check is visible.
 * Exit 2 on unreadable input or a wrong count, 1 on any failed expectation, 0 otherwise.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkItem, checkBatch, B4_CHECKS } from '../science-pilot/sci-check.mjs'

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = join(HERE, '../../../..')
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const slotIdx = rel => { const S = JSON.parse(readFileSync(join(HERE, rel), 'utf8')), o = {}; for (const [c, v] of Object.entries(S)) if (!c.startsWith('_')) for (const r of v.rows) o[r.id] = { ...r, area: v.area, author: c }; return o }
const readItems = (files, want) => { const it = []; for (const f of files) { const p = join(ROOT, f); if (!existsSync(p)) die(`missing ${f}`); it.push(...JSON.parse(readFileSync(p, 'utf8')).filter(i => !i.empty)) } if (it.length !== want) die(`read ${it.length}, expected ${want}`); return it }
const b3 = { SLOT: slotIdx('../science-b3full/slots.json'), items: readItems(['L', 'P', 'E'].map(a => `scripts/study-bank/map-v2-work/science-b3full/items/${a}.json`), 230) }
const b2 = { SLOT: slotIdx('../science-b2/slots.json'), items: readItems(['L5', 'L6', 'L7', 'L8', 'P5', 'P6', 'P7', 'P8', 'E5', 'E6', 'E7', 'E8'].map(c => `scratchpad/map-science-b2/${c}/items.json`), 224) }
console.log(`read ${b3.items.length} batch-3-full and ${b2.items.length} batch-2 items`)

let fail = 0
const ok = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fail++ }
const batchLines = (d, check, disabled = []) => checkBatch(d.items, d.SLOT, { rules: 'b4', disabled: new Set(disabled) }).p.filter(p => p.startsWith(`BATCH ${check} `))
const named = (lines, ids) => ids.filter(id => lines.some(l => l.includes(`MSB3-${id}`)))
const itemHits = (d, check, disabled = []) => d.items.filter(i => checkItem(i, d.SLOT[i.id], [], { rules: 'b4', disabled: new Set(disabled) }).some(p => p.startsWith(check))).map(i => i.id.replace(/^MSB\w+-/, ''))

const PATTERNS = [
  ['VARPLAN', ['L5-17', 'L6-03', 'L7-16', 'L8-16', 'P5-17', 'P6-10', 'P7-11', 'P8-02', 'E6-03', 'E7-10', 'E8-12'], 'batch'],
  ['SHORTLBL', ['E5-07', 'E7-08', 'E7-15', 'E8-08', 'E8-17'], 'batch'],
  ['KEYWORD', ['P7-17', 'P7-18', 'P8-17', 'P8-18'], 'batch'],
  ['ECHOBAL', ['L6-04', 'L6-18', 'L8-18'], 'batch'],
  ['XKEY', ['E8-04', 'E8-13', 'E8-07', 'E8-18'], 'batch'],
  ['LAMARCK', ['L5-06', 'L6-06', 'L6-19', 'L7-13', 'L8-13'], 'item'],
]
console.log('\n== 1. each checker fires on its named b3-full items and goes quiet when disabled')
for (const [c, ids, kind] of PATTERNS) {
  const on = kind === 'batch' ? named(batchLines(b3, c), ids) : ids.filter(id => itemHits(b3, c).includes(id))
  const off = kind === 'batch' ? named(batchLines(b3, c, [c]), ids) : ids.filter(id => itemHits(b3, c, [c]).includes(id))
  ok(on.length === ids.length, `${c} on: catches ${on.length} of ${ids.length} named (${ids.filter(x => !on.includes(x)).join(' ') || 'all'}${on.length === ids.length ? '' : ' missed'})`)
  ok(off.length === 0, `${c} disabled: ${off.length} named items still flagged`)
}
ok(!named(batchLines(b3, 'VARPLAN'), ['E5-10']).length, 'VARPLAN stated miss: E5-10 (one option after a recording verb) is NOT caught; recorded in the prereg')
const E8_13 = batchLines(b3, 'XKEY').filter(l => l.includes('MSB3-E8-04') && l.includes('MSB3-E8-13')), E8_18 = batchLines(b3, 'XKEY').filter(l => l.includes('MSB3-E8-07') && l.includes('MSB3-E8-18'))
ok(E8_13.length === 1 && E8_18.length === 1, `XKEY names the exact pairs E8-04 -> E8-13 (${E8_13.length}) and E8-07 -> E8-18 (${E8_18.length})`)

console.log('\n== 2. MISCDECL (presence of the B31 declarations)')
const m = structuredClone(b3.items.find(i => i.id === 'MSB3-P7-17'))
ok(checkItem(m, b3.SLOT[m.id], [], { rules: 'b4' }).some(p => p.startsWith('MISCDECL')), 'P7-17 as written (no declarations) is refused')
m.key_category = 'explanations of how sound affects matter'
for (const d of m.distractor_rationales) { d.misconception = 'students think sound is a substance that pulls or chills things'; d.same_category = true }
ok(!checkItem(m, b3.SLOT[m.id], [], { rules: 'b4' }).some(p => p.startsWith('MISCDECL')), 'P7-17 with key_category and per-distractor misconception + same_category passes')
m.distractor_rationales[1].same_category = false
ok(checkItem(m, b3.SLOT[m.id], [], { rules: 'b4' }).some(p => p.startsWith('MISCDECL')), 'one distractor declared off-category is refused')
ok(!checkItem(structuredClone(b3.items.find(i => i.id === 'MSB3-P7-17')), b3.SLOT['MSB3-P7-17'], [], { rules: 'b4', disabled: new Set(['MISCDECL']) }).some(p => p.startsWith('MISCDECL')), 'MISCDECL disabled: quiet')

console.log('\n== 3. ECHO: the per-item ban is OFF under b4 (ECHOBAL replaces it) and unchanged under b3f')
const l618 = b3.items.find(i => i.id === 'MSB3-L6-04')
const echoItem = structuredClone(l618); echoItem.choices = echoItem.choices.map(c => c === l618.correct_answer ? 'pollen transfer within one flower' : c); echoItem.correct_answer = 'pollen transfer within one flower'
ok(checkItem(echoItem, b3.SLOT[echoItem.id], [], { rules: 'b3f' }).some(p => p.startsWith('ECHO ')), 'b3f: a key alone repeating "pollen" is refused per item (old ban)')
ok(!checkItem(echoItem, b3.SLOT[echoItem.id], [], { rules: 'b4' }).some(p => p.startsWith('ECHO ')), 'b4: the same item is not refused per item (judged as a distribution)')

console.log('\n== 4. band edges (synthetic distributions on b3-full Earth conditions items)')
{
  const E = b3.items.filter(i => i.format === 'conditions' && i.id.includes('-E')), base = E.map(i => structuredClone(i))
  const keyOf = i => i.correct_answer
  const shortKeys = n => base.map((i, x) => { const c = structuredClone(i); if (x < n) { const k = keyOf(c); const nk = k.split(' ').slice(0, -1).concat(['Ky']).join(' ') || 'Ky'; c.choices = c.choices.map(o => (o === k ? nk : o)); c.correct_answer = nk } return c })
  const run = items => checkBatch(items, b3.SLOT, { rules: 'b4' }).p.filter(p => p.startsWith('BATCH SHORTLBL Earth'))
  ok(run(base).length === 1, 'SHORTLBL Earth 0 of 5 short cores keyed -> fires')
  ok(run(shortKeys(2)).length === 0, 'SHORTLBL Earth 2 of 7 (29%) -> quiet')
  ok(run(shortKeys(5)).length === 1, 'SHORTLBL Earth 5 of 10 (50%) -> fires (over-keyed is a tell too)')
}

console.log('\n== 5. reach on batch 2 (224; graders named only an ECHO pattern there), printed not gated')
for (const c of B4_CHECKS.filter(c => c !== 'MISCDECL' && c !== 'LAMARCK')) console.log(`  ${c}: ${batchLines(b2, c).length} refusals${batchLines(b2, c).length ? ' -> ' + batchLines(b2, c).map(l => l.slice(6, 120)).join(' || ') : ''}`)
console.log(`  LAMARCK: ${itemHits(b2, 'LAMARCK').length} items (${itemHits(b2, 'LAMARCK').join(' ')})`)
console.log('  b3-full lines beyond the named items (also printed, not gated):')
for (const c of ['VARPLAN', 'SHORTLBL', 'KEYWORD', 'ECHOBAL', 'XKEY']) for (const l of batchLines(b3, c)) console.log(`    ${l.slice(6, 170)}`)

console.log(fail ? `\nVALIDATION FAILED: ${fail}` : '\nVALIDATION OK: every b4 checker catches its named b3-full items (VARPLAN 11 of 12, E5-10 stated) and vanishes when disabled')
process.exit(fail ? 1 : 0)
