#!/usr/bin/env node
/**
 * measure-hub-relations.mjs — do the relations solvers NAMED today
 * identify the key above chance, on data whose answer is already known?
 *
 * READ ONLY. Never writes to the bank. Measures; does not patch.
 *
 * ── Why this exists ──────────────────────────────────────────────────
 * On 2026-09-19 three blind solvers, given four bare numbers and no
 * stem, picked the key 3/3 on four items and NAMED the structure each
 * time:
 *
 *     -95/8 is the key, -95 is it with the /8 dropped
 *     1250 is the key, 6250 is 5 x it
 *     7/4 is the key, 7 is the un-divided numerator
 *     52 is the key, and 52 = 60 + (-8)
 *
 * `check-math-hub.mjs` printed "Numeric hub: no derivational structure
 * in any option set" for every one of those batches, correctly by its
 * own definition: its OPS list holds negate/double/halve/square/sqrt/
 * reciprocal/+-1/x10//10/complements, and NONE of the four relations
 * above is in it. So "no hub" said nothing about those items, and the
 * ledger now records that.
 *
 * ── Why this is a measurement and not a patch ────────────────────────
 * The obvious fix -- append x5, x8, /3, /4, "un-divided numerator" and
 * "sum of two others" to OPS -- is exactly what that file's own header
 * warns against: "with enough operations every number reaches every
 * other and the hub becomes whichever option has the most neighbours by
 * chance". Adding a relation that fires on half of all SOUND items does
 * not catch a tell, it manufactures one, and every item it condemns is
 * a rewrite that can introduce a new tell (REGISTER: the 730 untouched
 * SAT items, 8.0%, that a "bank-wide 64.4%" backlog entry would have
 * had us rewrite).
 *
 * So: measure the base rate on the whole live population first, against
 * a control derived from the data, and separate three known-answer
 * strata:
 *
 *   NAMED    the four items solvers named blind today  -> must fire
 *   KEPT     items that passed today's gate            -> should not
 *   LIVE     the whole live math bank                  -> base rate
 *
 * A relation set that cannot separate NAMED from KEPT is not a detector.
 * A relation set whose LIVE rate is already at its own control is
 * measuring noise.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const EPS = 1e-6
const close = (a, b) => Math.abs(a - b) <= EPS * Math.max(1, Math.abs(a), Math.abs(b))

/* Parsing is COPIED from check-math-hub.mjs on purpose, not imported:
 * this script must be able to disagree with that one. If it imported the
 * parser it would inherit any parse defect and then "confirm" it. */
function valueOf(opt) {
  const s = String(opt).replace(/−/g, '-').replace(/[$,\s]/g, '')
  const frac = s.match(/^(-?\d+)\/(\d+)$/)
  if (frac) return Number(frac[1]) / Number(frac[2])
  const nums = s.match(/-?\d+(?:\.\d+)?/g)
  if (!nums || nums.length !== 1) return null
  const n = Number(nums[0])
  return Number.isFinite(n) ? n : null
}

/** The EXISTING relation list, reproduced so both can be scored side by side. */
const BASE = [
  ['negate', x => -x], ['double', x => 2 * x], ['halve', x => x / 2],
  ['square', x => x * x], ['sqrt', x => (x >= 0 ? Math.sqrt(x) : null)],
  ['reciprocal', x => (x === 0 ? null : 1 / x)],
  ['plus one', x => x + 1], ['minus one', x => x - 1],
  ['times ten', x => 10 * x], ['over ten', x => x / 10],
  ['complement to 90', x => 90 - x], ['complement to 180', x => 180 - x],
]

/** The relations named blind today, and nothing else. */
const NAMED_OPS = [
  ['times five', x => 5 * x], ['over five', x => x / 5],
  ['times eight', x => 8 * x], ['over eight', x => x / 8],
  ['times three', x => 3 * x], ['over three', x => x / 3],
  ['times four', x => 4 * x], ['over four', x => x / 4],
]

/**
 * "Un-divided numerator": the option is the key's numerator with the
 * denominator dropped (7/4 -> 7, -95/8 -> -95). This is NOT x4 or x8 in
 * general -- it only applies when the key is a fraction in lowest terms
 * and the other option is exactly its numerator -- so it is scored from
 * the PRINTED STRINGS, not from the parsed values, and is the one
 * relation here that a value-only checker structurally cannot see.
 */
function undividedNumerator(keyStr, otherStr) {
  const f = String(keyStr).replace(/−/g, '-').replace(/[$,\s]/g, '').match(/^(-?\d+)\/(\d+)$/)
  if (!f) return false
  const o = String(otherStr).replace(/−/g, '-').replace(/[$,\s]/g, '').match(/^(-?\d+)$/)
  return !!o && Number(o[1]) === Number(f[1])
}

const reachBy = (ops, c, others) => others.filter(o => ops.some(([, f]) => {
  const v = f(c); return v !== null && Number.isFinite(v) && close(v, o)
})).length

/** Is `c` the sum of two of the others? (The 52 = 60 + (-8) shape.) */
function isSumOfTwo(c, others) {
  for (let i = 0; i < others.length; i++)
    for (let j = i + 1; j < others.length; j++)
      if (close(others[i] + others[j], c)) return true
  return false
}

/**
 * Score one item under a chosen relation family.
 *
 * `mode` picks WHAT counts as structure, so each family can be measured
 * on its own rather than as one merged blob -- a merged score cannot say
 * which relation did the work, and "which one" is the whole question.
 */
export function scoreItem(choices, key, mode) {
  if (!Array.isArray(choices) || (choices.length !== 4 && choices.length !== 5)) return null
  const vals = choices.map(valueOf)
  if (vals.some(v => v === null)) return null
  const keyIdx = choices.indexOf(key)
  if (keyIdx < 0) return null
  if (new Set(vals).size !== choices.length) return null
  const others = i => vals.filter((_, j) => j !== i)

  if (mode === 'sum') {
    /* "Is it the sum of two others" is a PROPERTY, not a reach count, so
     * the hub-reaches-two guard does not apply; the control is instead
     * how often ANY option has the property (below). */
    const flags = vals.map((c, i) => isSumOfTwo(c, others(i)))
    if (!flags.some(Boolean)) return { structured: false, credit: 0, keyIsHub: false }
    const ties = flags.filter(Boolean).length
    return { structured: true, credit: flags[keyIdx] ? 1 / ties : 0, keyIsHub: flags[keyIdx], ties }
  }
  if (mode === 'numerator') {
    const flags = vals.map((_, i) => others(i).length && choices.filter((_, j) => j !== i)
      .some(o => undividedNumerator(choices[i], o)))
    if (!flags.some(Boolean)) return { structured: false, credit: 0, keyIsHub: false }
    const ties = flags.filter(Boolean).length
    return { structured: true, credit: flags[keyIdx] ? 1 / ties : 0, keyIsHub: flags[keyIdx], ties }
  }

  if (mode === 'pair') {
    /*
     * A LONE multiplicative pair, and the key is its SOURCE (key x k is
     * present, for k in the named list).
     *
     * Split out from `named` because the self-test forced it: the 1250 /
     * 6250 set that three solvers read blind has exactly ONE relation in
     * it, so the reaches-two guard -- which exists because a single "+1"
     * neighbour wrecked v1 of the live checker -- refuses it. The guard is
     * right about "+1" between consecutive integers, which are everywhere.
     * Whether it is right about a lone "x5" is a DIFFERENT question, and
     * the only way to answer it is the base rate on the live bank: if a
     * lone multiplicative pair points at the key no better than chance
     * there, the solvers were lucky on that item and this mode must never
     * become a drop rule.
     */
    const flags = vals.map((c, i) => others(i).some(o => NAMED_OPS.some(([n, f]) =>
      !n.startsWith('over') && close(f(c), o))))
    if (!flags.some(Boolean)) return { structured: false, credit: 0, keyIsHub: false }
    const ties = flags.filter(Boolean).length
    return { structured: true, credit: flags[keyIdx] ? 1 / ties : 0, keyIsHub: flags[keyIdx], ties }
  }

  const ops = mode === 'base' ? BASE : mode === 'named' ? NAMED_OPS : [...BASE, ...NAMED_OPS]
  const counts = vals.map((c, i) => reachBy(ops, c, others(i)))
  const best = Math.max(...counts)
  /* Same guard as the live checker, and for the same reason: one
   * neighbour is coincidence, and consecutive integers are everywhere. */
  if (best < 2) return { structured: false, credit: 0, keyIsHub: false }
  const ties = counts.filter(c => c === best).length
  return { structured: true, credit: counts[keyIdx] === best ? 1 / ties : 0, keyIsHub: counts[keyIdx] === best, ties }
}

/**
 * Control, DERIVED: rotate which option is called the key and score the
 * same set again. A relation family that carries no information gives
 * back exactly 1/n per item, so the control is a property of the data
 * and of the family, never the literal 25%.
 */
function scoreSet(items, mode) {
  let n = 0, structured = 0, credit = 0, control = 0
  for (const it of items) {
    const r = scoreItem(it.choices, it.correct_answer, mode)
    if (!r) continue
    n++
    if (!r.structured) continue
    structured++
    credit += r.credit
    let c = 0
    for (const alt of it.choices) c += (scoreItem(it.choices, alt, mode)?.credit ?? 0)
    control += c / it.choices.length
  }
  return { n, structured, credit, control,
    rate: structured ? 100 * credit / structured : null,
    ctlRate: structured ? 100 * control / structured : null }
}

const fmt = (label, r) => `  ${label.padEnd(26)} scorable ${String(r.n).padStart(5)}   structured ${String(r.structured).padStart(5)}` +
  (r.structured ? `   key-is-hub ${r.rate.toFixed(1)}% vs control ${r.ctlRate.toFixed(1)}%   margin ${(r.rate - r.ctlRate >= 0 ? '+' : '') + (r.rate - r.ctlRate).toFixed(1)}pts`
                : `   NO MEASUREMENT (no structured sets)`)

// ── self-test: reproduce known answers before touching unknown data ──
if (process.argv.includes('--selftest')) {
  const cases = [
    // The four the solvers named blind today. Each MUST fire under the
    // family that names it, and these are the only positive controls
    // this script has.
    ['-95/8 with -95 (un-divided numerator)', 'numerator', true, ['-95/8', '-95', '-65/8', '-9/4'], '-95/8'],
    ['7/4 with 7 (un-divided numerator)', 'numerator', true, ['7/4', '7', '1/2', '-11/4'], '7/4'],
    /* NOT a hub under `named`, and that is the correct answer: 1250 reaches
     * 6250 and nothing else, so the reaches-two guard refuses it. Recorded
     * as an expected NEGATIVE here and as an expected POSITIVE under the
     * `pair` family below -- the disagreement between those two lines is
     * the finding, not a bug to be tuned away. */
    ['1250/6250 is ONE relation, not a hub', 'named', false, ['1250', '6250', '370', '490'], '1250'],
    ['1250 is the source of a lone x5 pair', 'pair', true, ['1250', '6250', '370', '490'], '1250'],
    ['lone pair, key is the TARGET not the source', 'pair', false, ['6250', '1250', '370', '490'], '6250'],
    ['52 = 60 + (-8)', 'sum', true, ['52', '60', '-8', '22'], '52'],
    // Negative controls: a well-built set must not fire.
    ['unrelated options, named ops', 'named', false, ['12', '13', '17', '19'], '12'],
    ['unrelated options, sum', 'sum', false, ['12', '13', '17', '19'], '12'],
    // A DISTRACTOR is the x5 hub -- the key must not be credited.
    ['distractor is the x5 hub', 'named', false, ['7', '10', '50', '250'], '7'],
    // The base family still behaves as documented.
    ['classic base hub', 'base', true, ['12', '-12', '24', '6'], '12'],
    ['single +1 neighbour is not a hub', 'base', false, ['40', '41', '58', '73'], '40'],
  ]
  let bad = 0
  for (const [name, mode, expected, choices, key] of cases) {
    const r = scoreItem(choices, key, mode)
    const got = !!r && r.keyIsHub
    if (got !== expected) bad++
    console.log(`${got === expected ? 'ok  ' : 'FAIL'}  [${mode}] ${name} -> keyIsHub=${got}`)
  }
  console.log(bad ? `\n${bad} self-test failure(s) — this detector may not be pointed at the bank` : '\nself-test clean')
  process.exit(bad ? 1 : 0)
}

// ── the measurement ──────────────────────────────────────────────────
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const live = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank').select('id,item,family,section')
    .eq('section', 'math').eq('verified', true).eq('archived', false)
    .order('id', { ascending: true }).range(f, f + 999)
  if (error) throw new Error(error.message)
  live.push(...data)
  if (data.length < 1000) break
}
const ids = new Set(live.map(r => r.id))
if (ids.size !== live.length) { console.error(`REFUSING: paging slipped (${ids.size} distinct of ${live.length})`); process.exit(2) }
const liveItems = live.map(r => r.item).filter(it => it && Array.isArray(it.choices) && it.correct_answer)
/* Stratified by family, because the one number this project has most often
 * got wrong is a population rate that was really one cohort: "SAT Math
 * derivational hub CONFIRMED bank-wide (64.4%)" was 98.3% in the authoring
 * cohort it was sampled from and 8.0% in the other 730 items. A margin that
 * survives on the whole bank but lives in one family is the same error. */
const byFamily = {}
for (const r of live) {
  if (!r.item || !Array.isArray(r.item.choices) || !r.item.correct_answer) continue
  ;(byFamily[r.family] ??= []).push(r.item)
}
if (!liveItems.length) { console.error('REFUSING: zero live items parsed'); process.exit(2) }

const files = process.argv.slice(2).filter(a => !a.startsWith('--'))
const named = []
for (const f of files) named.push(...JSON.parse(readFileSync(f, 'utf8')))

console.log(`\nLIVE population: ${live.length} verified math rows, ${liveItems.length} with a parseable option set\n`)
for (const mode of ['base', 'named', 'both', 'pair', 'sum', 'numerator']) {
  console.log(fmt(`live / ${mode}`, scoreSet(liveItems, mode)))
}
for (const mode of ['pair', 'numerator']) {
  console.log(`\n  stratified / ${mode}:`)
  for (const [fam, items] of Object.entries(byFamily).sort()) console.log(fmt(`    ${fam}`, scoreSet(items, mode)))
}
if (named.length) {
  console.log(`\nNAMED/supplied set: ${named.length} items from ${files.length} file(s)\n`)
  for (const mode of ['base', 'named', 'both', 'pair', 'sum', 'numerator']) {
    console.log(fmt(`supplied / ${mode}`, scoreSet(named, mode)))
  }
}
console.log('')
