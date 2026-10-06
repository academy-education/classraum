#!/usr/bin/env node
/**
 * apply-2026-10-06-v2.mjs [--write | --rollback]
 *
 * Fixes the three wording/figure defects in V2-KEY-VERIFY-2026-10-02.md
 * ("Defects the key check surfaced"). Keys were correct on all three and
 * stay the same option text. `item` only. Dry run by default.
 *
 * 1. 2651c472 (IQR, n=7). Distractor "9" is the median-INCLUDED answer
 *    (Tukey hinges / Excel QUARTILE.INC), so the item had two defensible
 *    options. The SAT does not name a quartile method in the stem, so the
 *    stem stays; the distractor is replaced by 7, the range of the middle
 *    three values (14 - 7) — a named error path ("interquartile" read as
 *    "the middle values") that no quartile convention produces. Every
 *    common convention (R types 1-9, exclusive/inclusive halves) gives an
 *    IQR in [9, 11]; the recompute below asserts the option set meets that
 *    set in exactly the key. 5 (Q1 alone) and 6 (Q3 - median) were
 *    rejected: 5 makes 16 - 5 = 11 (option set derives the key), 6 makes
 *    6/11/16 an arithmetic progression centred on the key.
 * 2. 40b7798b (rates). Stem named a car the item never introduced; table
 *    rows 1-4 had no unit. One sentence of context; row labels "1 hour" ..
 *    "4 hours" (the table renderer has no corner header cell, so the unit
 *    goes on the row labels); caption describes the table; explanation
 *    shows the computation. Choices, key untouched.
 * 3. 825707e2 (inscribed angle). The SVG drew OA at 207 deg and OB at
 *    63 deg = 144 deg against a stated/labelled 100 deg. Redrawn with
 *    OA at 185 deg, OB at 85 deg (same bisector side, P unchanged at
 *    315 deg on the major arc), so the drawn central angle is 100 deg and
 *    the drawn inscribed angle is 50 deg. Only graphic.svg changes.
 *
 * Snapshot (full rows) written on the first run, dry run included, never
 * overwritten. --write refuses if a live row no longer matches it.
 * --rollback restores `item` from the snapshot.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const D = new URL('.', import.meta.url).pathname
const SNAP = D + 'snapshot-2026-10-06-v2.json'
const WRITE = process.argv.includes('--write')
const ROLLBACK = process.argv.includes('--rollback')
const env = Object.fromEntries(readFileSync(D + '../../../.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

const IQR = '2651c472-897d-45a5-8330-911cfc29272b'
const CAR = '40b7798b-46e2-47c1-9607-93c57988ab1e'
const ARC = '825707e2-b9b0-4cb2-8219-b04e8379996b'
const IDS = [IQR, CAR, ARC]

// ── new figure for ARC: centre (150,120), r 80; A 185°, B 85°, P 315° ──
const NEW_SVG = `<svg viewBox="0 0 300 240" width="280" role="img" aria-label="Circle center O; central angle A O B is 100 degrees; inscribed angle A P B subtends the same arc from point P on the major arc.">
  <circle cx="150" cy="120" r="80" fill="none" stroke="#2B3A8C" stroke-width="2"/>
  <line x1="150.0" y1="120.0" x2="70.3" y2="127.0" stroke="#2B3A8C" stroke-width="1.6"/>
  <line x1="150.0" y1="120.0" x2="157.0" y2="40.3" stroke="#2B3A8C" stroke-width="1.6"/>
  <line x1="206.6" y1="176.6" x2="70.3" y2="127.0" stroke="#0E7A5F" stroke-width="1.6"/>
  <line x1="206.6" y1="176.6" x2="157.0" y2="40.3" stroke="#0E7A5F" stroke-width="1.6"/>
  <circle cx="150.0" cy="120.0" r="2.5" fill="#5A6474" stroke="#fff" stroke-width="1.1"/><circle cx="70.3" cy="127.0" r="3.4" fill="#2B3A8C" stroke="#fff" stroke-width="1.1"/><circle cx="157.0" cy="40.3" r="3.4" fill="#2B3A8C" stroke="#fff" stroke-width="1.1"/><circle cx="206.6" cy="176.6" r="3.4" fill="#0E7A5F" stroke="#fff" stroke-width="1.1"/>
  <text x="146.0" y="136.0" text-anchor="end" font-size="12" font-weight="600" fill="#5A6474" font-family="system-ui,sans-serif">O</text><text x="64.3" y="131.0" text-anchor="end" font-size="13" font-weight="600" fill="#12151C" font-family="system-ui,sans-serif">A</text><text x="163.0" y="38.3" text-anchor="start" font-size="13" font-weight="600" fill="#12151C" font-family="system-ui,sans-serif">B</text><text x="214.6" y="180.6" text-anchor="start" font-size="13" font-weight="600" fill="#0A5C48" font-family="system-ui,sans-serif">P</text>
  <text x="134.4" y="108.4" text-anchor="middle" font-size="12" font-weight="600" fill="#2B3A8C" font-family="system-ui,sans-serif">100°</text></svg>`

// ── independent recomputes (asserted on the PLANNED item) ──
function quantile(xs, p, type) { // Hyndman-Fan types 1-9
  const s = [...xs].sort((a, b) => a - b), n = s.length, at = k => s[Math.min(Math.max(k, 1), n) - 1]
  if (type <= 3) {
    const np = n * p, j = Math.floor(np), g = np - j
    if (type === 1) return g > 0 ? at(j + 1) : at(j)
    if (type === 2) return g > 0 ? at(j + 1) : (at(j) + at(j + 1)) / 2
    const k = Math.floor(np - 0.5), gg = np - 0.5 - k // type 3 (SAS nearest even)
    return gg === 0 && k % 2 === 0 ? at(k) : at(k + 1)
  }
  const m = { 4: 0, 5: 0.5, 6: p, 7: 1 - p, 8: (p + 1) / 3, 9: p / 4 + 3 / 8 }[type]
  const h = n * p + m, j = Math.floor(h), g = h - j
  return at(j) + g * (at(j + 1) - at(j))
}
function halves(xs, includeMedian) {
  const s = [...xs].sort((a, b) => a - b), n = s.length, med = arr => arr.length % 2 ? arr[(arr.length - 1) / 2] : (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2
  const h = Math.floor(n / 2), lo = s.slice(0, n % 2 && includeMedian ? h + 1 : h), hi = s.slice(n % 2 && !includeMedian ? h + 1 : h)
  return med(hi) - med(lo)
}
const num = s => Number(String(s).replace(/[^\d.\-]/g, ''))
const RECOMPUTE = {
  [IQR](it) {
    const data = it.prompt.match(/data set ([\d, ]+)\./)[1].split(',').map(Number)
    const conv = { exclusive: halves(data, false), inclusive: halves(data, true) }
    for (let t = 1; t <= 9; t++) conv[`type${t}`] = quantile(data, 0.75, t) - quantile(data, 0.25, t)
    const defensible = new Set(Object.values(conv).map(v => +v.toFixed(4)))
    const hits = it.choices.filter(c => defensible.has(num(c)))
    if (hits.length !== 1 || hits[0] !== it.correct_answer) throw new Error(`IQR: options meeting a convention: ${JSON.stringify(hits)}; conventions ${JSON.stringify(conv)}`)
    if (conv.exclusive !== num(it.correct_answer)) throw new Error('IQR: key is not the SAT (median-excluded) answer')
    // option-set derivation tell: no option is the sum/difference of two others
    const v = it.choices.map(num)
    for (const a of v) for (const b of v) for (const c of v) if (a !== b && b !== c && a !== c && (a + b === c || a - b === c)) throw new Error(`IQR: option set derives ${c} from ${a},${b}`)
    return `IQR conventions ${JSON.stringify(Object.fromEntries(Object.entries(conv).map(([k, x]) => [k, +x.toFixed(3)])))}; only offered match ${hits[0]}`
  },
  [CAR](it) {
    const hours = it.graphic.rowLabels.map(l => { const m = l.match(/^(\d+) hours?$/); if (!m) throw new Error(`CAR: unlabelled row ${l}`); return +m[1] })
    const rates = it.graphic.cells.map((r, i) => r[0] / hours[i])
    if (new Set(rates).size !== 1) throw new Error(`CAR: rate not constant ${rates}`)
    if (!/car/.test(it.prompt.split('.')[0]) || !/hours?/.test(it.prompt)) throw new Error('CAR: setup sentence does not introduce the car and time')
    if (String(rates[0]) !== it.correct_answer) throw new Error(`CAR: computed ${rates[0]} vs key ${it.correct_answer}`)
    return `rates ${rates.join('/')} mph`
  },
  [ARC](it) {
    const pts = {}
    for (const m of it.graphic.svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="3\.4"[^>]*fill="(#[0-9A-F]+)"/g)) (pts[m[3]] ??= []).push([+m[1], +m[2]])
    const [A, B] = pts['#2B3A8C'], [P] = pts['#0E7A5F'], O = [150, 120]
    const ang = (V, X, Y) => { const u = [X[0] - V[0], X[1] - V[1]], w = [Y[0] - V[0], Y[1] - V[1]]; return Math.acos((u[0] * w[0] + u[1] * w[1]) / Math.hypot(...u) / Math.hypot(...w)) * 180 / Math.PI }
    const aob = ang(O, A, B), apb = ang(P, A, B)
    const onCircle = [A, B, P].every(q => Math.abs(Math.hypot(q[0] - 150, q[1] - 120) - 80) < 0.3)
    if (!onCircle || Math.abs(aob - 100) > 0.5 || Math.abs(apb - num(it.correct_answer)) > 0.5) throw new Error(`ARC: drawn AOB ${aob.toFixed(2)}, APB ${apb.toFixed(2)}, onCircle ${onCircle}`)
    // P on the major arc: P and the minor-arc midpoint are on opposite sides of chord AB
    const side = q => Math.sign((B[0] - A[0]) * (q[1] - A[1]) - (B[1] - A[1]) * (q[0] - A[0]))
    const mid = [150 + 80 * Math.cos(Math.atan2(-(A[1] + B[1] - 240) / 2, (A[0] + B[0] - 300) / 2)), 120 - 80 * Math.sin(Math.atan2(-(A[1] + B[1] - 240) / 2, (A[0] + B[0] - 300) / 2))]
    if (side(P) === side(mid)) throw new Error('ARC: P is on the minor arc')
    if (it.prompt.match(/(\d+)°/)[1] !== '100' || !it.graphic.svg.includes('>100°<')) throw new Error('ARC: stated angle changed')
    return `drawn AOB ${aob.toFixed(2)}°, APB ${apb.toFixed(2)}° (key ${it.correct_answer}); P on major arc`
  },
}

function buildPlan(src) {
  const plan = {}
  { // 1
    const it = src[IQR].item
    if (!same(it.choices, ['9', '11', '16', '19']) || it.correct_answer !== '11') throw new Error('IQR: unexpected base')
    plan[IQR] = { ...it,
      choices: ['7', '11', '16', '19'],
      distractor_rationales: it.distractor_rationales.map(d => d.choice === '9' ? { ...d, choice: '7' } : d),
      explanation: 'The median is 10; the lower half is 2, 5, 7 (Q1 = 5) and the upper half is 14, 16, 21 (Q3 = 16), so IQR = 16 - 5 = 11. Distractors: 7 is the range of only the middle three values (14 - 7); 16 is Q3 alone; 19 is the full range (21 - 2).' }
  }
  { // 2
    const it = src[CAR].item
    if (it.prompt !== "What is the car's speed, in miles per hour?" || !same(it.graphic.rowLabels, ['1', '2', '3', '4'])) throw new Error('CAR: unexpected base')
    plan[CAR] = { ...it,
      prompt: "A car travels at a constant speed. The table shows the total distance the car has traveled after 1, 2, 3, and 4 hours. What is the car's speed, in miles per hour?",
      graphic: { ...it.graphic, rowLabels: ['1 hour', '2 hours', '3 hours', '4 hours'], caption: 'Total distance traveled by the car' },
      explanation: 'The car travels 52 miles in 1 hour, and every row gives the same rate: 104 ÷ 2 = 156 ÷ 3 = 208 ÷ 4 = 52. So the speed is 52 miles per hour.' }
  }
  { // 3
    const it = src[ARC].item
    if (!it.graphic.svg.includes('x2="78.7" y2="156.3"')) throw new Error('ARC: unexpected base')
    plan[ARC] = { ...it, graphic: { ...it.graphic, svg: NEW_SVG } }
  }
  const allowed = { [IQR]: ['choices', 'distractor_rationales', 'explanation'], [CAR]: ['prompt', 'graphic', 'explanation'], [ARC]: ['graphic'] }
  for (const id of IDS) {
    const from = src[id].item, to = plan[id]
    for (const k of new Set([...Object.keys(from), ...Object.keys(to)])) if (!same(from[k], to[k]) && !allowed[id].includes(k)) throw new Error(`${id}: ${k} would change`)
    if (to.correct_answer !== from.correct_answer) throw new Error(`${id}: key text changed`)
    if (!to.choices.includes(to.correct_answer) || new Set(to.choices).size !== 4) throw new Error(`${id}: bad choices`)
    const dr = to.distractor_rationales.map(d => d.choice).sort(), others = to.choices.filter(c => c !== to.correct_answer).sort()
    if (id !== ARC && !same(dr, others)) throw new Error(`${id}: rationales ${dr} vs distractors ${others}`)
  }
  return plan
}

async function rowsById(ids) {
  const { data, error } = await db.from('study_item_bank').select('*').in('id', ids)
  if (error) throw new Error(error.message)
  if (data.length !== ids.length) throw new Error(`expected ${ids.length} rows, got ${data.length}`)
  return Object.fromEntries(data.map(r => [r.id, r]))
}

if (ROLLBACK) {
  const snap = JSON.parse(readFileSync(SNAP, 'utf8'))
  for (const r of snap) {
    const { error } = await db.from('study_item_bank').update({ item: r.item }).eq('id', r.id)
    if (error) throw new Error(`${r.id}: ${error.message}`)
  }
  const back = await rowsById(snap.map(r => r.id))
  const bad = snap.filter(r => !same(back[r.id].item, r.item))
  console.log(`rolled back ${snap.length} rows from ${SNAP}; ${bad.length} mismatched after re-read`)
  process.exit(bad.length ? 1 : 0)
}

const live = await rowsById(IDS)
const haveSnap = existsSync(SNAP)
const snapRows = haveSnap ? Object.fromEntries(JSON.parse(readFileSync(SNAP, 'utf8')).map(r => [r.id, r])) : null
const base = haveSnap ? snapRows : live
const plan = buildPlan(base)
for (const id of IDS) console.log(`${id.slice(0, 8)} recompute: ${RECOMPUTE[id](plan[id])}`)

const pending = IDS.filter(id => !same(live[id].item, plan[id]))
for (const id of pending) {
  const f = base[id].item, t = plan[id]
  for (const k of Object.keys(t)) if (!same(f[k], t[k])) console.log(`\n  ${id.slice(0, 8)} ${k}\n    OLD: ${JSON.stringify(f[k]).slice(0, 400)}\n    NEW: ${JSON.stringify(t[k]).slice(0, 400)}`)
}
if (!haveSnap) {
  if (pending.length !== IDS.length) { console.error('REFUSING: no snapshot but some rows already match the plan'); process.exit(2) }
  writeFileSync(SNAP, JSON.stringify(IDS.map(id => live[id]), null, 1) + '\n')
  console.log(`\nsnapshot written: ${SNAP} (${IDS.length} full rows)`)
}
if (!WRITE) { console.log(`\nDRY RUN — ${pending.length} row(s) would change. Re-run with --write.`); process.exit(0) }

for (const id of pending) if (!same(live[id].item, snapRows?.[id]?.item ?? live[id].item)) { console.error(`REFUSING: ${id} live row no longer matches the snapshot`); process.exit(2) }
for (const id of pending) {
  const { error } = await db.from('study_item_bank').update({ item: plan[id] }).eq('id', id)
  if (error) throw new Error(`${id}: ${error.message}`)
}
const after = await rowsById(IDS)
let bad = 0
for (const id of IDS) {
  if (!same(after[id].item, plan[id])) { console.error(`MISMATCH after write: ${id}`); bad++ }
  try { console.log(`${id.slice(0, 8)} re-read recompute: ${RECOMPUTE[id](after[id].item)}`) } catch (e) { console.error(e.message); bad++ }
  console.log(`${id.slice(0, 8)} content_sha ${base[id].content_sha} -> ${after[id].content_sha}`)
}
console.log(`wrote ${pending.length}; re-read ${IDS.length}: ${bad} problem(s)`)
process.exit(bad ? 1 : 0)
