#!/usr/bin/env node
/**
 * act-math-v26-option-shapes.mjs [--selftest] <batch.json>
 *
 * Stage-0 READING LIST for act-math-v26 (ACT-MATH-V26-PREREGISTERED.md). It
 * mechanises two option-set shapes that v25's Algebra lost items to and that no
 * existing checker sees:
 *
 *   RUN   a three-term arithmetic (or geometric) run among the options that
 *         CONTAINS THE KEY at either end or in the middle. check-run-middle.mjs
 *         only reports a run whose MIDDLE is the key; AM25A-02 (3.17 / 3.65 /
 *         4.13, step 0.48, key at the END) passed it and was dropped by rule 7.
 *   GAP   two options, one of them the key, whose difference or sum equals a
 *         number printed in the stem, or twice one (a transfer of k equalises
 *         two amounts that differ by 2k). AM25A-11: 43 - 29 = 14 = 2 x 7, the
 *         gap the stem forces, read off the pair; dropped by rules 4 and 10.
 *
 * A hit is a QUESTION, not a verdict: every hit is read by hand against the
 * stem, and a confirmed stem-readable shape is a stage-0 return (ban (a) for
 * RUN, ban (e) for GAP). It prints the denominator and exits 2 when it cannot
 * score its input (fewer than one item with >= 3 numeric options).
 */
import { readFileSync } from 'node:fs'

const num = s => {
  const t = String(s).replace(/[,$%\s]/g, '').replace(/−/g, '-')
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t)
  const f = t.match(/^(-?\d+)\/(\d+)$/); if (f) return Number(f[1]) / Number(f[2])
  return null
}
const eq = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
const stemNums = p => [...String(p).replace(/(\d),(\d{3})/g, '$1$2').matchAll(/-?\d+(?:\.\d+)?/g)].map(m => Number(m[0])).filter(x => x !== 0)

export function shapes(item) {
  const vals = (item.choices || []).map(num)
  const key = num(item.correct_answer)
  const out = []
  if (key === null || vals.filter(v => v !== null).length < 3) return { scored: false, out }
  const opts = vals.map((v, i) => ({ v, s: String(item.choices[i]) })).filter(o => o.v !== null)
  // RUN: any 3 options in arithmetic (or geometric, same sign, ratio != 1) progression that include the key
  for (let a = 0; a < opts.length; a++) for (let b = a + 1; b < opts.length; b++) for (let c = b + 1; c < opts.length; c++) {
    const t = [opts[a], opts[b], opts[c]].sort((x, y) => x.v - y.v)
    if (!t.some(o => eq(o.v, key))) continue
    const ap = eq(t[1].v - t[0].v, t[2].v - t[1].v)
    const gp = t[0].v !== 0 && t[1].v !== 0 && Math.sign(t[0].v) === Math.sign(t[2].v) && eq(t[1].v / t[0].v, t[2].v / t[1].v) && !eq(t[1].v / t[0].v, 1)
    if (ap || gp) {
      const pos = eq(t[1].v, key) ? 'middle' : 'end'
      out.push(`RUN ${ap ? 'arithmetic' : 'geometric'} ${t.map(o => o.s).join(' / ')}  key at its ${pos}`)
    }
  }
  // GAP: key paired with another option, |diff| or sum equals a stem number or twice one
  const sn = stemNums(item.prompt)
  for (const o of opts) {
    if (eq(o.v, key)) continue
    for (const [lab, r] of [['difference', Math.abs(key - o.v)], ['sum', key + o.v]]) {
      for (const x of sn) {
        if (eq(r, Math.abs(x))) out.push(`GAP ${lab} key ${item.correct_answer} and ${o.s} = ${r} = stem number ${x}`)
        else if (eq(r, 2 * Math.abs(x))) out.push(`GAP ${lab} key ${item.correct_answer} and ${o.s} = ${r} = 2 x stem number ${x}`)
      }
    }
  }
  return { scored: true, out: [...new Set(out)] }
}

function selftest() {
  let bad = 0
  const t = (it, want, label) => { const r = shapes(it).out; const hit = r.some(x => x.startsWith(want)); if (!hit) { bad++; console.error(`FAIL ${label}`, r) } }
  t({ prompt: 'x/3 + y/4 = 1 and x/2 - y/5 = 1.1', choices: ['3.17', '3.65', '4.13', '3.57'], correct_answer: '3.17' }, 'RUN', 'AM25A-02 key at the end of a run')
  t({ prompt: 'If Ana gives Ben 7 of her stickers, they will have the same number. If Ben gives Ana 5 ...', choices: ['43', '29', '23', '33'], correct_answer: '43' }, 'GAP', 'AM25A-11 43-29 = 2 x 7')
  const clean = shapes({ prompt: 'A tank holds 40 liters', choices: ['12.7', '15.2', '19.9', '23.4'], correct_answer: '15.2' }).out
  if (clean.length) { bad++; console.error('FAIL clean item flagged', clean) }
  if (bad) { console.error(`SELFTEST FAILED ${bad}`); process.exit(2) }
  console.log('selftest 3/3')
}

const args = process.argv.slice(2)
if (args.includes('--selftest')) { selftest(); process.exit(0) }
selftest()
const p = args.find(a => !a.startsWith('--'))
if (!p) { console.error('usage: act-math-v26-option-shapes.mjs <batch.json>'); process.exit(2) }
const items = JSON.parse(readFileSync(p, 'utf8'))
let scored = 0, run = 0, gap = 0
for (const it of items) {
  const r = shapes(it); if (!r.scored) continue; scored++
  if (r.out.some(x => x.startsWith('RUN'))) run++
  if (r.out.some(x => x.startsWith('GAP'))) gap++
  for (const x of r.out) console.log(`  ${it.id}  ${x}`)
}
console.log(`${p.replace(/^.*\//, '')}: scored ${scored} of ${items.length}; items with a RUN through the key ${run}; items with a GAP pair on the key ${gap}  (reading list: every line read against the stem)`)
if (!scored) process.exit(2)
