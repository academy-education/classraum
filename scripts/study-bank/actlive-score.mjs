/**
 * Score the ACT English matched live control, BY DOMAIN.
 *
 * Three solvers independently asked for this before any scoring happened:
 * the mechanical/style strata leak by construction (the options bracket the
 * answer along tone or length, so the stem is redundant) while the rhetoric
 * strata sit at chance. A pooled mean over both is an average across two
 * populations that behave differently -- CLAUDE.md, "the split is by stratum,
 * not by batch, which is why per-batch means kept hiding it."
 *
 * CONTROL IS DERIVED, NEVER A LITERAL. Keys deal 4/4/4/3 per 15-item file, so
 * the best fixed-letter score is above 25.0%. This computes it from the actual
 * deal, per stratum, because a stratum's own deal can be more lopsided than
 * the file's.
 *
 * REFUSES rather than reporting a partial run: a rate over some of the solver
 * files is the failure this directory is organised around.
 */
import { readFileSync, existsSync } from 'node:fs'
const D = 'scripts/study-bank'
const FILES = [1, 2, 3, 4]

const missing = FILES.filter(f => !existsSync(`${D}/act-eng-live-ctl-f${f}.solver-a.json`))
if (missing.length) {
  console.error(`REFUSING: solver output missing for file(s) ${missing.join(', ')}.`)
  console.error('A rate over some of the files is not a measurement.')
  process.exit(2)
}

const rows = []
for (const f of FILES) {
  const key = JSON.parse(readFileSync(`${D}/act-eng-live-ctl-f${f}.key.json`, 'utf8'))
  const sol = JSON.parse(readFileSync(`${D}/act-eng-live-ctl-f${f}.solver-a.json`, 'utf8'))
  for (const [id, k] of Object.entries(key)) {
    const s = sol[id]
    if (!s || !s.pick) { console.error(`REFUSING: ${id} has no pick — the solver skipped an item.`); process.exit(2) }
    rows.push({ id, file: f, domain: k.domain, key: k.letter, pick: s.pick, conf: s.confidence ?? null })
  }
}
console.log(`scorable ${rows.length} picks over ${FILES.length} sibling-free files\n`)

function control(sub) {
  const c = {}; for (const r of sub) c[r.key] = (c[r.key] ?? 0) + 1
  return 100 * Math.max(...Object.values(c)) / sub.length   // best fixed letter
}
function line(label, sub) {
  if (!sub.length) { console.log(`${label.padEnd(34)} (no items)`); return }
  const ok = sub.filter(r => r.pick === r.key).length
  const rate = 100 * ok / sub.length, ctl = control(sub)
  console.log(`${label.padEnd(34)} ${String(ok).padStart(3)}/${String(sub.length).padEnd(3)} = ${rate.toFixed(1).padStart(5)}%   control ${ctl.toFixed(1).padStart(5)}%   margin ${(rate - ctl >= 0 ? '+' : '') + (rate - ctl).toFixed(1)}`)
  return { ok, n: sub.length, rate, ctl }
}

console.log('BY DOMAIN — the comparison that matters')
console.log('-'.repeat(88))
for (const d of [...new Set(rows.map(r => r.domain))].sort()) line(d, rows.filter(r => r.domain === d))
console.log('-'.repeat(88))
line('POOLED (read with caution)', rows)

console.log('\nper file, as a consistency check (one solver each):')
for (const f of FILES) line(`  file ${f}`, rows.filter(r => r.file === f))

console.log('\nv4 (the STAGED candidate, sibling-free, n=50) for comparison:')
console.log('  Conventions of Standard English   27/27 = 100.0%')
console.log('  Production of Writing             10/15 =  66.7%   (ledger also cites 76% on shipped forms)')
console.log('  Knowledge of Language               8/8 = 100.0%')
console.log('  POOLED                            45/50 =  90.0%')
console.log('\nIf a live domain lands near v4, 90.0% is the instrument LEVEL on ACT English')
console.log('and not a deviation -- the v2 error. If live is far lower, v4 really leaks.')
