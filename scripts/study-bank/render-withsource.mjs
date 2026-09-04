#!/usr/bin/env node
/**
 * render-withsource.mjs — the WITH-SOURCE grader render (gate step 3).
 *
 * WHY THIS EXISTS. Both `blind` renders drop things a grader needs:
 *   - `math-bank-helper.mjs blind` drops `item.graphic` entirely, so a
 *     grader asked whether a figure item's key is uniquely correct was
 *     being shown a stem with no figure. 24 of the items in today's five
 *     maths batches carry one.
 *   - neither render says how many items it wrote, so a mis-typed path
 *     produced a plausible-looking short file.
 *
 * It refuses (exit 2) rather than returning a number when it cannot read
 * its input, per CLAUDE.md "a check that cannot read its input must not
 * return a number", and it prints the item count on stderr so the caller
 * can reconcile it against the batch before believing the render.
 *
 *   node render-withsource.mjs <batch.json> > <tag>.withsource.md
 *
 * The key is NOT marked and options stay in authored order, so a pick of
 * letter i scores against choices.indexOf(correct_answer).
 */
import { readFileSync } from 'node:fs'

const LETTERS = ['A', 'B', 'C', 'D', 'E']
const path = process.argv[2]
if (!path) { console.error('usage: render-withsource.mjs <batch.json>'); process.exit(2) }

let batch
try { batch = JSON.parse(readFileSync(path, 'utf8')) } catch (e) {
  console.error(`REFUSING: cannot read ${path}: ${e.message}`); process.exit(2)
}
if (!Array.isArray(batch) || batch.length === 0) {
  console.error(`REFUSING: ${path} is not a non-empty batch array`); process.exit(2)
}

function graphicBlock(g) {
  if (!g) return null
  if (g.type === 'svg' || g.type === 'rawsvg') return `Figure (svg, render it mentally from the markup):\n${g.svg}`
  return `Figure (${g.type}):\n${JSON.stringify(g, null, 1)}`
}

const out = []
let withGraphic = 0, withPassage = 0
for (const it of batch) {
  if (!it.id || !Array.isArray(it.choices) || !it.choices.includes(it.correct_answer)) {
    console.error(`REFUSING: item ${it.id ?? '(no id)'} has no key inside its own choices`); process.exit(2)
  }
  out.push(`### Item ${it.id}  (${it.domain} / ${it.subskill})`)
  if (it.passage) { out.push(`Passage: ${it.passage}`); withPassage++ }
  const g = graphicBlock(it.graphic)
  if (g) { out.push(g); withGraphic++ }
  out.push(`Question: ${it.prompt}`)
  it.choices.forEach((c, i) => out.push(`  (${LETTERS[i]}) ${c}`))
  out.push('')
}
process.stdout.write(out.join('\n'))
console.error(`rendered ${batch.length} items from ${path} — ${withPassage} with a passage, ${withGraphic} with a figure`)
