#!/usr/bin/env node
/**
 * check-option-pair-constant.mjs — do two options sum (or differ) to a
 * mathematical constant the CONFIGURATION supplies, rather than to a third
 * option or to a number the stem prints?
 *
 *   node scripts/study-bank/check-option-pair-constant.mjs --selftest
 *   node scripts/study-bank/check-option-pair-constant.mjs <batch.json>
 *   node scripts/study-bank/check-option-pair-constant.mjs --bank [--family sat] [--section math]
 *
 * ── The gap this closes, and how it was found ────────────────────────
 *
 * GEOH2-18 asked for "the acute angle" formed when a transversal cuts two
 * parallel lines. Its options were {58, 98, 22, 82}. Same-side interior
 * angles are supplementary BY CONSTRUCTION, so the two true angle measures
 * sum to 180 at every numbering; exactly one pair in the set does
 * (98 + 82); and the stem's own word "acute" then picks 82 from that pair.
 * The two algebraic expressions are never read.
 *
 * TWO REGRADERS CLEARED IT, and a third grader explained why the machinery
 * missed it: **nothing sums to a fourth option.** Every relation checker in
 * this repo looks for a relation AMONG the options (a hub, an {a,b,a+b}
 * triple, a run) or BETWEEN an option and a quantity the stem prints
 * (check-stem-echo). This relation is to an EXTERNAL constant that the
 * geometry supplies and the stem never mentions. An `a+b=c` sweep clears
 * such an item honestly.
 *
 * It is unfixable by shuffling and unfixable by renumbering: ANY option set
 * containing both true angle values carries it. The only repair is to drop
 * one of the pair.
 *
 * ── Which constants, and why not more ───────────────────────────────
 *
 * 90, 180 and 360 degrees; 1 for probabilities and proportions; 100 for
 * percentages. These are the ones a configuration can supply without being
 * printed. The list is deliberately SHORT: every constant added makes a
 * coincidental hit more likely, and this checker's whole value is that a
 * hit is rare enough to be worth reading. The population run below is the
 * evidence for that — if the bank-wide rate were high, the check would be
 * finding arithmetic, not tells.
 *
 * A pair is only reported when ONE OF THE TWO IS THE KEY. A pair of two
 * distractors summing to 180 tells a solver nothing about which option is
 * right.
 *
 * ── THE RAW HIT RATE IS NOT A DEFECT RATE. READ THE RIGHT STATISTIC ──
 *
 * The first version of this file printed "the key pairs to a constant on
 * 9.4% of live items" and that number means almost nothing. In a geometry
 * item about supplementary angles the supplement IS the natural distractor —
 * the endpoint of "forgot to subtract from 180" — so the pair existing is
 * usually GOOD design, not a tell.
 *
 * What made GEOH2-18 exploitable was narrower: the pair was UNIQUE in the
 * set, so scanning for it identifies two candidates with certainty, and the
 * stem's own word ("acute") then chose between them.
 *
 * So the statistic that decides is: among items with EXACTLY ONE such pair,
 * how often is the key in it? A uniformly random key sits in a given 2-of-4
 * pair 50% of the time, and that is the control. Measured on the live bank:
 *
 *     items with exactly one pair          173 of 1,664 scorable (10.4%)
 *     ...and the key is in that pair       125 = 72.3%   control 50.0%
 *     P(>= 125 | p = 0.5)                  2.1e-9
 *
 * A solver who finds the unique pair and picks one of its two members scores
 * 36.1% on those items against a 25.0% chance line, +11.1 points. Across the
 * whole bank that is about +1.2 points — small in aggregate, large on the
 * items it touches, and those items are findable by name.
 */
import { readFileSync } from 'node:fs'

/*
 * GATED BY WHAT THE STEM IS ABOUT — a grader's false positive, 2026-09-11.
 *
 * The first version fired on `81 + 9 = 90` in an SAT Advanced Math item with
 * no angle anywhere in it. Their verdict, which is right: "there is no angle
 * in that item, so 90 is not a constant the configuration supplies and the
 * pair carries no information. The 90/180/360 test is too coarse for
 * non-geometry domains."
 *
 * A constant only counts when the CONFIGURATION could supply it. So the
 * angle constants require the stem to be about angles, and the percentage
 * constant requires a percent. 1 stays ungated: a pair summing to 1 is a
 * complement wherever probabilities or proportions appear, and those are not
 * reliably signposted by a keyword.
 */
const CONSTANTS = [
  { v: 90, why: 'complementary angles', needs: /angle|degree|triangle|parallel|perpendicular|transversal|polygon|quadrilateral/i },
  { v: 180, why: 'supplementary angles, or a triangle\'s angle sum', needs: /angle|degree|triangle|parallel|perpendicular|transversal|polygon|quadrilateral/i },
  { v: 360, why: 'angles about a point, or a polygon\'s exterior angles', needs: /angle|degree|triangle|circle|polygon|rotat|revolution/i },
  { v: 1, why: 'complementary probabilities or proportions', needs: null },
  { v: 100, why: 'complementary percentages', needs: /percent|%/i },
]

const num = s => {
  const t = String(s).trim()
  let m = t.match(/^-?\d+(?:\.\d+)?$/); if (m) return Number(t)
  m = t.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/); if (m && Number(m[2])) return Number(m[1]) / Number(m[2])
  m = t.match(/^(-?\d+(?:\.\d+)?)\s*%$/); if (m) return Number(m[1]) / 100
  return null
}

/** Every option pair hitting a constant, key membership ignored — needed for
 *  the uniqueness test, which is the statistic that actually decides. */
export function allPairs(choices, stem = '') {
  const vals = choices.map(num)
  const out = []
  for (let i = 0; i < vals.length; i++) for (let j = i + 1; j < vals.length; j++) {
    if (vals[i] === null || vals[j] === null) continue
    for (const c of CONSTANTS) {
      if (c.needs && !c.needs.test(String(stem))) continue
      const tol = Math.max(1e-9, Math.abs(c.v) * 1e-9)
      if (Math.abs(vals[i] + vals[j] - c.v) < tol) out.push([vals[i], vals[j], c.v])
    }
  }
  return out
}

export function pairConstantVerdict(choices, key, stem = '') {
  const vals = choices.map(num)
  if (vals.filter(v => v !== null).length < 3) return null   // unscorable
  const kv = num(key)
  if (kv === null) return null
  const hits = []
  for (let i = 0; i < vals.length; i++) {
    for (let j = i + 1; j < vals.length; j++) {
      if (vals[i] === null || vals[j] === null) continue
      // only interesting when the key is one of the two
      if (vals[i] !== kv && vals[j] !== kv) continue
      for (const c of CONSTANTS) {
        if (c.needs && !c.needs.test(String(stem))) continue
        const tol = Math.max(1e-9, Math.abs(c.v) * 1e-9)
        if (Math.abs(vals[i] + vals[j] - c.v) < tol)
          hits.push({ a: choices[i], b: choices[j], c: c.v, why: c.why })
      }
    }
  }
  return { hits, n: vals.length }
}

function selftest() {
  let bad = 0
  const ok = (name, cond, got) => {
    console.log(`${cond ? 'ok   ' : 'FAIL '} ${name}${cond ? '' : `  -> ${JSON.stringify(got)}`}`); if (!cond) bad++
  }
  // The motivating case. A checker that reads green on its own motivating
  // case is measuring nothing — this repo learned that today.
  let v = pairConstantVerdict(['58', '98', '22', '82'], '82', 'the acute angle formed by the transversal')
  ok('GEOH2-18 fires (98 + 82 = 180, key is one of the pair)', v.hits.length === 1 && v.hits[0].c === 180, v.hits)
  // A pair of two DISTRACTORS summing to 180 must NOT fire.
  v = pairConstantVerdict(['58', '98', '82', '30'], '30', 'the acute angle formed by the transversal')
  ok('two distractors summing to 180 do NOT fire (tells the solver nothing)', v.hits.length === 0, v.hits)
  // Complementary probabilities.
  v = pairConstantVerdict(['1/4', '3/4', '1/2', '1/3'], '1/4')
  ok('complementary probabilities fire (1/4 + 3/4 = 1)', v.hits.length === 1 && v.hits[0].c === 1, v.hits)
  // Percentages written with a sign.
  v = pairConstantVerdict(['35%', '65%', '40%', '20%'], '35%', 'what percent of the total')
  ok('complementary percentages fire (35% + 65% = 1)', v.hits.length === 1, v.hits)
  // A near miss must not fire: 89 + 90 = 179, one off 180.
  v = pairConstantVerdict(['89', '90', '40', '12'], '89', 'the angle measure in degrees')
  ok('a near miss at 179 does NOT fire', v.hits.length === 0, v.hits)
  // Non-numeric options are unscorable, not clean.
  ok('mostly non-numeric options are UNSCORABLE (null)',
    pairConstantVerdict(['red', 'blue', 'green', 'grey'], 'red') === null)
  // Break it: disable the key-membership rule and the distractor case must fire,
  // proving that rule is what suppresses it rather than an accident.
  const vals = ['58', '98', '82', '30'].map(num)
  let wouldFire = 0
  for (let i = 0; i < vals.length; i++) for (let j = i + 1; j < vals.length; j++)
    if (Math.abs(vals[i] + vals[j] - 180) < 1e-9) wouldFire++
  ok('without the key-membership rule that same set WOULD fire — so the rule is load-bearing', wouldFire === 1, wouldFire)
  // The grader's false positive: 81 + 9 = 90 in an item with no angle in it.
  const fp = pairConstantVerdict(['81', '9', '3', '27'], '3', 'If x^(3/4) = 27 and x > 0, what is the value of the cube root of x?')
  ok('81 + 9 = 90 does NOT fire when the stem has no angle in it', fp.hits.length === 0, fp.hits)
  /* The paired positive control needs the KEY inside the pair — with key '3'
   * the 81+9 pair correctly never fires, because this checker only reports a
   * pair one of whose members is the key. My first version of this fixture
   * used '3' and the self-test failed on correct code. Third fixture error of
   * the day; fix the fixture, not the code. */
  const tp = pairConstantVerdict(['81', '9', '3', '27'], '81', 'In the figure two angles are complementary. What is the larger angle measure in degrees?')
  ok('...and the same option set DOES fire when the stem is about angles and the key is in the pair',
    tp.hits.length === 1, tp.hits)
  console.log(bad ? `\nSELF-TEST FAILED (${bad})` : '\nself-test passed.')
  process.exit(bad ? 1 : 0)
}

function report(label, rows) {
  let scorable = 0, unscorable = 0
  const fired = []
  for (const r of rows) {
    const v = pairConstantVerdict(r.choices, r.key, r.stem)
    if (!v) { unscorable++; continue }
    scorable++
    if (v.hits.length) fired.push({ id: r.id, h: v.hits[0] })
  }
  console.log(label)
  console.log(`  scorable ${scorable} of ${rows.length}  (${unscorable} unscorable — fewer than 3 numeric options, or a non-numeric key)`)
  if (!scorable) { console.log('  NOT MEASURED — a rate over zero scorable items is not a pass.'); return null }
  /* Report the decidable statistic, not the raw rate — see the header. */
  let uniq = 0, uniqKey = 0
  for (const r of rows) {
    const v = pairConstantVerdict(r.choices, r.key, r.stem)
    if (!v) continue
    const all = allPairs(r.choices, r.stem)
    if (all.length === 1) { uniq++; if (v.hits.length) uniqKey++ }
  }
  console.log(`  key pairs to a constant at all: ${fired.length} of ${scorable} = ${(100 * fired.length / scorable).toFixed(1)}%   <- NOT a defect rate; the supplement is usually a good distractor`)
  if (uniq) {
    const rate = 100 * uniqKey / uniq
    console.log(`  items with EXACTLY ONE such pair: ${uniq}   <- the exploitable shape`)
    console.log(`    ...key is in it: ${uniqKey} = ${rate.toFixed(1)}%   control 50.0%   margin ${(rate - 50 >= 0 ? '+' : '')}${(rate - 50).toFixed(1)}pts`)
    console.log(`    a solver finding the pair and guessing between its two members scores ${(rate / 2).toFixed(1)}% vs 25.0%`)
  } else {
    console.log('  items with exactly one such pair: 0 — NOT MEASURED on the decidable statistic.')
  }
  for (const f of fired.slice(0, 12)) console.log(`    ${f.id}: ${f.h.a} + ${f.h.b} = ${f.h.c}   (${f.h.why})`)
  if (fired.length > 12) console.log(`    ... and ${fired.length - 12} more`)
  return { scorable, fired: fired.length }
}

const args = process.argv.slice(2)
if (args.includes('--selftest')) selftest()

if (args.includes('--bank')) {
  const argOf = f => { const i = args.indexOf(f); return i === -1 ? null : args[i + 1] }
  const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const { createClient } = await import('@supabase/supabase-js')
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const rows = []
  for (let from = 0; ; from += 1000) {
    let q = db.from('study_item_bank').select('id, family, section, item').eq('archived', false).eq('verified', true)
    if (argOf('--family')) q = q.eq('family', argOf('--family'))
    if (argOf('--section')) q = q.eq('section', argOf('--section'))
    const { data, error } = await q.order('id').range(from, from + 999)
    if (error) { console.error(error.message); process.exit(1) }
    rows.push(...(data ?? [])); if (!data || data.length < 1000) break
  }
  report(`LIVE BANK family=${argOf('--family') ?? 'all'} section=${argOf('--section') ?? 'all'}`,
    rows.map(r => ({ id: r.id, choices: r.item?.choices ?? [], key: r.item?.correct_answer, stem: r.item?.prompt ?? '' })))
} else {
  const path = args.find(a => a.endsWith('.json'))
  if (!path) { console.error('usage: check-option-pair-constant.mjs <batch.json> | --bank | --selftest'); process.exit(2) }
  const batch = JSON.parse(readFileSync(path, 'utf8'))
  if (!Array.isArray(batch) || !batch.length) { console.error(`REFUSING: ${path} holds no items.`); process.exit(2) }
  const r = report(path, batch.map(i => ({ id: i.id, choices: i.choices, key: i.correct_answer, stem: i.prompt ?? '' })))
  if (r === null) process.exit(2)
}
