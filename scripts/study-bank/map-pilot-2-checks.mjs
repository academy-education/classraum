#!/usr/bin/env node
/**
 * map-pilot-2-checks.mjs <batch.json...>        E7 + E8 for MAP pilot batch 2
 * map-pilot-2-checks.mjs --selftest             break-test both first
 * map-pilot-2-checks.mjs --seq ABCD...          E8 on one key sequence (renders)
 *
 * E1-E6 are batch 1's, unchanged, in map-pilot-checks.mjs; run that too.
 * Bars: MAP-PILOT-2-2026-10-02.prereg.md. Exit 2 on unreadable input, 1 on a
 * failed bar.
 *
 *   E7  medoid gate. Capitalization items and correct-polarity Spelling items:
 *       each option's summed distance to the other three (case-position
 *       Hamming / Damerau-Levenshtein). NO option may be the unique minimum.
 *       Batch 1's majority-vote centroid (posthoc P2) is printed alongside.
 *   E8  key periodicity on an ordered key sequence: for lags 1-6 the rate of
 *       key[i]==key[i+lag] must be < 50%, no window of 8 may be exactly
 *       periodic at lag 2-4, and no letter may run 3+ in a row.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dl } from './map-pilot-checks.mjs'
import { centroid as majorityCentroid } from './map-pilot-posthoc.mjs'
import { rng, shuffleWith } from './seeded-shuffle.mjs'

const hamming = (a, b) => { let d = Math.abs(a.length - b.length); for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) d++; return d }

export function medoid(it) {
  const ch = it.choices.map(String)
  let dist
  if (it.map_strand === 'Capitalization') dist = hamming
  else if (it.map_strand === 'Spelling' && it.spelling_polarity === 'correct') dist = (a, b) => dl(a.toLowerCase(), b.toLowerCase())
  else return null
  const sums = ch.map((a, i) => ch.reduce((s, b, j) => s + (i === j ? 0 : dist(a, b)), 0))
  const min = Math.min(...sums)
  const at = sums.map((s, i) => (s === min ? i : -1)).filter(i => i >= 0)
  const k = ch.indexOf(String(it.correct_answer))
  return { sums, unique: at.length === 1, uniqueIsKey: at.length === 1 && at[0] === k, keyIdx: k }
}

export function periodicity(seq) {
  const s = [...seq]
  const lags = []
  for (let lag = 1; lag <= 6; lag++) {
    const n = s.length - lag; if (n < 4) continue
    let m = 0; for (let i = 0; i < n; i++) if (s[i] === s[i + lag]) m++
    lags.push({ lag, n, rate: m / n })
  }
  let run = 1, maxRun = 1
  for (let i = 1; i < s.length; i++) { run = s[i] === s[i - 1] ? run + 1 : 1; maxRun = Math.max(maxRun, run) }
  const bad = lags.filter(l => l.rate >= 0.5)
  // LOCAL cycles: any window of 8 consecutive keys exactly periodic at lag 2, 3 or 4
  // (batch 1's with-source render keyed BDACBDAC before breaking off; a whole-
  // sequence lag rate dilutes that to 30%).
  const local = []
  for (const lag of [2, 3, 4]) for (let i = 0; i + 8 <= s.length; i++) {
    let ok = true; for (let j = i; j + lag < i + 8; j++) if (s[j] !== s[j + lag]) { ok = false; break }
    if (ok) { local.push({ lag, at: i, window: s.slice(i, i + 8).join('') }); break }
  }
  return { lags, maxRun, local, fail: bad.length > 0 || local.length > 0 || maxRun >= 3, bad }
}
const fmtP = p => `lags ${p.lags.map(l => `${l.lag}:${(100 * l.rate).toFixed(0)}%`).join(' ')} maxRun ${p.maxRun}${p.local.length ? ` local-cycle ${p.local.map(l => `lag${l.lag}@${l.at}:${l.window}`).join(',')}` : ''} ${p.fail ? 'FAIL' : 'ok'}`

function selftest() {
  let fail = 0
  const expect = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fail++ }
  // E7: batch 1's own mechanics file must fail on >= 8 items
  const b1 = JSON.parse(readFileSync('scripts/study-bank/map-pilot-mech.batch.json', 'utf8'))
  const b1m = b1.map(medoid).filter(Boolean)
  const b1u = b1m.filter(m => m.unique).length
  expect(b1m.length >= 10 && b1u >= 8, `batch-1 mechanics: ${b1u} of ${b1m.length} scorable items have a unique medoid (must be >= 8, so E7 fails them)`)
  const sq = medoid({ map_strand: 'Spelling', spelling_polarity: 'correct', choices: ['occasion', 'occassion', 'ocasion', 'ocassion'], correct_answer: 'occasion' })
  expect(sq && !sq.unique, `2x2 spelling item passes E7 (sums ${sq?.sums})`)
  const cq = medoid({ map_strand: 'Capitalization', choices: ['We met Aunt Rosa in May.', 'We met aunt Rosa in May.', 'We met Aunt Rosa in may.', 'We met aunt Rosa in may.'], correct_answer: 'We met Aunt Rosa in May.' })
  expect(cq && !cq.unique, `2x2 capitalization item passes E7 (sums ${cq?.sums})`)
  const inv = medoid({ map_strand: 'Spelling', spelling_polarity: 'correct', choices: ['necessary', 'neccessary', 'necesary', 'necessery'], correct_answer: 'necessary' })
  expect(inv && inv.uniqueIsKey, `batch-1-style item (every distractor one edit from the key) is flagged (sums ${inv?.sums})`)
  // E8
  const b1ws = Object.values(JSON.parse(readFileSync('scripts/study-bank/map-pilot.ws.key.json', 'utf8'))).map(k => k.letter).join('')
  expect(periodicity(b1ws).fail, `batch-1 with-source key sequence ${b1ws} FAILS E8 (${fmtP(periodicity(b1ws))})`)
  const rr = 'ABCDABCDABCDABCD'
  expect(periodicity(rr).fail, `round-robin ABCD... FAILS E8`)
  const flat = shuffleWith('AAAAAABBBBBBCCCCCCDDDDDD'.split(''), rng(7))
  // a random flat sequence may contain a run of 3 by chance; find a seed-free assertion: test the lag part only
  const pf = periodicity(flat.join(''))
  expect(pf.bad.length === 0 && pf.local.length === 0, `seeded random flat sequence ${flat.join('')} has no periodic lag (${fmtP(pf)})`)
  expect(periodicity('AAAB CD'.replace(' ', '')).maxRun === 3, 'a run of three is counted')
  console.log(fail ? `SELFTEST FAILED (${fail})` : 'selftest passed: E7 and E8 can fail')
  process.exit(fail ? 1 : 0)
}

const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  const args = process.argv.slice(2)
  if (args[0] === '--selftest') selftest()
  else if (args[0] === '--seq') {
    const s = String(args[1] ?? '')
    if (s.length < 8 || /[^A-D]/.test(s)) { console.error('REFUSING: --seq needs >= 8 letters A-D'); process.exit(2) }
    const p = periodicity(s); console.log(`E8 ${s} ${fmtP(p)}`); process.exit(p.fail ? 1 : 0)
  } else {
    if (!args.length) { console.error('usage: map-pilot-2-checks.mjs <batch.json...> | --selftest | --seq ABCD..'); process.exit(2) }
    let failN = 0
    for (const f of args) {
      if (!existsSync(f)) { console.error(`REFUSING: ${f} missing`); process.exit(2) }
      const items = JSON.parse(readFileSync(f, 'utf8'))
      if (!Array.isArray(items) || !items.length) { console.error(`REFUSING: ${f} empty`); process.exit(2) }
      console.log(`\n== ${f.split('/').pop()}: ${items.length} items`)
      let n = 0, uniq = 0, maj = 0, majN = 0
      for (const it of items) {
        const m = medoid(it); if (!m) continue
        n++; if (m.unique) { uniq++; failN++ }
        const c = majorityCentroid(it); if (c) { majN++; if (c.keyIsCentroid) maj++ }
        console.log(`${m.unique ? 'FAIL' : 'ok  '} E7 ${it.id} ${it.map_strand} medoid sums ${JSON.stringify(m.sums)} key=${'ABCD'[m.keyIdx]}${m.unique ? (m.uniqueIsKey ? ' (unique centre IS the key)' : ' (unique centre is a distractor)') : ''}`)
      }
      if (n) console.log(`E7 denominator ${n} scorable; unique medoid on ${uniq} (bar: 0). Batch-1 majority metric: key is unique majority centroid on ${maj} of ${majN} (batch 1: 10 of 11)`)
      else console.log('E7 no scorable items in this file')
      const seq = items.map(it => 'ABCD'[it.choices.map(String).indexOf(String(it.correct_answer))]).join('')
      const p = periodicity(seq)
      console.log(`E8 authored key sequence ${seq}: ${fmtP(p)}`)
      if (p.fail) failN++
    }
    console.log(failN ? `\n${failN} failure(s)` : '\nE7 and E8 pass')
    process.exit(failN ? 1 : 0)
  }
}
