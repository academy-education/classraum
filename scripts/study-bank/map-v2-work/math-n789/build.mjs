#!/usr/bin/env node
/**
 * build.mjs — inputs for the map-v2 Math Number Systems gate batch n789 (MAP-MATH-V2-N789.prereg.md), 2026-10-30.
 * Writes, from files already on disk (no DB, no model):
 *   1. map-v2-work/math-n789/slots.json   the 9 PART OK slots, rows copied verbatim from math-b7/b8/b9 slots.json
 *      (dropped rows MB8-N7-04 and MB8-N8-01 left out); author cells renamed <cell>-b<k> so cells stay distinct
 *   2. scratchpad/map-v2-math-n789-work/<cell>-b<k>/items.json   symlinks to the authored files (one source)
 *   3. scratchpad/map-v2-math-work/dump-n789/prior-math.json   dump-b10 (= dump-b6 + the 20 b6/b7/b8 rows) minus
 *      the 9 candidates' own rows (math-check's prior scan does not skip a same-id row: keeping them would flag
 *      every candidate as a near-duplicate of itself)
 *   4. map-v2-work/math-n789/EXCLUSIONS-map-n789.txt   every earlier MAP maths item in dump-n789 (the b6 format)
 * Refuses (exit 2) on any count it does not expect.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, symlinkSync, lstatSync, readlinkSync } from 'node:fs'
import { createHash } from 'node:crypto'
const ROOT = '/Users/andylee/Downloads/saas/classraum', D = ROOT + '/scripts/study-bank/', SP = ROOT + '/scratchpad/'
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex')
const SRC = [
  ['b7', 'N7', ['MB7-N7-01']],
  ['b8', 'N6', ['MB8-N6-01']],
  ['b8', 'N7', ['MB8-N7-01', 'MB8-N7-02', 'MB8-N7-03', 'MB8-N7-05']],
  ['b9', 'N5', ['MB9-N5-01']],
  ['b9', 'N6', ['MB9-N6-01']],
  ['b9', 'N8', ['MB9-N8-01']],
]
const IDS = SRC.flatMap(s => s[2])
const slots = {}, AUTH = SP + 'map-v2-math-n789-work'
mkdirSync(AUTH, { recursive: true })
for (const [b, cell, ids] of SRC) {
  const sl = JSON.parse(readFileSync(`${D}map-v2-work/math-${b}/slots.json`, 'utf8'))[cell] ?? die(`math-${b}/slots.json has no cell ${cell}`)
  const rows = sl.rows.filter(r => ids.includes(r.id))
  if (rows.length !== ids.length || rows.some(r => r.status)) die(`math-${b} ${cell}: expected live rows ${ids.join(' ')}, read ${rows.map(r => r.id).join(' ')}`)
  const name = `${cell}-${b}`
  slots[name] = { ...sl, rows }
  const src = `${SP}map-v2-math-${b}-work/${cell}/items.json`
  const items = JSON.parse(readFileSync(src, 'utf8'))
  if (JSON.stringify(items.map(i => i.id).sort()) !== JSON.stringify([...ids].sort())) die(`${src}: holds ${items.map(i => i.id).join(' ')}, expected ${ids.join(' ')}`)
  mkdirSync(`${AUTH}/${name}`, { recursive: true })
  const link = `${AUTH}/${name}/items.json`
  if (existsSync(link) || (() => { try { lstatSync(link); return true } catch { return false } })()) { if (readlinkSync(link) !== src) die(`${link} points elsewhere`) } else symlinkSync(src, link)
  console.log(`${name.padEnd(6)} ${ids.length} item(s)  ${src.replace(ROOT + '/', '')}  sha256 ${sha(src)}`)
}
writeFileSync(`${D}map-v2-work/math-n789/slots.json`, JSON.stringify(slots, null, 1) + '\n')
const prior = JSON.parse(readFileSync(SP + 'map-v2-math-work/dump-b10/prior-math.json', 'utf8'))
const self = prior.filter(x => IDS.includes(String(x.id)))
if (self.length !== 6 || !self.every(x => /first-written/.test(x.file))) die(`dump-b10: expected 6 candidate rows (b7/b8 first-written), read ${self.length}`)
const out = prior.filter(x => !IDS.includes(String(x.id)))
if (out.length !== 2537 - 6) die(`dump-n789 ${out.length} rows`)
mkdirSync(SP + 'map-v2-math-work/dump-n789', { recursive: true })
writeFileSync(SP + 'map-v2-math-work/dump-n789/prior-math.json', JSON.stringify(out))
const map = out.filter(x => /map-math|DB map/.test(x.file ?? ''))
const ids = [...new Set(map.map(x => String(x.id)))]
const seen = new Set(), lines = []
for (const x of map) { const k = x.id + '|' + x.file; if (seen.has(k)) continue; seen.add(k); lines.push(`(${x.id}) | ${x.file} | ${String(x.prompt ?? '').replace(/\s+/g, ' ')} | key ${x.correct_answer}`) }
writeFileSync(`${D}map-v2-work/math-n789/EXCLUSIONS-map-n789.txt`, `# EXCLUSIONS for the map-v2 Math Number Systems gate batch n789 (MB7-N7-01, five MB8, three MB9).\n# Every earlier MAP maths item (live, staged, dropped, withdrawn, first-written) from dump-n789/prior-math.json\n# (dump-b10 minus the nine candidates' own first-written rows).\n# R11: a candidate that repeats the chain of steps of any item below is a template and is dropped.\n# id | source | prompt | key\n\n${lines.join('\n')}\n`)
console.log(`dump-n789: ${out.length} rows (dump-b10 ${prior.length} - ${self.length} candidate rows); MAP maths rows ${map.length}, distinct ids ${ids.length}; sha256 ${sha(SP + 'map-v2-math-work/dump-n789/prior-math.json')}`)
console.log(`slots: ${Object.keys(slots).length} cells, ${Object.values(slots).reduce((s, v) => s + v.rows.length, 0)} rows; key ranks 1/2/3/4 = ${[1, 2, 3, 4].map(r => Object.values(slots).flatMap(v => v.rows).filter(x => x.rank === r).length).join('/')}`)
console.log(`EXCLUSIONS-map-n789.txt: ${lines.length} lines, ${ids.length} ids`)
