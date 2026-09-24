#!/usr/bin/env node
/**
 * check-cloze-batch.mjs <batch.json ...>
 *
 * BATCH-LEVEL checks for blank-completion items, run by the GATE rather than
 * asked of the author.
 *
 * WHY IT MOVED OFF THE AUTHOR. On 2026-09-24 a Words-in-Context batch shipped
 * 0 of 16, four days after the same commission shipped 7 of 20. The failure was
 * in option construction -- ten of sixteen sets graded "weak" -- and the cause
 * was the brief: it had been loaded with batch-level rules after the previous
 * round showed a relation cluster, and the author satisfied every one of them
 * with nothing left for the options.
 *
 * A brief's constraints compete for the author's attention. So the constraints
 * that can be MEASURED are measured here, and the brief keeps only the ones
 * that need judgement.
 *
 * WHAT THIS FILE MEASURES, AND THE ONE CLAIM IT REFUTED.
 *
 * A grader reported that "eleven of sixteen passages end on the same detached
 * summary sentence" and called it a cross-item template a solver could learn.
 * It sounded right and it is the kind of thing nothing here checks, so this
 * file was written to catch it. IT DOES NOT REPRODUCE. Two independent
 * abstractions were tried:
 *
 *   masked 3-word window before the blank   v4: 2 of 16 on the commonest shape
 *   length of the sentence holding the blank   v4: 6 of 16 short;  v3: 5 of 10
 *
 * On the second measure the SUCCESSFUL batch (v3, 7 shipped) is at 50% and the
 * failed one (v4, 0 shipped) at 38% -- the claimed tell runs the wrong way. And
 * the blank sits at the very end of the passage in 100% of BOTH batches, so
 * that uniformity is a convention of the subskill rather than a defect.
 *
 * Recorded here rather than deleted, because this is the seventh structural
 * proxy this directory has tried and the first one refuted BEFORE it was used
 * to drop anything. A confident, specific, plausible observation from a good
 * grader is still a hypothesis.
 *
 * The measures below that DO mean something are cheap and are kept as
 * pre-flight only: recycled option words across items (real author filler, and
 * discountable on sight by a solver), and the key being the longest option at
 * above chance. The closing-shape line is printed as description, never as a
 * verdict.
 */
import { readFileSync } from 'node:fs'

const words = s => String(s).toLowerCase().match(/[a-z']+/g) || []

export function analyse(items) {
  const n = items.length
  /* 1. closing shape: the 3 words before the blank, with content words masked */
  const shapes = {}
  for (const x of items) {
    const p = String(x.passage || '')
    const i = p.indexOf('______')
    if (i < 0) continue
    const before = words(p.slice(Math.max(0, i - 60), i)).slice(-3)
    const shape = before.map(w => /^(is|are|was|were|be|been|its|the|a|an|of|to|not|but|it|they)$/.test(w) ? w : '*').join(' ')
    shapes[shape] = (shapes[shape] || 0) + 1
  }
  const topShape = Object.entries(shapes).sort((a, b) => b[1] - a[1])[0] || ['', 0]

  /* 2. option words reused across items */
  const seen = {}
  for (const x of items) for (const o of (x.choices || [])) {
    const k = String(o).toLowerCase().trim()
    ;(seen[k] ??= []).push(x.id)
  }
  const recycled = Object.entries(seen).filter(([, v]) => v.length > 1)

  /* 3. key is the longest option */
  let longest = 0
  for (const x of items) {
    const L = (x.choices || []).map(c => String(c).length)
    const m = Math.max(...L)
    if (L.filter(v => v === m).length === 1 && String(x.choices[L.indexOf(m)]) === String(x.correct_answer)) longest++
  }

  /* 4. blank position: fraction of the passage before the blank */
  const pos = items.map(x => {
    const p = String(x.passage || ''); const i = p.indexOf('______')
    return i < 0 ? null : i / p.length
  }).filter(v => v !== null)
  const atEnd = pos.filter(v => v > 0.88).length

  return { n, topShape, shapes, recycled, longest, atEnd }
}

const RUN_AS_CLI = process.argv[1] && process.argv[1].endsWith('check-cloze-batch.mjs')
if (RUN_AS_CLI) {
  const fail = m => { console.error('SELF-TEST FAILED: ' + m); process.exit(2) }
  const mk = (id, passage, choices, key) => ({ id, passage, choices, correct_answer: key })
  const rigged = analyse([
    mk('a', 'Some argument here. The record is ______.', ['w', 'x', 'y', 'z'], 'w'),
    mk('b', 'Another argument. The finding is ______.', ['w2', 'x2', 'y2', 'z2'], 'w2'),
    mk('c', 'A third one. The result is ______.', ['w3', 'x3', 'y3', 'z3'], 'w3'),
  ])
  if (rigged.topShape[1] !== 3) fail(`a repeated closing shape should count 3, got ${rigged.topShape[1]}`)
  const varied = analyse([
    mk('a', 'The ______ of the record was never in doubt, whatever else changed.', ['w', 'x', 'y', 'z'], 'w'),
    mk('b', 'Readers ______ the claim, and the argument moved on without them.', ['p', 'q', 'r', 's'], 'p'),
  ])
  if (varied.topShape[1] > 1) fail('varied closings must not collapse to one shape')
  const rec = analyse([mk('a', 'x ______.', ['same', 'b', 'c', 'd'], 'b'), mk('b', 'y ______.', ['same', 'e', 'f', 'g'], 'e')])
  if (rec.recycled.length !== 1) fail('a recycled option word must be reported')
  console.log('self-test: 3 fixtures pass (repeated shape, varied shape, recycled word)\n')

  const files = process.argv.slice(2)
  if (!files.length) { console.error('usage: check-cloze-batch.mjs <batch.json ...>'); process.exit(2) }
  let bad = false
  for (const f of files) {
    let a; try { a = JSON.parse(readFileSync(f, 'utf8')) } catch (e) { console.error(`REFUSING: cannot read ${f}: ${e.message}`); process.exit(2) }
    if (!Array.isArray(a) || !a.length) { console.error(`REFUSING: ${f} holds zero items`); process.exit(2) }
    const r = analyse(a)
    const pc = v => (100 * v / r.n).toFixed(1) + '%'
    console.log('\n' + f.replace(/^.*\//, '') + `  (${r.n} items)`)
    console.log(`  commonest closing shape   "${r.topShape[0]}"  on ${r.topShape[1]} of ${r.n} = ${pc(r.topShape[1])}   (descriptive only - refuted as a tell, see header)`)
    console.log(`  distinct closing shapes   ${Object.keys(r.shapes).length}`)
    console.log(`  option words recycled     ${r.recycled.length}` + (r.recycled.length ? '  -> ' + r.recycled.slice(0, 5).map(([w, v]) => `${w} x${v.length}`).join(', ') : ''))
    console.log(`  key is longest option     ${r.longest} of ${r.n} = ${pc(r.longest)}   (chance 25%)`)
    console.log(`  blank at the very end     ${r.atEnd} of ${r.n} = ${pc(r.atEnd)}`)
    /* The closing-shape line does NOT gate -- see the header; it was refuted. */
    if (r.recycled.length > 2 || r.longest / r.n > 0.45) bad = true
  }
  console.log('')
  process.exitCode = bad ? 1 : 0
}
