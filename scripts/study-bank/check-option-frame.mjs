#!/usr/bin/env node
/**
 * check-option-frame.mjs — do the options sit in ONE FRAME with one slot
 * varied, or does each option perform a different act?
 *
 * READ ONLY. Self-tests on fixtures before it will score a file.
 *
 * ── Why ──────────────────────────────────────────────────────────────
 * CLAUDE.md's standing rule is that an item leaks when the options differ
 * along the axis the stem names: clean sets hold every option in one
 * frame so all five satisfy the stem equally and only the SOURCE
 * discriminates. On 2026-09-21 that was measured on SSAT reading and the
 * two constructions sat at opposite ends:
 *
 *   live bank    "how a crew traced an earlier spawning date to X"
 *                x5, one slot varied           -> -3.8 options-only
 *   rejected     "a girl's discovery that ..." / "a girl's revision of
 *                ..." / "a girl's decision to ..."  -> +69.3
 *
 * The rejected batch passed every per-item check, and its authors each
 * ran a passage-hidden self-test and rebuilt ~14 items. What none of that
 * caught is that the options were five different propositions, which a
 * solver ranks for plausibility without reading anything.
 *
 * This measures the property directly: the longest common prefix and
 * suffix shared by ALL options, as a fraction of their length. A one-frame
 * set shares most of its words; five different acts share almost none.
 *
 * It is a PROXY for a semantic property and is deliberately reported as a
 * distribution against a live baseline rather than as a pass/fail — five
 * structural proxies have each caught their own tell and missed the next.
 */
import { readFileSync } from 'node:fs'

const words = s => String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)

/** Fraction of each option's words that belong to the set's shared frame. */
export function frameScore(choices) {
  if (!Array.isArray(choices) || choices.length < 2) return null
  const ws = choices.map(words)
  if (ws.some(w => w.length === 0)) return null
  let pre = 0
  while (ws.every(w => pre < w.length && w[pre] === ws[0][pre])) pre++
  let suf = 0
  while (ws.every(w => suf < w.length - pre && w[w.length - 1 - suf] === ws[0][ws[0].length - 1 - suf])) suf++
  const shared = pre + suf
  const mean = ws.reduce((a, w) => a + w.length, 0) / ws.length
  return { pre, suf, shared, mean, ratio: shared / mean }
}

const RUN_AS_CLI = import.meta.url === `file://${process.argv[1]}`

if (RUN_AS_CLI && process.argv.includes('--selftest')) {
  const cases = [
    ['one frame, one slot varied (live shape)',
      ['how a crew traced an earlier spawning date to clearer pond water',
       'how a crew traced an earlier spawning date to the loss of predators',
       'how a crew traced an earlier spawning date to an early food bloom'], true],
    ['five different acts (rejected shape)',
      ["a girl's discovery that her grandmother has been hiding losses from the family",
       "a girl's revision of what she saw her grandmother doing after closing",
       "a girl's growing skill at a job she had taken on reluctantly"], false],
    ['shared suffix only',
      ['the loss of predators explains the change', 'warmer water explains the change',
       'a food bloom explains the change'], true],
    ['nothing shared at all',
      ['red', 'blue', 'green'], false],
  ]
  let bad = 0
  for (const [name, ch, expectFramed] of cases) {
    const r = frameScore(ch)
    const framed = r !== null && r.ratio >= 0.4
    if (framed !== expectFramed) bad++
    console.log(`${framed === expectFramed ? 'ok  ' : 'FAIL'}  ${name} -> ratio ${r ? r.ratio.toFixed(2) : 'null'} framed=${framed}`)
  }
  console.log(bad ? `\n${bad} self-test failure(s)` : '\nself-test clean')
  process.exit(bad ? 1 : 0)
}

const files = RUN_AS_CLI ? process.argv.slice(2).filter(a => !a.startsWith('--')) : []
if (RUN_AS_CLI && !files.length) { console.error('usage: check-option-frame.mjs <batch.json> ... | --selftest'); process.exit(2) }
for (const f of files) {
  let b
  try { b = JSON.parse(readFileSync(f, 'utf8')) } catch (e) { console.error(`REFUSING ${f}: ${e.message}`); process.exit(2) }
  if (!Array.isArray(b) || !b.length) { console.error(`REFUSING ${f}: zero items`); process.exit(2) }
  const by = {}
  let n = 0, sum = 0, framed = 0
  for (const it of b) {
    const r = frameScore(it.choices ?? [])
    if (!r) continue
    n++; sum += r.ratio; if (r.ratio >= 0.4) framed++
    const k = it.subskill ?? '?'
    ;(by[k] ??= []).push(r.ratio)
  }
  if (!n) { console.log(`${f}: NO MEASUREMENT`); continue }
  console.log(`${f.replace(/^.*\//, '')}`)
  console.log(`  ${n} items   mean frame ratio ${(sum / n).toFixed(2)}   in one frame (>=0.40): ${framed} (${(100 * framed / n).toFixed(0)}%)`)
  for (const k of Object.keys(by).sort()) {
    const v = by[k]
    console.log(`    ${k.padEnd(24)} ${v.length.toString().padStart(3)} items  mean ${(v.reduce((a, c) => a + c, 0) / v.length).toFixed(2)}`)
  }
}
