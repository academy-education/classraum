#!/usr/bin/env node
/**
 * check-sibling-numeric-leak.mjs <batch.json> [...]
 *
 * ONE decidable defect, isolated from an instrument that failed.
 *
 * WHY. The options-only attack is INVALID for ACT Science: three solvers put
 * the SHIPPED, human-cleared live bank at 88.9% with the figure hidden, while
 * the co-founder sitting on that same population (act-science-cofounder-
 * 2026-09-18, 21 items) scored 28.6% against a 28.6% control. The model is
 * reading its own chemistry and genetics knowledge off the option values --
 * ctrlscig L003/L004 are potassium nitrate's published solubility curve and
 * L030 is Hardy-Weinberg -- not exploiting an item defect. See
 * SCIENCE-OO-RESULT.md; do not re-run that attack on this family.
 *
 * But the solvers named ONE mechanism that does not depend on knowing any
 * science: a value needed to answer item X appears in the OPTION SET or the
 * reason clause of sibling item Y in the same passage block. A candidate who
 * knows no science at all can cross-reference two option sets. That is a real,
 * student-visible leak, and unlike a semantic tell it is ARITHMETIC -- so per
 * CLAUDE.md it is checked exactly over the whole population, not sampled.
 *
 * What this does NOT claim: it says nothing about whether an item is
 * answerable from general knowledge. That is the part the instrument got
 * wrong, and it is deliberately not modelled here.
 */
import { readFileSync } from 'node:fs'

/* A numeric token, with its unit stripped. Bare integers under 10 are EXCLUDED:
 * option counts ("4 temperatures"), trial counts and small ordinals collide by
 * coincidence constantly and produced 100% false-positive blocks in the first
 * draft -- every block "leaked" because two items both said "3". */
const nums = s => {
  const out = new Set()
  for (const m of String(s).matchAll(/-?\d+(?:\.\d+)?/g)) {
    const v = Number(m[0])
    if (!Number.isFinite(v)) continue
    if (Number.isInteger(v) && Math.abs(v) < 10) continue
    out.add(v)
  }
  return out
}

export function analyse(rows) {
  const groups = {}
  for (const r of rows) (groups[r.passage_id ?? '(none)'] ??= []).push(r)
  const blocks = []
  for (const [pid, items] of Object.entries(groups)) {
    const hits = []
    for (const x of items) {
      /* Values this item's KEY depends on: the key text's own numbers. */
      const keyNums = nums(x.correct_answer)
      if (!keyNums.size) continue
      for (const y of items) {
        if (y.id === x.id) continue
        /* ...appearing in a SIBLING's distractors or stem. A sibling that
         * prints the key's value tells you that value is a real table cell. */
        const sibNums = new Set([...nums(y.prompt), ...y.choices.flatMap(c => [...nums(c)])])
        const shared = [...keyNums].filter(v => sibNums.has(v))
        if (shared.length) hits.push({ item: x.id, via: y.id, shared })
      }
    }
    blocks.push({ pid, n: items.length, hits, leaky: new Set(hits.map(h => h.item)) })
  }
  return blocks
}

const RUN_AS_CLI = process.argv[1] && process.argv[1].endsWith('check-sibling-numeric-leak.mjs')
if (RUN_AS_CLI) {
  /* SELF-TEST FIRST. A detector that cannot reproduce a known answer on known
   * data has no business being pointed at unknown data. */
  const mk = (id, pid, prompt, choices, key) => ({ id, passage_id: pid, prompt, choices, correct_answer: key })
  const clean = analyse([
    mk('a', 'p', 'Value at 20 C?', ['11.2 g', '13.8 g', '15.4 g', '17.9 g'], '13.8 g'),
    mk('b', 'p', 'Value at 40 C?', ['41.1 g', '44.6 g', '48.2 g', '52.7 g'], '44.6 g'),
  ])
  const leaky = analyse([
    mk('a', 'p', 'Value at 20 C?', ['11.2 g', '13.8 g', '15.4 g', '17.9 g'], '13.8 g'),
    mk('b', 'p', 'Difference 20 to 40 C?', ['13.8 g', '30.8 g', '44.6 g', '52.7 g'], '30.8 g'),
  ])
  const small = analyse([
    mk('a', 'p', 'How many trials?', ['2', '3', '4', '5'], '3'),
    mk('b', 'p', 'How many groups?', ['2', '3', '4', '5'], '4'),
  ])
  const fail = m => { console.error('SELF-TEST FAILED: ' + m); process.exit(2) }
  if (clean[0].leaky.size !== 0) fail('disjoint option pools flagged as leaky')
  if (leaky[0].leaky.size !== 1 || !leaky[0].leaky.has('a')) fail('a key value printed in a sibling set was not caught')
  if (small[0].leaky.size !== 0) fail('bare small integers must not count as a shared cell')

  const files = process.argv.slice(2)
  if (!files.length) { console.error('usage: check-sibling-numeric-leak.mjs <batch.json> [...]'); process.exit(2) }
  for (const f of files) {
    let rows
    try { rows = JSON.parse(readFileSync(f, 'utf8')) } catch (e) {
      console.error(`REFUSING: cannot read ${f}: ${e.message}`); process.exit(2) }
    if (!Array.isArray(rows) || !rows.length) { console.error(`REFUSING: ${f} holds zero items`); process.exit(2) }
    const blocks = analyse(rows)
    const tot = blocks.reduce((a, b) => a + b.n, 0)
    const bad = blocks.reduce((a, b) => a + b.leaky.size, 0)
    console.log('')
    console.log(f.replace(/^.*\//, '') + '  — ' + tot + ' items in ' + blocks.length + ' blocks')
    for (const b of blocks) {
      console.log('  ' + b.pid.padEnd(32) + b.n + ' items | ' + b.leaky.size + ' with a key value printed by a sibling'
        + (b.leaky.size ? '  SHIPS: NO' : '  ships: ok'))
      for (const h of b.hits.slice(0, 3)) console.log('      ' + h.item + ' <- ' + h.via + '  shares ' + h.shared.join(', '))
    }
    console.log('  TOTAL ' + bad + ' of ' + tot + ' items = ' + (100 * bad / tot).toFixed(1) + '%'
      + '   whole blocks clean: ' + blocks.filter(b => !b.leaky.size).length + ' of ' + blocks.length)
  }
  console.log('')
}
