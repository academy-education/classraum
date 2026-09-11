#!/usr/bin/env node
/**
 * check-formula-options.mjs <batch.json | --live>
 *
 * THE REARRANGEMENT ITEM WHOSE OPTIONS ARE THE FORMULA.
 *
 * Found 2026-09-11 by two options-only solvers independently, on
 * act-math-v7-alg. Both picked both items CONFIDENTLY and both were right:
 *
 *     options: t = s/(2a) | t = sqrt(2s/a) | t = sqrt(s/(2a)) | t = 2s/a
 *     options: b1 = A/h + b2 | b1 = 2A/h - b2 | b1 = 2A/h + b2 | b1 = A/h - b2
 *
 * The stem is withheld and it does not matter. `s`, `a`, `t` say kinematics,
 * so s = 1/2 a t^2 and the answer is sqrt(2s/a). `A`, `h`, `b1`, `b2` say
 * trapezoid, so A = h(b1+b2)/2 and the answer is 2A/h - b2. The four options
 * form a tidy 2x2 grid, which is the shape the brief recommends — and the
 * grid is DECORATION here, because one axis is not a formatting flip but an
 * operation with a right answer.
 *
 * That is the finding worth carrying: completing a 2x2 grid protects an item
 * only when BOTH axes are arbitrary. Where one axis is "correct vs incorrect
 * algebra" over variables the reader can name, the grid hands the key over.
 *
 * WHAT THIS CHECKER CAN AND CANNOT DO — read this before quoting a number.
 *
 * It finds the SHAPE (every option is `target = expression` over a shared
 * small alphabet), which is decidable. It CANNOT decide whether a reader
 * knows the formula, which is the actual channel and is semantic. So a hit
 * is a question — "would a student recognise these letters?" — not a verdict,
 * exactly like check-run-middle's canonical-distractor-trio caveat.
 *
 * Generic letters (x, y, z as bare unknowns) are NOT a leak by this argument
 * and are the recommended fix, so they are reported separately rather than
 * counted in.
 */
import { readFileSync } from 'node:fs'

/** Letters that name a quantity on a real maths exam, rather than a bare
 *  unknown. Deliberately short: a long list would manufacture hits. */
const NAMED = new Set([
  'A', 'P', 'V', 'C', 'S', 'd', 'r', 'h', 'w', 'l', 't', 's', 'v', 'a', 'g',
  'b1', 'b2', 'n', 'm', 'F', 'T', 'R', 'I', 'E', 'k', 'p', 'q',
])
const GENERIC = new Set(['x', 'y', 'z', 'u', 'w'])

const varsOf = str => [...new Set(String(str).match(/\b[A-Za-z]\d?\b/g) ?? [])]

/** An option set is "rearrangement-shaped" when every option is
 *  `<same target> = <expression>` and the expressions share their alphabet. */
export function formulaShape(choices) {
  if (!Array.isArray(choices) || choices.length < 3) return null
  const parts = choices.map(c => String(c).split('='))
  if (!parts.every(p => p.length === 2)) return null
  const targets = [...new Set(parts.map(p => p[0].trim()))]
  if (targets.length !== 1) return null
  const target = targets[0]
  if (!/^[A-Za-z]\d?$/.test(target)) return null
  const alphabets = parts.map(p => varsOf(p[1]))
  const union = [...new Set(alphabets.flat())]
  if (union.length < 2) return null
  // Every option must draw on the same letters, or they are not four
  // rearrangements of one relation.
  if (!alphabets.every(a => a.length && a.every(v => union.includes(v)))) return null
  const named = union.filter(v => NAMED.has(v) && !GENERIC.has(v))
  const generic = union.filter(v => GENERIC.has(v))
  return { target, union, named, generic, allNamed: generic.length === 0 && named.length >= 2 }
}

function report(label, items) {
  let scorable = 0, shaped = 0, namedShaped = 0, genericShaped = 0
  const hits = []
  for (const it of items) {
    const ch = it.choices ?? it.item?.choices
    if (!Array.isArray(ch) || ch.length < 3) continue
    scorable++
    const f = formulaShape(ch)
    if (!f) continue
    shaped++
    if (f.allNamed) { namedShaped++; hits.push({ id: it.id, f }) } else genericShaped++
  }
  console.log(label)
  console.log(`  scorable ${scorable} of ${items.length}  (an item with fewer than 3 options is not scored)`)
  if (!scorable) { console.log('  NOT MEASURED — a rate over zero scorable items is not a pass.'); return { scorable: 0 } }
  console.log(`  rearrangement-shaped option sets: ${shaped}`)
  if (!shaped) { console.log('  0 — nothing to decide on. This is a zero-population line, not a pass.'); return { scorable, shaped: 0 } }
  console.log(`    ...over NAMED quantities (the exploitable shape): ${namedShaped}`)
  console.log(`    ...over generic unknowns (the recommended fix):   ${genericShaped}`)
  for (const h of hits) console.log(`      ${h.id}: ${h.f.target} = f(${h.f.named.join(', ')})`)
  console.log('  NB a hit is a QUESTION, not a verdict: it asks whether a student would')
  console.log('     recognise these letters as a standard formula. That is semantic and')
  console.log('     this checker cannot decide it. Ask it per item before repairing.')
  return { scorable, shaped, namedShaped }
}

function selftest() {
  let bad = 0
  const ok = (n, c, got) => { console.log(`${c ? 'ok   ' : 'FAIL '} ${n}${c ? '' : `  -> ${JSON.stringify(got)}`}`); if (!c) bad++ }
  // The two real items, verbatim.
  const kin = ['t = s/(2a)', 't = sqrt(2s/a)', 't = sqrt(s/(2a))', 't = 2s/a']
  const trap = ['b1 = A/h + b2', 'b1 = 2A/h - b2', 'b1 = 2A/h + b2', 'b1 = A/h - b2']
  ok('AM7-19 kinematics set is flagged', formulaShape(kin)?.allNamed === true, formulaShape(kin))
  ok('AM7-11 trapezoid set is flagged', formulaShape(trap)?.allNamed === true, formulaShape(trap))
  // The recommended fix must NOT be flagged, or the checker punishes the cure.
  ok('the same shape over generic unknowns is NOT flagged',
    formulaShape(['y = x/(2z)', 'y = sqrt(2x/z)', 'y = sqrt(x/(2z))', 'y = 2x/z'])?.allNamed === false)
  // Break it: bare values, mixed targets, and a single-variable set must all refuse.
  ok('bare numeric options are not rearrangement-shaped', formulaShape(['3', '5', '7', '9']) === null)
  ok('options with different targets are not one relation',
    formulaShape(['a = b + c', 'b = a + c', 'c = a + b', 'a = b - c']) === null)
  ok('a one-letter right-hand side is not a formula',
    formulaShape(['t = s', 't = 2s', 't = 3s', 't = 4s']) === null)
  ok('an option missing an = refuses the whole set',
    formulaShape(['t = 2s/a', 'sqrt(2s/a)', 't = s/a', 't = a/s']) === null)
  console.log(bad ? `\nSELF-TEST FAILED (${bad})` : '\nself-test passed.')
  process.exit(bad ? 1 : 0)
}

/* The CLI runs ONLY when this file is the entry point. Without this guard,
 * `import { formulaShape }` executed the usage message and exited 2, so the
 * first live measurement through it printed usage and measured nothing — a
 * script that cannot run returning something that looks like output, which is
 * the failure this whole directory is organised around. difficulty-policy.mjs
 * already carries this guard; copied from there. */
const RUN_AS_CLI = process.argv[1] && process.argv[1].endsWith('check-formula-options.mjs')
if (RUN_AS_CLI) {
  if (process.argv.includes('--selftest')) selftest()
  const arg = process.argv[2]
  if (!arg) { console.error('usage: check-formula-options.mjs <batch.json> | --selftest'); process.exit(2) }
  const batch = JSON.parse(readFileSync(arg, 'utf8'))
  if (!Array.isArray(batch) || !batch.length) { console.error(`REFUSING: ${arg} holds no items.`); process.exit(2) }
  report(arg, batch)
}
