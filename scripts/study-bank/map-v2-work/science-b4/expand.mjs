#!/usr/bin/env node
/**
 * expand.mjs (batch 4; copied from science-b3full/expand.mjs): turns one AREA's authoring sources
 * (scratchpad/map-science-b4/<AREA>/src-<cell>.mjs, one per grade cell, AREA = L|P|E) into the item format
 * (scratchpad/map-science-b4/<AREA>/items.json), copying
 * every slot field from slots.json so none can drift, and placing the key at the slot's letter (A = index 0) with the
 * three distractors in the order written. The author hits the slot's key RANK by writing the options; sci-check verifies.
 *
 *   node scripts/study-bank/map-v2-work/science-b4/expand.mjs <AREA> [--partial]   # --partial: skip missing cell files, write items.partial.json
 *
 * Source entry: { cell: 'L5', n, pe, names, passage, graphic, prompt, key, d: [[choice, fault] x3], why, ev, rw, roles?, pf?, cat? }
 * Model items (b4, MISCDECL): cat = the key's category; each d is [choice, fault, misconception, sameCategory(boolean)].
 * or { cell, n, empty: true, reason }. `roles` is [key, d1, d2, d3] order. Exit 2 on unreadable input or a missing slot.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { DIFF, RIT, LETTERS } from '../science-pilot/sci-spec.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const area = process.argv[2], PARTIAL = process.argv.includes('--partial')
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const S = JSON.parse(readFileSync(join(HERE, 'slots.json'), 'utf8'))
const cells = Object.keys(S).filter(c => c[0] === area)
if (!['L', 'P', 'E'].includes(area) || !cells.length) die(`no area ${area}`)
const dir = resolve(`scratchpad/map-science-b4/${area}`)
const ITEMS = []
for (const c of cells) {
  const src = join(dir, `src-${c}.mjs`)
  if (!existsSync(src)) { if (PARTIAL) continue; die(`no source ${src}`) }
  const m = await import(pathToFileURL(src).href + `?t=${Date.now()}`)
  if (!Array.isArray(m.ITEMS) || !m.ITEMS.length) die(`${src} exports no ITEMS`)
  ITEMS.push(...m.ITEMS)
}
const out = []
for (const e of ITEMS) {
  const code = e.cell
  if (!cells.includes(code)) die(`entry cell ${code} is not an ${area} cell`)
  const id = `MSB4-${code}-${String(e.n).padStart(2, '0')}`
  const slot = S[code].rows.find(r => r.id === id)
  if (!slot) die(`${id} is not a slot`)
  if (out.some(o => o.id === id)) die(`${id} written twice`)
  if (e.empty) { out.push({ id, empty: true, reason: e.reason }); continue }
  if (!Array.isArray(e.d) || e.d.length !== 3) die(`${id}: needs 3 distractors`)
  const ki = LETTERS.indexOf(slot.key), choices = [], roles = []
  let di = 0
  for (let i = 0; i < 4; i++) {
    if (i === ki) { choices.push(e.key); roles.push(e.roles?.[0]) } else { choices.push(e.d[di][0]); roles.push(e.roles?.[di + 1]); di++ }
  }
  const it = {
    id, map_area: S[code].area, grade_target: slot.g, tier: slot.tier, difficulty: DIFF[slot.tier], rit_band_target: RIT[slot.g][slot.tier],
    dci: slot.dci, ngss_pe: e.pe, kind: slot.kind, stimulus: slot.stimulus, format: slot.format, ask: slot.ask, invented: slot.invent,
    names_used: e.names ?? [], passage: e.passage ?? null, graphic: e.graphic ?? null, prompt: e.prompt, choices, correct_answer: e.key,
  }
  if (e.ev) it.key_evidence = e.ev
  Object.assign(it, { explanation: e.why, distractor_rationales: e.d.map(([choice, fault, misconception, same]) => ({ choice, fault, ...(misconception !== undefined ? { misconception } : {}), ...(same !== undefined ? { same_category: same } : {}) })), real_world_check: e.rw })
  if (e.roles) it.option_roles = roles
  if (e.pf) it.prior_free = e.pf
  if (e.cat) it.key_category = e.cat
  out.push(it)
}
const order = cells.flatMap(c => S[c].rows.map(r => r.id)).filter(id => !PARTIAL || ITEMS.some(e => id.startsWith(`MSB4-${e.cell}-`)))
const missing = order.filter(id => !out.some(o => o.id === id))
if (missing.length) die(`slots not written or marked empty: ${missing.join(', ')}`)
out.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
const OUTF = join(dir, PARTIAL ? 'items.partial.json' : 'items.json')
writeFileSync(OUTF, JSON.stringify(out, null, 2) + '\n')
console.log(`expand ${area}: ${out.length} entries (${out.filter(o => o.empty).length} empty) -> ${OUTF}`)
