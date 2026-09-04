#!/usr/bin/env node
/**
 * check-option-composition.mjs — is any option the SUM or the PRODUCT of
 * two other options in its own set?
 *
 * READ ONLY. Never writes to the bank.
 *
 * ── The defect ───────────────────────────────────────────────────────
 * Found 2026-09-04 in a sibling batch: the KEY was the exact product of
 * two distractors. It looked unavoidable given the probability formula
 * that generated it (p = a x b, with a and b both offered as options),
 * and it was invisible to all three existing math checkers — the
 * derivational hub only looks at one-step slips from a single option
 * (negate, double, halve, ...), never at a relation BETWEEN two others,
 * and key-magnitude only looks at rank.
 *
 * Why it matters: a solver with the stem covered can compute a+b and
 * a x b over every pair and see which option the set builds. Whether the
 * built option is the key or a distractor, it is distinguished by
 * arithmetic alone.
 *
 * ── Scoring ──────────────────────────────────────────────────────────
 * For each option c, look for an unordered pair {i, j} of OTHER options
 * with i != j and c = i + j, or c = i x j. Report per item, and report
 * separately how often the built option is the KEY — the key case is the
 * live defect; a built distractor is a weaker version of the same tell.
 *
 * There is no useful "control" rate here: this is a decidable arithmetic
 * property of the set, like the hub, so the whole population is checked
 * exactly and the target is ZERO. Sets that are not fully numeric are
 * reported as skipped, never as passes.
 *
 *   node check-option-composition.mjs --selftest
 *   node check-option-composition.mjs <batch.json>...
 */
import { readFileSync } from 'node:fs'

const RUN_AS_CLI = process.argv[1] && process.argv[1].endsWith('check-option-composition.mjs')

/** Parse an option to a number; null when it is not purely numeric.
 *  Same shapes the sandbox accepts: integers, decimals, a/b, $ and , and %. */
export function value(s) {
  const t = String(s ?? '').trim().replace(/[\s,$%]/g, '')
  if (/^-?\d+\/-?\d+$/.test(t)) { const [a, b] = t.split('/').map(Number); return b === 0 ? null : a / b }
  if (/^-?\d*\.?\d+$/.test(t)) return Number(t)
  return null
}

const EPS = 1e-9
const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)) + EPS

/**
 * Score one option set. Returns null when the set is not fully numeric
 * (skipped, NOT passed). Otherwise { hits: [...] } where each hit names
 * the built option, the operation, and the two options that build it.
 */
export function scoreItem(choices, key) {
  if (!Array.isArray(choices) || choices.length < 3) return null
  const vals = choices.map(value)
  if (vals.some(v => v === null)) return null
  const hits = []
  for (let c = 0; c < vals.length; c++) {
    for (let i = 0; i < vals.length; i++) {
      for (let j = i + 1; j < vals.length; j++) {
        if (i === c || j === c) continue
        if (close(vals[i] + vals[j], vals[c])) {
          hits.push({ built: choices[c], op: '+', a: choices[i], b: choices[j], isKey: choices[c] === key })
        }
        if (close(vals[i] * vals[j], vals[c])) {
          hits.push({ built: choices[c], op: 'x', a: choices[i], b: choices[j], isKey: choices[c] === key })
        }
      }
    }
  }
  return { hits, keyHits: hits.filter(h => h.isKey) }
}

// ── self-test ────────────────────────────────────────────────────────
// Rigged sets with a KNOWN answer. A scan that cannot fire on the sibling
// batch's actual shape (key = product of two distractors) has no business
// being pointed at a new batch.
if (RUN_AS_CLI && process.argv.includes('--selftest')) {
  let bad = 0
  const t = (name, choices, key, wantHits, wantKeyHits) => {
    const r = scoreItem(choices, key)
    const h = r ? r.hits.length : -1, k = r ? r.keyHits.length : -1
    const ok = h === wantHits && k === wantKeyHits
    if (!ok) bad++
    console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}  ->  hits=${h} (want ${wantHits})  keyHits=${k} (want ${wantKeyHits})` +
      (r && r.hits.length ? `  [${r.hits.map(x => `${x.built}=${x.a}${x.op}${x.b}${x.isKey ? ' KEY' : ''}`).join(', ')}]` : ''))
  }
  // THE RIGGED CASE — the real defect: 9/25 = 3/5 x 3/5 is not it (same option
  // twice); this is key = product of two DISTINCT distractors.
  t('RIGGED key is the product of two distractors', ['2', '5', '10', '17', '23'], '10', 1, 1)
  // key is the sum of two distractors
  // (the first draft of this fixture used 26 as the fifth option and the scan
  // reported an EXTRA hit, 26 = 7 + 19, that I had not intended — the fixture
  // was wrong, not the scan. Recorded because that is the check firing.)
  t('RIGGED key is the sum of two distractors', ['4', '7', '11', '19', '29'], '11', 1, 1)
  // a DISTRACTOR is built — weaker, still reported, keyHits 0
  t('RIGGED a distractor is the sum of two others', ['3', '8', '11', '20', '37'], '20', 1, 0)
  // clean set: no option is a sum or product of two others
  t('clean set fires nothing', ['12', '19', '35', '44', '58'], '35', 0, 0)
  // a set that must be SKIPPED, not passed
  const skipped = scoreItem(['100 - 25π', '100 - 10π', '3', '4', '5'], '3')
  const okSkip = skipped === null
  if (!okSkip) bad++
  console.log(`${okSkip ? 'ok  ' : 'FAIL'}  non-numeric set returns null (skipped, not passed)`)
  // an option repeated on both sides must NOT count: 9/25 = 3/5 x 3/5 uses one
  // option twice and is a legitimate probability set, not a composition tell.
  t('same option used twice does not count', ['9/25', '3/5', '1/2', '4/25', '12/25'], '9/25', 0, 0)
  console.log(bad ? `\n${bad} self-test(s) FAILED — do not trust this scan.`
                  : '\nself-test passed: fires on a built key, fires on a built distractor, silent on a clean set, skips non-numeric.')
  process.exit(bad ? 1 : 0)
}

if (RUN_AS_CLI) {
  const files = process.argv.slice(2).filter(a => !a.startsWith('--'))
  if (!files.length) { console.error('usage: check-option-composition.mjs [--selftest] <batch.json>...'); process.exit(1) }
  let bad = false
  for (const f of files) {
    const j = JSON.parse(readFileSync(f, 'utf8'))
    const items = Array.isArray(j) ? j : j.items
    let scored = 0, skipped = 0, withHit = 0, withKeyHit = 0
    const lines = []
    for (const it of items) {
      const r = scoreItem(it.choices, it.correct_answer)
      if (!r) { skipped++; continue }
      scored++
      if (r.hits.length) {
        withHit++
        if (r.keyHits.length) withKeyHit++
        for (const h of r.hits) lines.push(`  ${r.keyHits.length ? 'KEY  ' : 'dist '} ${it.id}: ${h.built} = ${h.a} ${h.op} ${h.b}${h.isKey ? '   <-- THE KEY IS BUILT FROM TWO DISTRACTORS' : ''}`)
      }
    }
    console.log(`${f}`)
    console.log(`  fully-numeric option sets ${scored} of ${items.length}   skipped (non-numeric) ${skipped}`)
    console.log(`  sets where some option is a sum or product of two others: ${withHit}   of which the built option is the KEY: ${withKeyHit}`)
    console.log(`  target is 0; there is no control rate — this is exact arithmetic over the whole batch, not a sample`)
    for (const l of lines) console.log(l)
    if (withHit) bad = true
  }
  process.exit(bad ? 1 : 0)
}
