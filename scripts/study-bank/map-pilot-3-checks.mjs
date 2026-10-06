#!/usr/bin/env node
/**
 * map-pilot-3-checks.mjs <batch.json...>   E7 (extended to Punctuation) + E9 for MAP pilot batch 3
 * map-pilot-3-checks.mjs --selftest        break-test both first
 *
 * Bars: MAP-PILOT-3-2026-10-06.prereg.md. E1-E6 are batch 1's
 * (map-pilot-checks.mjs) and E8 is batch 2's (map-pilot-2-checks.mjs); run
 * those too, unchanged. Batch 3 adds Punctuation, which no earlier gate read:
 *
 *   E7  medoid gate, as batch 2, now also over Punctuation items, with
 *       Damerau-Levenshtein on the whole option string. No option may be the
 *       UNIQUE minimum summed distance to the other three.
 *   E9  punctuation is the only thing that varies: the four options are
 *       identical once punctuation marks are removed and case is folded, are
 *       pairwise distinct, and carry a distinct `punct_rule`.
 *
 * Exit 2 on unreadable input, 1 on a failed bar.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dl } from './map-pilot-checks.mjs'
import { medoid as medoid2 } from './map-pilot-2-checks.mjs'

const stripP = s => String(s).replace(/[.,;:!?'"‘’“”()\-–—]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()

export function medoid3(it) {
  if (it.map_strand !== 'Punctuation') return medoid2(it)
  const ch = it.choices.map(String)
  const sums = ch.map((a, i) => ch.reduce((s, b, j) => s + (i === j ? 0 : dl(a, b)), 0))
  const min = Math.min(...sums), at = sums.map((s, i) => (s === min ? i : -1)).filter(i => i >= 0)
  const k = ch.indexOf(String(it.correct_answer))
  return { sums, unique: at.length === 1, uniqueIsKey: at.length === 1 && at[0] === k, keyIdx: k }
}
export function e9(it) {
  if (it.map_strand !== 'Punctuation') return null
  const errs = []
  if (new Set(it.choices.map(stripP)).size !== 1) errs.push(`options differ beyond punctuation/case (${new Set(it.choices.map(stripP)).size} distinct when stripped)`)
  if (new Set(it.choices.map(String)).size !== 4) errs.push('duplicate options')
  if (!it.punct_rule) errs.push('punct_rule missing')
  return errs
}

function selftest() {
  let fail = 0
  const expect = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fail++ }
  const g = medoid3({ map_strand: 'Punctuation', choices: ['After lunch, we left, and Sam stayed.', 'After lunch we left, and Sam stayed.', 'After lunch, we left and Sam stayed.', 'After lunch we left and Sam stayed.'], correct_answer: 'After lunch, we left, and Sam stayed.' })
  expect(g && !g.unique, `2x2 punctuation item passes E7 (sums ${g?.sums})`)
  const b = medoid3({ map_strand: 'Punctuation', choices: ['Yes, we left at noon.', 'Yes we left at noon.', 'Yes; we left at noon.', 'Yes, we left, at noon.'], correct_answer: 'Yes, we left at noon.' })
  expect(b && b.uniqueIsKey, `key-centred punctuation item (every distractor one edit from the key) FAILS E7 (sums ${b?.sums})`)
  expect(e9({ map_strand: 'Punctuation', punct_rule: 'x', choices: ['Yes, we left.', 'Yes we left.', 'Yes; we left.', 'Yes, we go.'] }).length > 0, 'E9: an option with a changed word FAILS')
  expect(e9({ map_strand: 'Punctuation', punct_rule: 'x', choices: ['Yes, we left.', 'Yes we left.', 'Yes; we left.', 'Yes: we left.'] }).length === 0, 'E9: punctuation-only variation passes')
  expect(e9({ map_strand: 'Punctuation', choices: ['Yes, we left.', 'Yes we left.', 'Yes; we left.', 'Yes: we left.'] }).some(e => /punct_rule/.test(e)), 'E9: missing punct_rule FAILS')
  const cap = medoid3({ map_strand: 'Capitalization', choices: ['We met Aunt Rosa in May.', 'We met aunt Rosa in May.', 'We met Aunt Rosa in may.', 'We met aunt Rosa in may.'], correct_answer: 'We met Aunt Rosa in May.' })
  expect(cap && !cap.unique, 'Capitalization still delegates to batch 2 E7 (2x2 passes)')
  console.log(fail ? `SELFTEST FAILED (${fail})` : 'selftest passed: E7-punctuation and E9 can fail')
  process.exit(fail ? 1 : 0)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  if (args[0] === '--selftest') selftest()
  if (!args.length) { console.error('usage: map-pilot-3-checks.mjs <batch.json...> | --selftest'); process.exit(2) }
  let failN = 0
  for (const f of args) {
    if (!existsSync(f)) { console.error(`REFUSING: ${f} missing`); process.exit(2) }
    const items = JSON.parse(readFileSync(f, 'utf8'))
    if (!Array.isArray(items) || !items.length) { console.error(`REFUSING: ${f} empty`); process.exit(2) }
    console.log(`\n== ${f.split('/').pop()}: ${items.length} items`)
    let n = 0, uniq = 0, pn = 0
    for (const it of items) {
      const m = medoid3(it)
      if (m) { n++; if (m.unique) { uniq++; failN++ } console.log(`${m.unique ? 'FAIL' : 'ok  '} E7 ${it.id} ${it.map_strand} sums ${JSON.stringify(m.sums)} key=${'ABCD'[m.keyIdx]}`) }
      const e = e9(it)
      if (e) { pn++; if (e.length) failN++; console.log(`${e.length ? 'FAIL' : 'ok  '} E9 ${it.id} ${e.join('; ')}`) }
    }
    const rules = items.filter(i => i.map_strand === 'Punctuation').map(i => i.punct_rule)
    if (rules.length && new Set(rules).size !== rules.length) { console.log('E9 FAIL punct_rule repeats'); failN++ }
    console.log(`E7 denominator ${n} scorable, unique medoid on ${uniq} (bar 0); E9 denominator ${pn} punctuation items`)
  }
  console.log(failN ? `\n${failN} failure(s)` : '\nE7 and E9 pass')
  process.exit(failN ? 1 : 0)
}
