#!/usr/bin/env node
/**
 * Break-test for the SAT R&W paired-control elimination gate (register A23).
 * scripts/ is outside jest's testMatch, so this is the committed self-test:
 * every case is one the gate must DECIDE a particular way, including the ones
 * that must refuse. Exit 1 on any case that comes out wrong.
 *
 *   node scripts/study-bank/elimination-gate-selftest.mjs
 */
import { evaluate } from './gate.mjs'

const sha = 'x'
const ok = { passed: true, contentSha: sha, verdict: 'ok' }
const base = { shape: ok, withsource: ok, nosource: ok, tells: ok }
const elim = (o) => ({ contentSha: sha, bar: 'paired-control-v1', n: 16, controlN: 32, samples: 3, threshold: 0.2, ...o })
const cases = [
  ['margin -57 pts, recorded pass',               elim({ passed: true, candidateRate: 0, controlRate: 0.57 }),        true],
  ['margin +19 pts, recorded pass',               elim({ passed: true, candidateRate: 0.59, controlRate: 0.40 }),     true],
  ['margin +21 pts, recorded FAIL',               elim({ passed: false, candidateRate: 0.61, controlRate: 0.40 }),    false],
  ['margin +21 pts, MIS-recorded as pass',        elim({ passed: true, candidateRate: 0.61, controlRate: 0.40 }),     false],
  ['margin -10 pts, MIS-recorded as fail',        elim({ passed: false, candidateRate: 0.30, controlRate: 0.40 }),    false],
  ['control 85%: bar unreachable (ceiling)',      elim({ passed: true, candidateRate: 0.80, controlRate: 0.85 }),     false],
  ['candidate n=8: not a measurement',            elim({ passed: true, candidateRate: 0, controlRate: 0.3, n: 8 }),   false],
  ['two samples only',                            elim({ passed: true, candidateRate: 0, controlRate: 0.3, samples: 2 }), false],
  ['old zero-bar record, passed, no numbers',     { passed: true, contentSha: sha, verdict: 'zero rejectable' },     false],
  ['paired record at a different hash (stale)',   elim({ passed: true, candidateRate: 0, controlRate: 0.5, contentSha: 'y' }), false],
]
let bad = 0
for (const [name, e, want] of cases) {
  const v = evaluate('mc_hidden_source', sha, { ...base, elimination: e }, { pairedElimination: true })
  const right = v.canInsert === want
  if (!right) bad++
  console.log(`${right ? ' ok ' : 'WRONG'} ${name.padEnd(44)} canInsert=${v.canInsert}  ${[...v.failed.map(x => 'failed:' + x), ...v.missing.map(x => 'missing:' + x), ...v.stale.map(x => 'stale:' + x)].join(' ')}`)
}
// Outside SAT R&W the old behaviour is unchanged: a recorded pass counts.
const other = evaluate('mc_hidden_source', sha, { ...base, elimination: { passed: true, contentSha: sha } }, {})
if (!other.canInsert) { bad++; console.log('WRONG non-SAT family no longer accepts a recorded elimination pass') }
else console.log(' ok  non-SAT family: recorded pass still counts (unchanged)')
console.log(bad ? `\n${bad} case(s) decided wrongly` : '\nall cases decided as required')
process.exit(bad ? 1 : 0)
