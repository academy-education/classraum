#!/usr/bin/env node
/**
 * gate-verdict.mjs <tag> <need> — apply the PRE-REGISTERED drop rule to three
 * independent with-source grades plus the blind attack, and print survivors.
 *
 * The rule is from MATH-V17-PREREG-2026-09-25.md and is not edited here:
 *   1. key disputed by ANY grader
 *   2. not exclusive by MAJORITY (2 of 3)
 *   3. distractors weak by majority
 *   4. 2+ of 3 distractors fall to a free elimination, by majority
 *   5. an explanation describes a path that does not produce its printed value
 * and explicitly NOT: solved unanimously blind. After A53 measured the three
 * solvers agreeing 69-77% against ~28% under independence, unanimity is two
 * thirds of every file and cannot carry a per-item verdict. It is reported as a
 * batch RATE against the control's rate and nothing else.
 *
 * `n_struck` is taken as the MEDIAN of the three graders rather than the max.
 * The max lets one reviewer's most speculative reading drop an item on its own,
 * and the graders disagree about exactly this: on v17 Algebra one called B5's
 * overshoot argument free while another showed it needs the closing rate, which
 * is the solve. The median is the majority rule already used for exclusivity.
 */
import { readFileSync, existsSync } from 'node:fs'
const D = 'scripts/study-bank'
const [tag, needRaw] = process.argv.slice(2)
if (!tag || !needRaw) { console.error('usage: gate-verdict.mjs <tag> <need>'); process.exit(2) }
const need = Number(needRaw)

const files = ['d', 'e', 'f'].map(n => `${D}/${tag}.ws-${n}.json`)
const missing = files.filter(f => !existsSync(f))
if (missing.length) { console.error(`REFUSING: ${missing.length} grader file(s) missing: ${missing.join(', ')}. A partial panel is not a panel.`); process.exit(2) }
/* GRADER FILES COME IN TWO SHAPES AND THE SCRIPT SAYS WHICH IT GOT. Two of the
 * three SEC graders wrapped their rows under `.items` beside a `summary` block;
 * one wrote a flat id-keyed object. Read flat, this script saw five top-level
 * keys and refused - correctly, but for the wrong reason. Unwrap EXPLICITLY and
 * print it, so a wrapper is never scored as five items. */
const unwrap = (g, name) => {
  if (g && g.items && typeof g.items === 'object' && !Array.isArray(g.items)) { console.log(`note: ${name} wrapped its rows under .items; unwrapped (${Object.keys(g.items).length} rows)`); return g.items }
  /* A third shape, wic7 grader D: `.items` is an ARRAY of rows each carrying its
   * own `id`. Index it by that id and say so; a wrapper must never be scored as
   * four items. */
  if (g && Array.isArray(g.items) && g.items.every(r => r && r.id)) { console.log(`note: ${name} wrote .items as an array; indexed by row id (${g.items.length} rows)`); return Object.fromEntries(g.items.map(r => [r.id, r])) }
  return g
}
const G = files.map(f => unwrap(JSON.parse(readFileSync(f, 'utf8')), f.replace(/^.*\//, '')))
const ids = Object.keys(G[0]).sort()
for (const [i, g] of G.entries()) {
  const k = Object.keys(g).sort()
  if (k.length !== ids.length || k.some((x, j) => x !== ids[j])) {
    console.error(`REFUSING: grader ${'def'[i]} covers ${k.length} ids, not the same ${ids.length} as the first.`); process.exit(2)
  }
}
const median = xs => { const s = xs.slice().sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }

console.log(`${tag}: ${ids.length} items, ${G.length} independent graders, need ${need}\n`)
const keep = []
for (const id of ids) {
  const rows = G.map(g => g[id])
  const why = []
  const keyBad = rows.filter(r => r.key_ok === false)
  if (keyBad.length) why.push(`1: key disputed by ${keyBad.length}/3`)
  const nonExcl = rows.filter(r => r.exclusive === false)
  if (nonExcl.length >= 2) why.push(`2: ${nonExcl.length}/3 non-exclusive (${[...new Set(nonExcl.map(r => r.second_defensible))].join(' / ')})`)
  const weak = rows.filter(r => r.distractor_quality === 'weak')
  if (weak.length >= 2) why.push(`3: distractors weak by ${weak.length}/3`)
  const struck = rows.map(r => Number(r.n_struck) || 0)
  const med = median(struck)
  if (med >= 2) why.push(`4: median ${med} of 3 distractors free-strikable [${struck.join(',')}]`)
  const incoherent = rows.filter(r => r.path_coherent === false)
  if (incoherent.length) why.push(`5: explanation path wrong per ${incoherent.length}/3`)
  /* SEC-specific, from the bank-sat-rw brief: a word within four of the blank
   * that settles the item alone is a giveaway. Majority, like exclusivity;
   * the field is absent on maths grades and then never fires. */
  const resolving = rows.filter(r => r.resolving_word_after_blank && String(r.resolving_word_after_blank).toLowerCase() !== 'null')
  if (resolving.length >= 2) why.push(`6: resolving word after the blank per ${resolving.length}/3 (${[...new Set(resolving.map(r => r.resolving_word_after_blank))].join(' / ')})`)
  const diffs = rows.map(r => r.difficulty)
  const line = `${why.length ? 'DROP' : 'KEEP'}  ${id.padEnd(11)} keys ${rows.filter(r => r.key_ok === true).length}/3  struck[${struck.join(',')}]  diff[${diffs.join(',')}]  ${why.join(' | ')}`
  console.log(line)
  if (!why.length) keep.push(id)
}
const hist = {}
for (const id of keep) { const d = median(G.map(g => ({ easy: 0, medium: 1, hard: 2 })[g[id].difficulty] ?? 1)); hist[['easy','medium','hard'][d]] = (hist[['easy','medium','hard'][d]] ?? 0) + 1 }
console.log(`\nsurvivors ${keep.length} of ${ids.length}, need ${need} -> ${keep.length >= need ? 'MEETS THE BAR' : `SHORT BY ${need - keep.length}`}`)
console.log(`survivors: ${keep.join(', ')}`)
console.log(`survivor difficulty (median grade): ${JSON.stringify(hist)}`)
