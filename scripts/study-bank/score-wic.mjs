#!/usr/bin/env node
/**
 * score-wic.mjs [--selftest]
 *
 * Scores the Words in Context options-only attack. Unlike score-oo.mjs this one
 * splits THREE ways, because the file deliberately mixes strata:
 *
 *   kind   candidate (the 32 new items) vs live-control (20 shipped items)
 *   shape  word (single-word options) vs gloss (definition-phrase options)
 *   basis  mechanism (the solver named a channel) vs guess (they said so)
 *
 * The MATCHED control is kind=live-control AND shape=word -- 9 items, 27 picks.
 * Comparing the 32 single-word candidates against all 20 live items would be
 * comparing them to a different render; the gloss items average 15.7 characters
 * per option against the candidates' 8.4.
 *
 * Every rate prints its DENOMINATOR first and its 95% interval. With 27 control
 * picks the interval is about +/-17 points, so this run can refute a large leak
 * and cannot resolve a small one. That is stated, not worked around.
 *
 * --selftest runs the whole pipeline over fabricated data whose answer is known
 * by construction, and exits non-zero if it does not reproduce it.
 */
import { readFileSync, existsSync } from 'node:fs'

const D = 'scripts/study-bank'
const NAMES = ['a', 'b', 'c']

/** Wilson score interval — correct at small n, where normal approximation is not. */
function wilson(k, n, z = 1.96) {
  if (!n) return null
  const p = k / n, d = 1 + z * z / n
  const c = (p + z * z / (2 * n)) / d
  const h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
  return [100 * Math.max(0, c - h), 100 * Math.min(1, c + h)]
}

function score(key, blind, solvers) {
  const ids = Object.keys(key)
  if (!ids.length) throw new Error('key is empty')
  const widths = [...new Set(ids.map(i => Object.keys(blind[i].options).length))]
  if (widths.length !== 1) throw new Error(`mixed option widths ${widths}`)

  /* The control is DERIVED from the deal, never a literal. A hardcoded 25% on
   * five-choice data is five free points, always flattering. */
  const dealt = {}
  for (const k of Object.values(key)) dealt[k.letter] = (dealt[k.letter] ?? 0) + 1
  const bestFixed = 100 * Math.max(...Object.values(dealt)) / ids.length

  const picks = []
  for (let s = 0; s < solvers.length; s++) {
    for (const id of ids) {
      const r = solvers[s][id]
      if (!r || typeof r.pick !== 'string') throw new Error(`solver ${NAMES[s]} did not answer ${id}; a skipped item is a hole in the denominator, not a miss`)
      picks.push({ id, solver: NAMES[s], correct: r.pick.trim().toUpperCase() === key[id].letter,
        basis: r.basis === 'mechanism' ? 'mechanism' : 'guess', ...key[id] })
    }
  }
  return { ids, dealt, bestFixed, picks, width: widths[0] }
}

function band(label, rows) {
  const n = rows.length
  if (!n) { console.log(`  ${label.padEnd(34)} n=0   NOT MEASURED — a rate over zero picks is not a result.`); return null }
  const k = rows.filter(r => r.correct).length
  const ci = wilson(k, n)
  console.log(`  ${label.padEnd(34)} n=${String(n).padStart(3)}   ${String(k).padStart(3)}/${n} = ${(100 * k / n).toFixed(1)}%   95% CI ${ci[0].toFixed(1)}-${ci[1].toFixed(1)}%`)
  return { n, k, rate: 100 * k / n, ci }
}

function report(key, blind, solvers) {
  const { ids, dealt, bestFixed, picks, width } = score(key, blind, solvers)
  const chance = 100 / width
  console.log(`items ${ids.length}   solvers ${solvers.length}   picks ${picks.length}   options ${width}`)
  console.log(`key deal ${JSON.stringify(dealt)}  ->  chance ${chance.toFixed(1)}%, best-fixed-letter ${bestFixed.toFixed(1)}%`)
  console.log(`CONTROL USED: ${Math.max(chance, bestFixed).toFixed(1)}%  (the higher of the two; a solver may fix a letter)`)

  const cand = picks.filter(p => p.kind === 'candidate')
  const matched = picks.filter(p => p.kind === 'live-control' && p.shape === 'word')
  const gloss = picks.filter(p => p.kind === 'live-control' && p.shape === 'gloss')

  console.log('\nBY STRATUM  (denominator first; the margin is downstream of it)')
  const c = band('CANDIDATE (new, single-word)', cand)
  const m = band('LIVE CONTROL, matched (word)', matched)
  const g = band('live control, gloss (unmatched)', gloss)

  console.log('\nCANDIDATE BY BASIS  (a solver who says "guess" is scored apart)')
  band('candidate / mechanism named', cand.filter(p => p.basis === 'mechanism'))
  band('candidate / declared guess', cand.filter(p => p.basis === 'guess'))

  console.log('\nCANDIDATE BY BATCH')
  for (const src of [...new Set(cand.map(p => p.src))].sort()) band(src, cand.filter(p => p.src === src))

  if (c && m) {
    const overlap = !(c.ci[1] < m.ci[0] || m.ci[1] < c.ci[0])
    console.log(`\nCandidate ${c.rate.toFixed(1)}% vs MATCHED live control ${m.rate.toFixed(1)}%  ->  ${(c.rate - m.rate >= 0 ? '+' : '') + (c.rate - m.rate).toFixed(1)}pts`)
    console.log(overlap
      ? '  The two intervals OVERLAP. This run cannot separate the batch from the shipped bank.'
      : '  The intervals are DISJOINT. The batch differs from the shipped bank on this instrument.')
    if (m.n < 45) console.log(`  THIN CONTROL: ${m.n} picks. The interval is wide; a few points either way is not a result.`)
  }
  if (g && m) console.log(`\n  (free, since the solvers read them anyway) gloss ${g.rate.toFixed(1)}% vs word ${m.rate.toFixed(1)}% among SHIPPED items — a fact about the live bank, not about this batch.`)

  console.log('\nUNANIMOUS ITEMS  (§3d-bis: drop on unanimity only with a mechanism named)')
  const byId = {}
  for (const p of picks) (byId[p.id] ??= []).push(p)
  const unan = Object.entries(byId).filter(([, ps]) => ps.length === solvers.length && ps.every(p => p.correct))
  const expected = Object.values(byId).filter(ps => ps[0].kind === 'candidate').length * Math.pow(Math.max(chance, bestFixed) / 100, solvers.length)
  const unanCand = unan.filter(([, ps]) => ps[0].kind === 'candidate')
  console.log(`  candidates solved by all ${solvers.length}: ${unanCand.length}   expected under the control ${expected.toFixed(2)}`)
  for (const [id, ps] of unanCand) {
    const mech = ps.filter(p => p.basis === 'mechanism').length
    console.log(`    ${id}  ${ps[0].localId.padEnd(12)} mechanism ${mech}/${ps.length}  ${mech ? 'DROP CANDIDATE' : 'unanimity only — three coins landing the same way, do NOT drop'}`)
  }
  return { c, m, g }
}

if (process.argv.includes('--selftest')) {
  /* Known data, known answer. A detector that cannot reproduce a known number
   * on known data has no business being pointed at unknown data. */
  const mk = (n, kind, shape, off) => Object.fromEntries(Array.from({ length: n }, (_, i) =>
    [`${kind[0]}${shape[0]}-${i}`, { letter: 'ABCD'[(i + off) % 4], localId: `x${i}`, kind, src: 's', shape }]))
  const key = { ...mk(32, 'candidate', 'word', 0), ...mk(9, 'live-control', 'word', 1), ...mk(11, 'live-control', 'gloss', 2) }
  const blind = Object.fromEntries(Object.keys(key).map(id => [id, { options: { A: 'a', B: 'b', C: 'c', D: 'd' } }]))
  // Construct: candidates solved EXACTLY 50%, matched control EXACTLY 0%.
  const solvers = NAMES.map(() => Object.fromEntries(Object.entries(key).map(([id, k], i) => {
    const right = k.kind === 'candidate' ? (i % 2 === 0) : false
    const pick = right ? k.letter : 'ABCD'[('ABCD'.indexOf(k.letter) + 1) % 4]
    return [id, { pick, basis: k.kind === 'candidate' && right ? 'mechanism' : 'guess' }]
  })))
  console.log('SELF-TEST — candidates constructed at exactly 50.0%, matched control at exactly 0.0%\n')
  const { c, m } = report(key, blind, solvers)
  const fail = []
  if (Math.abs(c.rate - 50) > 0.01) fail.push(`candidate rate ${c.rate} != 50`)
  if (Math.abs(m.rate - 0) > 0.01) fail.push(`matched control ${m.rate} != 0`)
  // A missing answer must be refused, not silently scored.
  try {
    const bad = solvers.map(s => ({ ...s })); delete bad[1][Object.keys(key)[0]]
    score(key, blind, bad); fail.push('a missing answer was NOT refused')
  } catch { /* expected */ }
  // A partial solver set must be refused by the loader, tested below in main path.
  console.log(fail.length ? '\nSELF-TEST FAILED:\n  ' + fail.join('\n  ') : '\nSELF-TEST PASSED — and a missing answer was correctly refused.')
  process.exit(fail.length ? 1 : 0)
}

const keyPath = `${D}/wic-attack.key.json`
if (!existsSync(keyPath)) { console.error(`REFUSING: ${keyPath} not found.`); process.exit(2) }
const missing = NAMES.filter(n => !existsSync(`${D}/wic-attack.solver-${n}.json`))
if (missing.length) { console.error(`REFUSING: solver file(s) missing: ${missing.join(', ')}. A partial run is not a run.`); process.exit(2) }
const key = JSON.parse(readFileSync(keyPath, 'utf8'))
const blind = JSON.parse(readFileSync(`${D}/wic-attack.blind.json`, 'utf8'))
const solvers = NAMES.map(n => {
  const raw = JSON.parse(readFileSync(`${D}/wic-attack.solver-${n}.json`, 'utf8'))
  /* A previous batch's graders wrapped their output under .items and a scorer
   * silently read the wrapper. Unwrap explicitly, and say so. */
  if (raw.items && !raw[Object.keys(key)[0]]) { console.log(`note: solver ${n} wrapped its output under .items; unwrapped`); return raw.items }
  return raw
})
report(key, blind, solvers)
