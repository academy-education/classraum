#!/usr/bin/env node
/**
 * check-plurality-key.mjs <batch.json...>   |   --bank [family]   |   --selftest
 *
 * THE PLURALITY-INTERSECTION KEY.
 *
 * Found 2026-09-12 by two ACT Functions graders independently, on the same two
 * items, neither having seen the other's file:
 *
 *     y <= 9  |  y >= 11  |  y <= 22  |  y <= 11      key: y <= 11
 *     y >= 4  |  y >= 5   |  y <= 4   |  y >= 1       key: y >= 4
 *
 * Decompose each option into components. Take the COMMONEST value of each
 * component across the four options. If exactly one option carries the modal
 * value at every position, and it is the key, a solver who votes
 * component-by-component names the key without reading the stem. On those two
 * items that solver scores 2 of 2.
 *
 * WHY THIS IS WORTH BUILDING WHEN SIX OTHER PROXIES WERE REFUSED. CLAUDE.md
 * records five structural proxies that each caught their own tell and missed
 * the next, plus a sixth refused the same day it was proposed, and warns that
 * a cheap proxy for a SEMANTIC tell does not exist. This is not that. Like the
 * derivational hub, it is an exact description of a decidable property of the
 * option set -- not a stand-in for one. It says nothing about whether an item
 * is good, only that this particular arithmetic is or is not true of it.
 *
 * ITS COMPLEMENT MATTERS AS MUCH. A COMPLETE grid (each component level in
 * exactly two of four options) has no modal value anywhere and cannot fire --
 * which is why the three 2x2 items the author worried about are the SAFEST
 * shape in that batch, and why the fix is to complete a lopsided grid rather
 * than to abandon grids. Both graders said so unprompted.
 *
 * Reports which option the intersection selects, because the orientation is
 * the whole finding: an intersection landing on a DISTRACTOR actively misleads
 * a plurality-follower and is a feature.
 */
import { readFileSync } from 'node:fs'

/** Split an option into comparable components: numbers, relations, and words. */
function components(s) {
  return String(s)
    .replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/−/g, '-')
    .match(/-?\d+(?:\.\d+)?|<=|>=|!=|[<>=+\-*/^()]|[A-Za-z]+/g) ?? []
}

/** null when the set has no usable structure, so nothing is scored over noise. */
export function pluralityVerdict(choices, key) {
  const parts = choices.map(components)
  const width = parts[0]?.length
  if (!width || !parts.every(p => p.length === width)) return null   // ragged: not comparable
  const modal = []
  for (let i = 0; i < width; i++) {
    const tally = new Map()
    for (const p of parts) tally.set(p[i], (tally.get(p[i]) ?? 0) + 1)
    const top = [...tally].sort((a, b) => b[1] - a[1])
    // A tie at a position means no plurality there; that position constrains nothing.
    modal.push(top.length > 1 && top[0][1] === top[1][1] ? null : top[0][0])
  }
  if (modal.every(m => m === null)) return null        // complete grid: cannot fire
  const matches = choices.filter((_, ix) => modal.every((m, i) => m === null || parts[ix][i] === m))
  if (matches.length !== 1) return { fires: false, selects: null }
  return { fires: true, selects: matches[0], onKey: matches[0] === key }
}

function report(label, items) {
  let scorable = 0, fires = 0, onKey = 0
  const hits = []
  for (const it of items) {
    const key = it.correct_answer ?? it.item?.correct_answer
    const ch = it.choices ?? it.item?.choices
    if (!Array.isArray(ch) || ch.length < 3 || key == null) continue
    const v = pluralityVerdict(ch, key)
    if (v === null) continue
    scorable++
    if (!v.fires) continue
    fires++
    if (v.onKey) { onKey++; hits.push(it.id ?? '(unnamed)') }
  }
  if (!scorable) {
    console.log(`${label.padEnd(28)} NOT MEASURED — 0 of ${items.length} option sets are component-comparable`)
    return null
  }
  const ctl = 100 / (items[0].choices?.length ?? items[0].item?.choices?.length ?? 4)
  const rate = fires ? 100 * onKey / fires : 0
  console.log(`${label.padEnd(28)} scorable ${scorable} of ${items.length}   intersection fires on ${fires}` +
    (fires ? `   lands on the KEY ${onKey}/${fires} = ${rate.toFixed(1)}% vs ${ctl.toFixed(1)}% control` : ''))
  if (hits.length) console.log(`${' '.repeat(28)} keys named by plurality: ${hits.join(', ')}`)
  return { scorable, fires, onKey }
}

/* Only act as a CLI when invoked as one. Without this the module cannot be
 * imported -- an import ran the usage banner and exited 2, which is the same
 * "a check that cannot read its input" shape, here aimed at its own caller. */
const RUN_AS_CLI = process.argv[1] && process.argv[1].endsWith('check-plurality-key.mjs')

if (RUN_AS_CLI && process.argv.includes('--selftest')) {
  // A detector that cannot reproduce a known number on known data has no
  // business being pointed at unknown data.
  const cases = [
    { name: 'lopsided grid, key at the intersection (AM3F-06)',
      choices: ['y ≤ 9', 'y ≥ 11', 'y ≤ 22', 'y ≤ 11'], key: 'y ≤ 11', want: { fires: true, onKey: true } },
    { name: 'lopsided grid, key at the intersection (AM3F-15)',
      choices: ['y ≥ 4', 'y ≥ 5', 'y ≤ 4', 'y ≥ 1'], key: 'y ≥ 4', want: { fires: true, onKey: true } },
    // A complete grid IS measurable and correctly does NOT fire. The first
    // version of this self-test expected null here and failed; the expectation
    // was wrong, not the detector. `null` means "no usable structure";
    // `{fires:false}` means "measured, and the plurality selects no unique
    // option" — which is the protective property, and the distinction is the
    // whole reason the complement is worth reporting.
    { name: 'COMPLETE 2x2 grid — measurable, must NOT fire (AM3F-01)',
      choices: ['(4, 17)', '(4, 3)', '(-4, 3)', '(-4, 17)'], key: '(4, 3)', want: { fires: false } },
    { name: 'COMPLETE 2x2 grid — measurable, must NOT fire (AM3F-24)',
      choices: ['y = 12(1.5)^t', 'y = 12(2.25)^t', 'y = 18(1.5)^t', 'y = 18(2.25)^t'],
      key: 'y = 12(1.5)^t', want: { fires: false } },
    { name: 'intersection lands on a DISTRACTOR — fires, not on key',
      choices: ['y ≤ 9', 'y ≥ 11', 'y ≤ 22', 'y ≤ 11'], key: 'y ≥ 11', want: { fires: true, onKey: false } },
    { name: 'bare numbers, ragged — not comparable, must return null',
      choices: ['9396', '9', '7200', '31482'], key: '9396', want: null },
  ]
  let bad = 0
  for (const c of cases) {
    const got = pluralityVerdict(c.choices, c.key)
    const ok = c.want === null ? got === null
      : got !== null && got.fires === c.want.fires && (!c.want.fires || got.onKey === c.want.onKey)
    if (!ok) { bad++; console.log('FAIL  ' + c.name + '  -> ' + JSON.stringify(got)) }
    else console.log('ok    ' + c.name)
  }
  console.log(bad ? '\nSELF-TEST FAILED' : '\nself-test passed.')
  process.exit(bad ? 1 : 0)
}

const files = RUN_AS_CLI ? process.argv.slice(2).filter(a => !a.startsWith('--')) : []
if (RUN_AS_CLI && !files.length) { console.error('usage: check-plurality-key.mjs <batch.json...> | --selftest'); process.exit(2) }
let unmeasured = []
for (const f of files) {
  const j = JSON.parse(readFileSync(f, 'utf8'))
  const items = Array.isArray(j) ? j : (j.items ?? [])
  if (report(f.split('/').pop().replace('.batch.json', ''), items) === null) unmeasured.push(f)
}
if (unmeasured.length) {
  console.error(`\nNOT A PASS: ${unmeasured.length} file(s) had no component-comparable option sets — ${unmeasured.join(', ')}`)
  process.exit(2)
}
