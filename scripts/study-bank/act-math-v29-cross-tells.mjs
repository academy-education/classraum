#!/usr/bin/env node
/**
 * act-math-v29-cross-tells.mjs [--selftest] <batch.json ...>
 *
 * Stage-0 check for act-math-v29 (ACT-MATH-V29-PREREGISTERED.md), written 2026-10-10
 * before any v29 item exists. It mechanises the three CROSS-ITEM tells REGISTER §5
 * (act-math-v28, "for the next author" 3) recorded from v28's kept set. A tell that
 * repeats across items teaches a solver a rule; each is measured on live act/math
 * below, so the rule is a measured one, not a hunch.
 *
 *   CONV  options that CLOSE IN ON THE KEY: the key is the smallest or largest option
 *         and the gaps between consecutive options, walked toward the key, each shrink
 *         to <= 0.67 of the previous gap (e.g. 3.91 / 4.04 / 4.11 / 4.15). Measured on
 *         live act/math before v28 (813 scorable): of 173 option sets that close in on
 *         one end, the key sits at the closing end on 69 (39.9%) and at the far end on
 *         16 (9.2%); in v28's 40 kept, 8 of 11. "Pick the end the options close in on"
 *         is a rule. MECHANICAL RETURN (pure arithmetic on the options).
 *   WB    a wrong-base pair containing the key: the key and another option in the ratio
 *         1/(1 - p) (x and x/(1 - p)) for a percent p printed in the stem. READ against
 *         the distractor_solve body; a confirmed WB pair is a RETURN.
 *   PCT2  the /(1 - p) vs x(1 + p) wrong-percent distractor (or x(1 - p) vs /(1 + p)):
 *         the key and another option in the ratio 1/(1 - p^2). In v28's 50 frozen it
 *         sat on 10 items with the key in every flagged pair (12 of 12). READ against
 *         the distractor_solve body; AT MOST ONE confirmed item per BATCH (the merged
 *         core + promoted spares): every confirmed item after the lowest id is a RETURN.
 *
 * Ratios are tested within the display rounding of both values; a percent whose
 * factor is indistinguishable from 1 at that rounding is skipped (it would flag
 * every pair of near-equal options). Prints the denominator; exit 2 when it scores
 * nothing; exit 1 when CONV fires or more than one item carries PCT2.
 */
import { readFileSync } from 'node:fs'

const num = s => {
  const u = String(s).replace(/[,$\s%]/g, '').replace(/−/g, '-')
  if (/^-?\d+(\.\d+)?$/.test(u)) { const dec = (u.split('.')[1] || '').length; return { v: Number(u), d: 0.5 * 10 ** -dec } }
  const f = u.match(/^(-?\d+)\/(\d+)$/); if (f) return { v: Number(f[1]) / Number(f[2]), d: 1e-9 }
  return null
}
const pcts = p => [...new Set([...String(p).replace(/(\d),(\d{3})/g, '$1$2').matchAll(/(\d+(?:\.\d+)?)\s*(?:%|percent)/gi)].map(m => Number(m[1]) / 100).filter(x => x > 0 && x < 1))]

export function crossTells(it, R = 0.67) {
  const o = (it.choices || []).map(c => ({ s: String(c), ...(num(c) || {}) }))
  if (o.length !== 4 || o.some(x => x.v === undefined)) return { scored: false, out: [] }
  const k = o.find(x => x.s === String(it.correct_answer)); if (!k) return { scored: false, out: [] }
  const out = []
  // CONV
  const s = [...o].sort((a, b) => a.v - b.v), ki = s.indexOf(k)
  if (ki === 0 || ki === 3) {
    const seq = ki === 3 ? s : [...s].reverse()
    const g = seq.slice(1).map((x, i) => Math.abs(x.v - seq[i].v))
    if (g[1] <= R * g[0] && g[2] <= R * g[1]) out.push(`CONV gaps ${g.map(x => +x.toPrecision(3)).join(' > ')} close in on the key ${k.s} (${ki === 3 ? 'largest' : 'smallest'})`)
  }
  // WB / PCT2: key paired with another option
  for (const d of o) {
    if (d === k || d.v <= 0 || k.v <= 0) continue
    const [a, b] = d.v > k.v ? [k, d] : [d, k]          // a < b
    const rel = a.d / a.v + b.d / b.v
    for (const p of pcts(it.prompt)) for (const [lab, F] of [['WB', 1 / (1 - p)], ['PCT2', 1 / (1 - p * p)]]) {
      if (F - 1 <= 2 * rel) continue                       // indistinguishable from 1 at this rounding
      if (Math.abs(b.v - a.v * F) <= b.d + F * a.d + 1e-9) out.push(`${lab} p=${+(100 * p).toFixed(4)}%: ${a.s} x ${lab === 'WB' ? '1/(1-p)' : '1/(1-p^2)'} = ${b.s}; key ${k.s} is the ${a === k ? 'smaller' : 'larger'} member`)
    }
  }
  return { scored: true, out }
}

function selftest() {
  let bad = 0
  const has = (it, tag, lab) => { const r = crossTells(it).out; if (!r.some(x => x.startsWith(tag))) { bad++; console.error('FAIL', lab, r) } }
  const not = (it, lab) => { const r = crossTells(it).out; if (r.length) { bad++; console.error('FAIL clean', lab, r) } }
  has({ prompt: 'x', choices: ['3.91', '4.04', '4.11', '4.15'], correct_answer: '4.15' }, 'CONV', 'AM28N-03 closing run, key largest')
  has({ prompt: 'x', choices: ['11.82', '12.08', '12.54', '13.25'], correct_answer: '11.82' }, 'CONV', 'closing run, key smallest')
  not({ prompt: 'x', choices: ['3.91', '4.04', '4.11', '4.15'], correct_answer: '3.91' }, 'key at the FAR end is not CONV')
  not({ prompt: 'x', choices: ['10', '20', '30', '40'], correct_answer: '40' }, 'even run is not CONV (RUN is option-shapes)')
  // PCT2: key 120 = 96/(1-0.2), distractor 115.2 = 96*1.2 -> ratio 1/(1-0.04)
  has({ prompt: 'After a 20% decrease the price is $96.', choices: ['115.20', '120.00', '76.80', '80.00'], correct_answer: '120.00' }, 'PCT2', '/(1-p) vs x(1+p)')
  has({ prompt: 'After a 20% decrease the price is $96.', choices: ['96.00', '115.20', '120.00', '76.80'], correct_answer: '120.00' }, 'WB', 'x and x/(1-p) with the key the larger member')
  not({ prompt: 'A 2% fee', choices: ['24.6', '24.7', '29.1', '33.0'], correct_answer: '24.6' }, 'small p indistinguishable at rounding')
  // reproduce the v28 frozen 50 (the counts quoted in the prereg): CONV 8, WB 2, PCT2 10 items
  const v28 = JSON.parse(readFileSync(new URL('./act-math-v28.batch.json', import.meta.url), 'utf8')), c = { CONV: 0, WB: 0, PCT2: 0 }
  for (const it of v28) { const r = crossTells(it).out; for (const t in c) if (r.some(x => x.startsWith(t))) c[t]++ }
  if (v28.length !== 50 || c.CONV !== 8 || c.WB !== 2 || c.PCT2 !== 10) { bad++; console.error('FAIL v28 reproduce', v28.length, c) }
  if (bad) { console.error(`SELFTEST FAILED ${bad}`); process.exit(2) }
  console.log('selftest 8/8 (v28 frozen 50: CONV 8, WB 2, PCT2 10)')
}

const args = process.argv.slice(2)
selftest()
if (args.includes('--selftest')) process.exit(0)
const paths = args.filter(a => !a.startsWith('--'))
if (!paths.length) { console.error('usage: act-math-v29-cross-tells.mjs <batch.json ...>'); process.exit(2) }
const items = paths.flatMap(p => JSON.parse(readFileSync(p, 'utf8')))
let scored = 0; const tag = { CONV: [], WB: [], PCT2: [] }
for (const it of items) {
  const r = crossTells(it); if (!r.scored) continue; scored++
  for (const t of Object.keys(tag)) if (r.out.some(x => x.startsWith(t))) tag[t].push(it.id)
  for (const x of r.out) console.log(`  ${it.id}  ${x}`)
}
console.log(`cross-tells: scored ${scored} of ${items.length}; CONV ${tag.CONV.length} (RETURN) | WB ${tag.WB.length} (read; confirmed = RETURN) | PCT2 ${tag.PCT2.length} items (read; at most ONE confirmed per batch)`)
if (!scored) process.exit(2)
process.exit(tag.CONV.length || tag.PCT2.length > 1 ? 1 : 0)
