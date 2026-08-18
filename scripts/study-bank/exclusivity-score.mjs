#!/usr/bin/env node
/**
 * exclusivity-score.mjs — score the exclusivity grader against the human
 * fixture, and summarise a population run.
 *
 * usage:
 *   exclusivity-score.mjs cal [--shuffle N]   confusion matrix vs the human's
 *                                            40 labels; --shuffle runs a label
 *                                            permutation test (the break-test:
 *                                            if the matrix survives shuffling
 *                                            the human labels, it is measuring
 *                                            nothing about the items)
 *   exclusivity-score.mjs pop <prefix> <keyfile>   flag rate over a population
 *
 * The human's verdicts are `unique` / `alternative` / `broken`; flag =
 * not unique. The grader's are `unique` / `contested`. Ensemble
 * thresholds 1..3 are all reported because the right one is a decision,
 * not a fact, and hiding the others would let a single number be picked
 * after seeing which flattered the instrument.
 */
import { readFileSync, existsSync } from 'node:fs'

const HERE = new URL('./', import.meta.url).pathname
const load = f => JSON.parse(readFileSync(HERE + f, 'utf8'))
const pct = (a, b) => (b ? (100 * a / b).toFixed(1) : '0.0') + '%'

function graders(prefix, letters = ['A', 'B', 'C']) {
  const out = {}
  for (const g of letters) {
    const f = `${prefix}${g}.json`
    if (!existsSync(HERE + f)) continue
    const rows = load(f)
    out[g] = new Map(rows.map(r => [r.id, r]))
  }
  return out
}

function matrix(fixture, votes, thr, keyfn = f => f.human_flag) {
  let tp = 0, fp = 0, fn = 0, tn = 0
  for (const f of fixture) {
    const flagged = (votes.get(f.id) ?? 0) >= thr
    const human = keyfn(f)
    if (flagged && human) tp++
    else if (flagged && !human) fp++
    else if (!flagged && human) fn++
    else tn++
  }
  return { tp, fp, fn, tn,
    recall: tp + fn ? tp / (tp + fn) : 0,
    falseflag: fp + tn ? fp / (fp + tn) : 0,
    precision: tp + fp ? tp / (tp + fp) : 0 }
}
const show = m => `TP ${m.tp}  FN ${m.fn}  FP ${m.fp}  TN ${m.tn}   recall ${pct(m.tp, m.tp + m.fn)}  false-flag ${pct(m.fp, m.fp + m.tn)}  precision ${pct(m.tp, m.tp + m.fp)}`

const mode = process.argv[2]

if (mode === 'cal') {
  const fixture = load('exclusivity-fixture.json')
  const gs = graders('exclusivity-cal-grader')
  const names = Object.keys(gs)
  if (!names.length) { console.error('no grader files yet'); process.exit(1) }

  console.log(`fixture ${fixture.length} items — human flags ${fixture.filter(f => f.human_flag).length} (broken ${fixture.filter(f => f.human_verdict === 'broken').length}, alternative ${fixture.filter(f => f.human_verdict === 'alternative').length})\n`)

  // INSTRUMENT VALIDATION FIRST, as in the AT-V2 pass: a grader that
  // cannot recover the key WITH the source has no standing to say a
  // second option is arguable.
  for (const g of names) {
    const rows = [...gs[g].values()]
    if (rows.length !== fixture.length) console.log(`  WARNING grader ${g} returned ${rows.length}/${fixture.length}`)
    const hit = fixture.filter(f => gs[g].get(f.id)?.best === f.grader_key_letter).length
    const con = fixture.filter(f => gs[g].get(f.id)?.verdict === 'contested').length
    console.log(`grader ${g}: best==key ${hit}/${fixture.length} (${pct(hit, fixture.length)})   contested ${con}/${fixture.length} (${pct(con, fixture.length)})`)
  }
  console.log()
  for (const g of names) {
    const votes = new Map(fixture.map(f => [f.id, gs[g].get(f.id)?.verdict === 'contested' ? 1 : 0]))
    console.log(`grader ${g} alone       ${show(matrix(fixture, votes, 1))}`)
  }
  console.log()
  const votes = new Map(fixture.map(f => [f.id, names.filter(g => gs[g].get(f.id)?.verdict === 'contested').length]))
  for (const thr of [1, 2, 3]) {
    console.log(`ensemble >=${thr}/${names.length}      ${show(matrix(fixture, votes, thr))}`)
  }
  console.log()
  for (const thr of [1, 2, 3]) {
    for (const sp of ['dev', 'holdout']) {
      const sub = fixture.filter(f => f.split === sp)
      console.log(`  >=${thr}  ${sp.padEnd(8)} ${show(matrix(sub, votes, thr))}`)
    }
  }
  console.log(`\nseverity: human "broken" only (n=${fixture.filter(f => f.human_verdict === 'broken').length})`)
  for (const thr of [1, 2, 3]) {
    const m = matrix(fixture, votes, thr, f => f.human_verdict === 'broken')
    console.log(`  >=${thr}  ${show(m)}`)
  }

  /* Does the grader name the SAME option the human named? A flag that
   * lands on the right item for the wrong reason is a coincidence. */
  const named = fixture.filter(f => f.human_flag && f.note_options_decoded.length)
  let agree = 0, considered = 0
  for (const f of named) {
    // The human's note names HIS letters; note_options_decoded is that
    // note decoded through shown_order to option TEXT. The grader's
    // letters are a third, independent permutation, so both sides are
    // compared as text and never as letters.
    const rivalTexts = new Set(names.flatMap(g => gs[g].get(f.id)?.defensible ?? [])
      .filter(x => x !== f.grader_key_letter).map(x => f.presentation[x]).filter(Boolean))
    // his note may name the key itself (e.g. "C is not uniquely justified")
    const hisRivals = f.note_options_decoded.filter(t => t !== f.correct_answer)
    if (!hisRivals.length) continue
    considered++
    if (hisRivals.some(t => rivalTexts.has(t))) agree++
  }
  if (considered) console.log(`\noption-level agreement on the human's named rival options: ${agree}/${considered} flagged items where he named a specific rival`)

  const N = Number((process.argv.find(a => a.startsWith('--shuffle')) || '').split('=')[1] || (process.argv.includes('--shuffle') ? 2000 : 0))
  if (N) {
    // BREAK-TEST: permute the human labels. If the observed recall is not
    // rare under permutation, the matrix is describing rates, not items.
    const thr = 1
    const obs = matrix(fixture, votes, thr).tp
    const labels = fixture.map(f => f.human_flag)
    let ge = 0
    for (let i = 0; i < N; i++) {
      const p = [...labels]
      for (let j = p.length - 1; j > 0; j--) { const k = Math.floor(Math.random() * (j + 1)); [p[j], p[k]] = [p[k], p[j]] }
      const m = matrix(fixture.map((f, ix) => ({ ...f, human_flag: p[ix] })), votes, thr)
      if (m.tp >= obs) ge++
    }
    console.log(`\npermutation break-test (>=1 threshold, ${N} shuffles): observed TP ${obs}, P(TP >= obs | labels shuffled) = ${(ge / N).toFixed(4)}`)
  }
} else if (mode === 'pop') {
  const prefix = process.argv[3]
  const keyfile = process.argv[4]
  const key = load(keyfile)
  const gs = graders(prefix)
  const names = Object.keys(gs)
  const ids = Object.keys(key)
  console.log(`population ${ids.length} items, graders ${names.join('/')}`)
  for (const g of names) {
    const seen = ids.filter(id => gs[g].has(id))
    const hit = seen.filter(id => gs[g].get(id).best === key[id].key_letter).length
    const con = seen.filter(id => gs[g].get(id).verdict === 'contested').length
    console.log(`  grader ${g}: graded ${seen.length}/${ids.length}   best==key ${hit}/${seen.length} (${pct(hit, seen.length)})   contested ${pct(con, seen.length)}`)
  }
  const votes = new Map(ids.map(id => [id, names.filter(g => gs[g].get(id)?.verdict === 'contested').length]))
  const missing = ids.filter(id => names.some(g => !gs[g].has(id)))
  if (missing.length) console.log(`  WARNING ${missing.length} items missing from at least one grader`)
  for (const thr of [1, 2, 3].slice(0, names.length)) {
    const n = ids.filter(id => votes.get(id) >= thr).length
    console.log(`  flag rate >=${thr}/${names.length}: ${n}/${ids.length} = ${pct(n, ids.length)}`)
  }
  const thr = Number(process.argv[5] || 1)
  const flagged = ids.filter(id => votes.get(id) >= thr)
  console.log(`\nflagged at >=${thr}: ${flagged.length}`)
  for (const id of flagged) {
    const who = names.filter(g => gs[g].get(id)?.verdict === 'contested')
    console.log(`  ${id}  ${who.join('')}  ${key[id].item_id || key[id].lecture || ''}`)
  }
} else {
  console.error('usage: exclusivity-score.mjs cal [--shuffle=N] | pop <graderPrefix> <keyfile> [thr]')
  process.exit(1)
}
