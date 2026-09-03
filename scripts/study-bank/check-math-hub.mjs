#!/usr/bin/env node
/**
 * check-math-hub.mjs — is the key the derivational centre of its own
 * option set?
 *
 * READ ONLY. Never writes to the bank.
 *
 * ── The defect ───────────────────────────────────────────────────────
 * SAT Math distractors were generated FROM the key by an invertible
 * slip — negate it, halve it, square it, go off by one. Do that three
 * times and the key becomes the unique point every other option can be
 * derived from. A solver never needs the stem: compute which option the
 * others orbit, pick it.
 *
 * Measured at 64.4% hub-is-key against a 27.5% control on a sample.
 * 90 items were repaired (apply-math-hub-repair.mjs) and re-measured at
 * 23.6%, i.e. chance. 730 live items were never touched.
 *
 * ── Why this is a script and not a model ─────────────────────────────
 * Every other tell in this project needed a model to see it, because it
 * was semantic. This one is arithmetic: "is B = -A, or 2A, or A²" is
 * decidable. So the whole 730 can be measured exactly, for free, and
 * only the items that actually carry the defect need repairing — rather
 * than rewriting 730 option sets on the strength of a sample.
 *
 * ── How it scores ────────────────────────────────────────────────────
 * For each option c, count how many of the other three are reachable
 * from c by one operation in OPS. The hub is the option with the most.
 * An item scores 1/k when the key is among k tied hubs, 0 otherwise.
 *
 * Under that rule a randomly-placed key scores exactly 25.0%: if k of
 * the four options tie for hub, the key lands in that set with
 * probability k/4 and earns 1/k, so the expectation is 1/4 regardless
 * of k. The control is therefore 25.0% by construction, not measured —
 * which is what makes the comparison safe. (The 27.5% in the earlier
 * write-up came from a different credit rule; the two numbers are not
 * interchangeable and this one states its own.)
 *
 * ── Validation ───────────────────────────────────────────────────────
 * `--validate` runs the detector over the 90 ALREADY-REPAIRED items,
 * whose score is independently known to be ~23.6%. A detector that
 * cannot reproduce a known number on known data has no business being
 * pointed at the other 730.
 *
 * usage:
 *   node check-math-hub.mjs --selftest    # no DB
 *   node check-math-hub.mjs --validate    # score the 90 repaired items
 *   node check-math-hub.mjs [domain]      # score the unrepaired bank
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const MATH_DOMAINS = [
  'Algebra', 'Advanced Math',
  'Geometry and Trigonometry', 'Problem-Solving and Data Analysis',
]

/**
 * Pull ONE number out of an option.
 *
 * Options look like "12", "x = 12", "-3/4", "$1,250", "12.5%". Anything
 * carrying two independent numbers (a coordinate pair, an interval) is
 * returned as null and the item is skipped rather than guessed at — a
 * wrong parse here invents a derivation that is not there, and this
 * script's entire output is derivations.
 */
function valueOf(opt) {
  const s = String(opt).replace(/[$,\s]/g, '')
  const frac = s.match(/^(-?\d+)\/(\d+)$/)
  if (frac) return Number(frac[1]) / Number(frac[2])
  const nums = s.match(/-?\d+(?:\.\d+)?/g)
  if (!nums || nums.length !== 1) return null
  const n = Number(nums[0])
  return Number.isFinite(n) ? n : null
}

const EPS = 1e-6
const close = (a, b) => Math.abs(a - b) <= EPS * Math.max(1, Math.abs(a), Math.abs(b))

/**
 * The slips a distractor-from-key generator actually makes.
 *
 * Deliberately NOT a general "is there any relation" search: with enough
 * operations every number reaches every other and the hub becomes
 * whichever option has the most neighbours by chance. Each entry here is
 * an error a student could plausibly make, which is what the original
 * generator was imitating.
 */
const OPS = [
  ['negate', x => -x],
  ['double', x => 2 * x],
  ['halve', x => x / 2],
  ['square', x => x * x],
  ['sqrt', x => (x >= 0 ? Math.sqrt(x) : null)],
  ['reciprocal', x => (x === 0 ? null : 1 / x)],
  ['plus one', x => x + 1],
  ['minus one', x => x - 1],
  ['times ten', x => 10 * x],
  ['over ten', x => x / 10],
  ['complement to 90', x => 90 - x],
  ['complement to 180', x => 180 - x],
]

/** How many of `others` are reachable from `c` by one op. */
function reach(c, others) {
  const hits = []
  for (const o of others) {
    for (const [name, f] of OPS) {
      const v = f(c)
      if (v !== null && Number.isFinite(v) && close(v, o)) { hits.push({ o, name }); break }
    }
  }
  return hits
}

/**
 * Score ONE item. Returns null when the item cannot be judged — no
 * four options, or an option this parser will not commit to.
 */
export function scoreItem(choices, key) {
  if (!Array.isArray(choices) || choices.length !== 4) return null
  const vals = choices.map(valueOf)
  if (vals.some(v => v === null)) return null
  const keyIdx = choices.indexOf(key)
  if (keyIdx < 0) return null
  // Distinct values only: a duplicated option makes "reachable" trivial.
  if (new Set(vals).size !== 4) return null

  const counts = vals.map((c, i) => reach(c, vals.filter((_, j) => j !== i)).length)
  const best = Math.max(...counts)

  /*
   * A hub must reach at least TWO of the other three.
   *
   * best === 1 is not a derivational structure, it is arithmetic
   * coincidence, and it wrecked the first version of this detector:
   * the fixture 12/13/17/19 scored as a hub purely because 12 + 1 = 13,
   * and the same false hit put the already-repaired items at 34.7%
   * when their known score is 23.6%. Consecutive integers are common
   * in option sets and "+1" is in OPS for good reason, so the guard
   * belongs here rather than in the operation list.
   *
   * Items with no hub are reported separately (see `structured`) rather
   * than scored as passes — the question "is the key the centre" simply
   * does not apply to a set that has no centre.
   */
  if (best < 2) return { credit: 0, best, ties: 0, keyIsHub: false, structured: false }

  const ties = counts.filter(c => c === best).length
  const keyIsHub = counts[keyIdx] === best
  return {
    credit: keyIsHub ? 1 / ties : 0,
    structured: true,
    best, ties, keyIsHub,
    detail: keyIsHub ? reach(vals[keyIdx], vals.filter((_, j) => j !== keyIdx)) : [],
  }
}

// ── self-test ────────────────────────────────────────────────────────
if (process.argv.includes('--selftest')) {
  const cases = [
    // The defect, exactly: every distractor is one slip off the key.
    ['classic hub: -12, 24, 6 around 12', true, ['12', '-12', '24', '6'], '12'],
    ['hub with a squared distractor', true, ['5', '-5', '25', '10'], '5'],
    // A DISTRACTOR is the hub. Must not credit the key.
    ['a distractor is the hub', false, ['7', '10', '-10', '20'], '7'],
    // No derivation anywhere — a well-built set.
    ['unrelated options', false, ['12', '13', '17', '19'], '12'],
    // The exact false positive that broke v1 and put the repaired items
    // at 34.7% instead of 23.6%: one +1 neighbour is coincidence.
    ['single +1 neighbour is not a hub', false, ['40', '41', '58', '73'], '40'],
  ]
  let bad = 0
  for (const [name, expected, choices, key] of cases) {
    const r = scoreItem(choices, key)
    const got = !!r && r.keyIsHub
    const ok = got === expected
    if (!ok) bad++
    console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}  ->  keyIsHub=${got}${r ? ` credit=${r.credit.toFixed(2)} best=${r.best} ties=${r.ties}` : ' (unscorable)'}`)
  }
  // The control must be 25.0% by construction: rotate which option is
  // the key across a hub item and the credits must sum to exactly 1.
  const rotate = ['12', '-12', '24', '6']
  const total = rotate.reduce((s, k) => s + (scoreItem(rotate, k)?.credit ?? 0), 0)
  const ok = Math.abs(total - 1) < 1e-9
  if (!ok) bad++
  console.log(`${ok ? 'ok  ' : 'FAIL'}  credits over all four key positions sum to ${total.toFixed(4)} (must be 1.0000, i.e. a 25% control)`)

  console.log(bad ? `\n${bad} self-test(s) FAILED — do not trust this detector.`
                  : '\nself-test passed: finds the hub, refuses to credit a non-hub key, control is 25.0% by construction.')
  process.exit(bad ? 1 : 0)
}

// ── live ─────────────────────────────────────────────────────────────
const validate = process.argv.includes('--validate')
const onlyDomain = process.argv.slice(2).find(a => !a.startsWith('--')) ?? null

/*
 * BATCH MODE (added 2026-09-04). A batch path used to be refused outright,
 * because the positional argument is a DOMAIN filter and a path matched zero
 * rows while still printing a number. The refusal pointed at
 * check-symbolic-hub.mjs — but that script's token metric treats every pair
 * of bare numbers ("5" vs "3") as one edit, so a purely numeric option set
 * comes back as a four-way tie at exactly the 25% control and carries no
 * information. The numeric OPS here are the instrument for those sets, so
 * this mode scores the file with the SAME scoring rule as the live path and
 * refuses to print a rate when nothing was scorable.
 */
if (process.argv.slice(2).some(a => a.endsWith('.json'))) {
  const files = process.argv.slice(2).filter(a => a.endsWith('.json'))
  let bad = false
  for (const f of files) {
    const rows = JSON.parse(readFileSync(f, 'utf8'))
    let structured = 0, unscorable = 0, credit = 0
    const hubs = []
    for (const it of rows) {
      const s = scoreItem(it.choices, it.correct_answer)
      if (!s) { unscorable++; continue }
      if (!s.structured) continue
      structured++; credit += s.credit
      if (s.keyIsHub) hubs.push(`${it.id} (deg ${s.best}, ties ${s.ties})`)
    }
    const noStructure = rows.length - structured - unscorable
    if (structured === 0) {
      console.error(`${f}: 0 of ${rows.length} option sets have a derivational structure this ` +
        `checker can read (${unscorable} unscorable, ${noStructure} with no hub). No rate reported — ` +
        `a rate over zero items is not a pass.`)
      bad = true
      continue
    }
    const pct = 100 * credit / structured
    console.log(`${f}`)
    console.log(`  scorable ${rows.length - unscorable} of ${rows.length}   with a hub reaching >=2 of 3: ${structured}` +
      `   unscorable (non-numeric or duplicate values) ${unscorable}   no hub ${noStructure}`)
    console.log(`  key-is-hub ${pct.toFixed(1)}%   control 25.0%   margin ${(pct - 25).toFixed(1)}pts   (over the ${structured} structured sets)`)
    if (hubs.length) console.log(`  hubs: ${hubs.join(', ')}`)
  }
  process.exit(bad ? 2 : 0)
}

// This script reads the LIVE bank and treats its positional argument as a
// DOMAIN FILTER. Passed a batch path it matched zero rows and printed
// "0 items ... margin -25.0pts", which reads like a pass — a check that
// read nothing and still reported a number. Both guards below exist so it
// cannot do that again. For a batch file use check-symbolic-hub.mjs, which
// takes batch paths and covers expression options this script cannot see.
if (onlyDomain && (onlyDomain.endsWith('.json') || onlyDomain.includes('/'))) {
  console.error(`check-math-hub.mjs reads the LIVE bank; its argument is a DOMAIN, not a file.\n` +
    `  got: ${onlyDomain}\n` +
    `  for a batch file:  node scripts/study-bank/check-symbolic-hub.mjs ${onlyDomain}\n` +
    `  for a live domain: node scripts/study-bank/check-math-hub.mjs "Advanced Math"`)
  process.exit(2)
}

const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } })

const rows = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await db.from('study_item_bank')
    .select('id, domain, item, verify_meta, archived')
    .order('id', { ascending: true }).range(from, from + 999)
  if (error) { console.error('read failed:', error.message); process.exit(2) }
  if (!data?.length) break
  rows.push(...data)
  if (data.length < 1000) break
}

const repaired = r => !!r.verify_meta &&
  ('legacy_choices' in r.verify_meta || 'hub_repaired_at' in r.verify_meta)

let pool = rows.filter(r => !r.archived && MATH_DOMAINS.includes(r.domain))
if (onlyDomain) pool = pool.filter(r => r.domain === onlyDomain)
if (onlyDomain && pool.length === 0) {
  console.error(`no live rows in domain ${JSON.stringify(onlyDomain)}. Known domains: ${MATH_DOMAINS.join(', ')}.\n` +
    `A checker that read nothing must not go on to print a number.`)
  process.exit(2)
}
pool = pool.filter(r => (validate ? repaired(r) : !repaired(r)))

console.log(validate
  ? `VALIDATION — scoring the ${pool.length} items already repaired. Known result: ~23.6%.\n`
  : `Scoring ${pool.length} UNREPAIRED live SAT Math items.\n`)

const byDomain = new Map()
let scored = 0, skipped = 0, credit = 0, structured = 0
const worst = []
for (const r of pool) {
  const it = r.item ?? {}
  const s = scoreItem(it.choices, it.correct_answer)
  if (!s) { skipped++; continue }
  scored++
  /*
   * The rate is over STRUCTURED items only, and that is what keeps the
   * control at exactly 25.0%: within a set that has k tied hubs, a
   * randomly placed key earns 1/k with probability k/4. Averaging over
   * unstructured items too would drag the rate toward 0 and make the
   * comparison to 25% meaningless in the safe direction.
   */
  if (!s.structured) continue
  structured++; credit += s.credit
  const d = byDomain.get(r.domain) ?? { n: 0, credit: 0 }
  d.n++; d.credit += s.credit
  byDomain.set(r.domain, d)
  if (s.keyIsHub && s.ties === 1 && s.best === 3) worst.push({ id: r.id, domain: r.domain, key: it.correct_answer, detail: s.detail })
}

const pct = (c, n) => (n === 0 ? '  n/a' : `${(100 * c / n).toFixed(1)}%`)
console.log(`scorable ${scored}   unscorable ${skipped}`)
console.log(`with a derivational structure (a hub reaching >=2 of 3): ${structured}` +
  ` = ${(100 * structured / Math.max(1, scored)).toFixed(1)}% of scorable`)
console.log(`rate below is over those ${structured}; control 25.0% by construction\n`)
for (const [d, v] of [...byDomain].sort((a, b) => b[1].credit / b[1].n - a[1].credit / a[1].n)) {
  console.log(`  ${d.padEnd(34)} ${String(v.n).padStart(4)} items   hub-is-key ${pct(v.credit, v.n)}`)
}
console.log(`\n  ${'ALL (structured only)'.padEnd(34)} ${String(structured).padStart(4)} items   hub-is-key ${pct(credit, structured)}   control 25.0%`)

/*
 * BOTH rates, labelled — reporting only the conditional one is how I
 * misread this instrument the first time.
 *
 * The conditional rate answers "when a set HAS a centre, is it the
 * key". The population rate answers "how much of this cohort is
 * affected", and it is the one comparable across cohorts, because a
 * repair that removes the structure entirely shows up here and is
 * invisible in the conditional rate.
 *
 * Against a known 23.6% for the repaired items I read the conditional
 * 68.2% as a validation failure and nearly discarded a working
 * detector. They are different denominators, not a contradiction.
 */
const popCtrl = 25 * structured / Math.max(1, scored)
console.log(`  ${'ALL (population)'.padEnd(34)} ${String(scored).padStart(4)} items   hub-is-key ${pct(credit, scored)}   control ${popCtrl.toFixed(1)}%`)
console.log(`  margin over control — conditional ${(100 * credit / Math.max(1, structured) - 25).toFixed(1)}pts, population ${(100 * credit / Math.max(1, scored) - popCtrl).toFixed(1)}pts`)

console.log(`\nFULL hubs — key derives all three distractors, no tie (${worst.length}):`)
for (const w of worst.slice(0, 10)) {
  console.log(`  ${w.id}  [${w.domain}]  key ${w.key}  ->  ${w.detail.map(h => `${h.name}=${h.o}`).join(', ')}`)
}
if (worst.length > 10) console.log(`  … and ${worst.length - 10} more`)
