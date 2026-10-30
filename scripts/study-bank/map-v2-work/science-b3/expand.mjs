#!/usr/bin/env node
/**
 * expand.mjs (batch 3 pilot): turns one AREA's authoring source (scratchpad/map-science-b3/<AREA>/src.mjs, AREA = L|P|E)
 * into the batch-1 item format (scratchpad/map-science-b3/<AREA>/items.json), copying every slot field from slots.json so none can drift,
 * and placing the key at the slot's letter (A = index 0) with the three distractors in the order written. The author
 * still has to hit the slot's key RANK (value or length) by writing the options; sci-check verifies it.
 *
 *   node scripts/study-bank/map-v2-work/science-b3/expand.mjs <AREA>
 *
 * Source entry: { cell: 'L5', n, pe, names, passage, graphic, prompt, key, d: [[choice, fault] x3], why, ev, rw, roles?, pf? }
 * or { n, empty: true, reason }. `roles` is [key, d1, d2, d3] order. Exit 2 on unreadable input.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { DIFF, RIT, LETTERS } from '../science-pilot/sci-spec.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const area = process.argv[2]
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const S = JSON.parse(readFileSync(join(HERE, 'slots.json'), 'utf8'))
const cells = Object.keys(S).filter(c => c[0] === area)
if (!['L', 'P', 'E'].includes(area) || !cells.length) die(`no area ${area}`)
const dir = resolve(`scratchpad/map-science-b3/${area}`), src = join(dir, 'src.mjs')
if (!existsSync(src)) die(`no source ${src}`)
const { ITEMS } = await import(pathToFileURL(src).href + `?t=${Date.now()}`)
if (!Array.isArray(ITEMS) || !ITEMS.length) die('source exports no ITEMS')
const out = []
for (const e of ITEMS) {
  const code = e.cell
  if (!cells.includes(code)) die(`entry cell ${code} is not an ${area} cell`)
  const id = `MSB3P-${code}-${String(e.n).padStart(2, '0')}`
  const slot = S[code].rows.find(r => r.id === id)
  if (!slot) die(`${id} is not a slot`)
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
  Object.assign(it, { explanation: e.why, distractor_rationales: e.d.map(([choice, fault]) => ({ choice, fault })), real_world_check: e.rw })
  if (e.roles) it.option_roles = roles
  if (e.pf) it.prior_free = e.pf
  out.push(it)
}
const missing = cells.flatMap(c => S[c].rows).filter(r => !out.some(o => o.id === r.id)).map(r => r.id)
if (missing.length) die(`slots not written or marked empty: ${missing.join(', ')}`)
writeFileSync(join(dir, 'items.json'), JSON.stringify(out, null, 2) + '\n')
console.log(`expand ${area}: ${out.length} entries (${out.filter(o => o.empty).length} empty) -> ${join(dir, 'items.json')}`)
