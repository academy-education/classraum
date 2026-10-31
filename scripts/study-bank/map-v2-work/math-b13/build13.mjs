#!/usr/bin/env node
/**
 * build13.mjs — gate inputs for MAP Math b13 (MAP-MATH-V2-B13.prereg.md, "Gate"), 2026-11-01. No DB, no model.
 * Areas gated: those with n >= 10 in SELECTION.md (+ SELECTION-topup.md): O (carried 1 + round-1 3 + top-up 8 = 12),
 * G (10), D (carried 1 + 10 = 11). N (7) is NOT gated: its picks stay pooled.
 *   1. map-v2-work/math-b13/slots.json      cells <A><grade>; rows copied from the authors' (or b12's) slots with id
 *                                           re-issued MB13-<A><g>-NN and selected_from added
 *   2. scratchpad/map-v2-math-b13-gate/<cell>/items.json   each pick verbatim, id re-issued, selected_from
 *   3. scratchpad/map-v2-math-work/dump-b13-r11/prior-math.json   dump-b13 prior minus every MB13C row and the two
 *                                           carried-in candidates' own rows and b12 siblings (MB12C-O2-*, MB12C-D61-*);
 *                                           used as R11 corpus AND math-check prior
 *   4. map-v2-work/math-b13/EXCLUSIONS-map-b13.txt   every earlier MAP maths item in it
 * Refuses (exit 2) on any count it does not expect.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
const ROOT = '/Users/andylee/Downloads/saas/classraum', D = ROOT + '/scripts/study-bank/', SP = ROOT + '/scratchpad/', W = SP + 'map-v2-math-b13-work/'
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const rd = p => { try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { die(`unreadable ${p}`) } }
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex')
const s1 = rd(W + 'selection.json'), s2 = rd(W + 'selection-topup.json')
const PICKS = { O: [...s1.O.carried, ...s1.O.picks, ...s2.O.picks], G: [...s1.G.carried, ...s1.G.picks], D: [...s1.D.carried, ...s1.D.picks] }
const WANT = { O: 12, G: 10, D: 11 }
for (const [L, xs] of Object.entries(PICKS)) if (xs.length !== WANT[L] || new Set(xs).size !== xs.length) die(`${L}: ${xs.length} picks, expected ${WANT[L]}`)
const cand = {}, srow = {}
const AUTH = ['N-a', 'N-b', 'O-a', 'O-b', 'G-a', 'G-b', 'D-a', 'D-b']
const addSlots = (f, area) => { const s = rd(f); for (const v of Object.values(s)) for (const r of v.rows) srow[r.id] = { ...r, area: v.area } }
for (const a of AUTH) { for (const it of rd(`${W}${a}/candidates.json`)) cand[it.id] = it; addSlots(`${W}${a}/slots.json`) }
for (const a of ['O-a', 'O-b']) { for (const it of rd(`${W}${a}/topup/candidates.json`)) cand[it.id] = it; addSlots(`${W}${a}/topup/slots.json`) }
for (const it of rd(SP + 'map-v2-math-b12-work/candidates.json')) cand[it.id] = it
addSlots(SP + 'map-v2-math-b12-work/slots.json')
const slots = {}, cells = {}
for (const L of ['O', 'G', 'D']) {
  const n = {}
  for (const from of PICKS[L]) {
    const c = cand[from] ?? die(`no candidate ${from}`), r = srow[from] ?? die(`no slot row ${from}`)
    if (r.g !== c.grade_target) die(`${from}: slot g${r.g} vs item g${c.grade_target}`)
    const cell = `${L}${c.grade_target}`; n[cell] = (n[cell] ?? 0) + 1
    const id = `MB13-${cell}-${String(n[cell]).padStart(2, '0')}`
    const { area, ...row } = r
    slots[cell] ??= { area, scope: '', rows: [] }
    if (slots[cell].area !== c.domain) die(`${from}: area ${c.domain} in cell ${cell}`)
    slots[cell].rows.push({ ...row, id, selected_from: from })
    ;(cells[cell] ??= []).push({ ...c, id, selected_from: from })
  }
}
for (const v of Object.values(slots)) v.scope = [...new Set(v.rows.map(r => r.ccss_hint).filter(Boolean))].join(' / ')
const G = SP + 'map-v2-math-b13-gate'
for (const [cell, items] of Object.entries(cells)) { mkdirSync(`${G}/${cell}`, { recursive: true }); writeFileSync(`${G}/${cell}/items.json`, JSON.stringify(items, null, 1) + '\n'); console.log(`${cell}  ${items.map(i => `${i.id}<-${i.selected_from}`).join(', ')}`) }
writeFileSync(D + 'map-v2-work/math-b13/slots.json', JSON.stringify(slots, null, 1) + '\n')
const prior = rd(SP + 'map-v2-math-work/dump-b13/prior-math.json'); if (prior.length !== 2640) die(`dump-b13 prior ${prior.length}, expected 2640`)
const out = prior.filter(x => !/^MB13C?-/.test(String(x.id)) && !/^MB12C-(O2|D61)-/.test(String(x.id)))
if (prior.length - out.length !== 6) die(`removed ${prior.length - out.length} rows, expected the 6 O2/D61 b12 candidate rows`)
mkdirSync(SP + 'map-v2-math-work/dump-b13-r11', { recursive: true }); writeFileSync(SP + 'map-v2-math-work/dump-b13-r11/prior-math.json', JSON.stringify(out))
const map = out.filter(x => /map-math|DB map/.test(x.file ?? '')), ids = [...new Set(map.map(x => String(x.id)))]
const seen = new Set(), lines = []
for (const x of map) { const k = x.id + '|' + x.file + '|' + x.prompt; if (seen.has(k)) continue; seen.add(k); lines.push(`(${x.id}) | ${x.file} | ${String(x.prompt ?? '').replace(/\s+/g, ' ')} | key ${x.correct_answer}`) }
writeFileSync(D + 'map-v2-work/math-b13/EXCLUSIONS-map-b13.txt', `# EXCLUSIONS for map-v2 Math b13 (Operations, Geometry, Statistics gates).\n# Every earlier MAP maths item (live, staged, dropped, withdrawn, first-written, screened, revised, frozen, held, and the\n# b11/b12 stage-A candidates except the two carried-in items' own rows) from dump-b13-r11/prior-math.json.\n# R11: a candidate that repeats the chain of steps of any item below is a template and is dropped.\n# id | source | prompt | key\n\n${lines.join('\n')}\n`)
const rows = Object.values(slots).flatMap(v => v.rows)
console.log(`dump-b13-r11: ${out.length} rows, MAP ids ${ids.length}, sha ${sha(SP + 'map-v2-math-work/dump-b13-r11/prior-math.json').slice(0, 16)}; EXCLUSIONS ${lines.length} lines`)
for (const L of ['O', 'G', 'D']) { const rs = rows.filter(r => r.id.startsWith(`MB13-${L}`)); console.log(`${L}: ${rs.length} rows, ranks ${[1, 2, 3, 4].map(k => rs.filter(r => r.rank === k).length).join('/')}`) }
console.log(`cells ${Object.keys(slots).join(' ')}`)
