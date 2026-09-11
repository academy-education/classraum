#!/usr/bin/env node
/**
 * check-run-middle.mjs — does a three-term arithmetic or geometric run among
 * the options name its own middle, and is that middle the key?
 *
 *   node scripts/study-bank/check-run-middle.mjs --selftest
 *   node scripts/study-bank/check-run-middle.mjs <batch.json>
 *   node scripts/study-bank/check-run-middle.mjs --bank [--family sat] [--section math]
 *
 * ── Why this is in the repo ──────────────────────────────────────────
 *
 * FOUR agents wrote private versions of this on 2026-09-11 before anyone put
 * one here. It is the only one of the day's seven measured channels that was
 * real, reachable, and had no checker.
 *
 *     LIVE BANK          1,639 scorable
 *       exactly one run middle      517  (31.6% of scorable)
 *       ...and it IS the key        160 = 30.9%   control 24.5%
 *       margin                            +6.5 pts,  P = 5.2e-4
 *
 * It survives the draw shuffle, because a run is a property of the VALUE SET
 * (see AUTHORING-BRIEF §2b). Six solvers across three batches named it
 * unprompted; the mechanism is distractors built as "key plus or minus one
 * step, plus a blunder value", which makes the key the run's centre.
 *
 * It also caught an item that THREE BLIND GRADERS had cleared — AM4F-05,
 * whose options `9, 1, 17, 12` hold the run `1, 9, 17` with the key at its
 * middle. The blind render removes anchoring; it does not give a reader an
 * exhaustive arithmetic sweep. This is the shape a script finds and a person
 * does not, which is the argument for keeping both.
 *
 * ── THE CONTROL IS CONSTRUCTED, NOT ASSUMED ─────────────────────────
 *
 * Worked out by the ssat-math-s5 repairer and kept because it matters: for
 * each item count how many options are the middle of SOME run (m of k), so
 * the null "the key is a uniformly random option" gives m/k. A RUN-FREE SET
 * MUST CONSTRUCT 0.0%, NOT 25% — a hardcoded chance line would score a clean
 * set as a 25-point pass.
 *
 * ── The caveat that stops this becoming a rewrite programme ──────────
 *
 * A `sat-alg-h4` author found, while designing against it, that **the natural
 * distractor trio for a ceiling item is INHERENTLY an arithmetic progression**
 * — (correct, ignore-the-fixed-term, add-instead-of-subtract) is an AP by
 * construction, as is (both numbers, their midpoint), as is (correct,
 * dropped-constant, wrong-sign-constant). Those are GOOD distractors, each
 * the endpoint of a named error.
 *
 * So a hit is a question, not a verdict: is this run a consequence of the
 * error paths, or an artefact of the chosen numbers? The same structural-vs-
 * numerical distinction the geometry repair had to make, and the answer
 * decides whether renumbering can fix it or the option must leave. Do not
 * treat the population number as 517 broken items.
 */
import { readFileSync } from 'node:fs'

const num = s => {
  const t = String(s).trim()
  let m = t.match(/^-?\d+(?:\.\d+)?$/); if (m) return Number(t)
  m = t.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/); if (m && Number(m[2])) return Number(m[1]) / Number(m[2])
  m = t.match(/^(-?\d+(?:\.\d+)?)\s*%$/); if (m) return Number(m[1]) / 100
  return null
}
const close = (a, b, scale) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(scale))

/** Values that are the middle of some 3-term arithmetic or geometric run. */
export function runMiddles(choices) {
  const v = choices.map(num)
  if (v.filter(x => x !== null).length < 3) return null            // unscorable
  const mids = new Set()
  for (let i = 0; i < v.length; i++) for (let j = 0; j < v.length; j++) for (let k = 0; k < v.length; k++) {
    if (i === j || j === k || i === k) continue
    const [a, b, c] = [v[i], v[j], v[k]]
    if (a === null || b === null || c === null) continue
    if (!(a < b && b < c)) continue
    if (close(b - a, c - b, b)) mids.add(b)
    else if (a > 0 && b > 0 && c > 0 && close(b * b, a * c, b * b)) mids.add(b)
  }
  return { mids, k: v.length, vals: v }
}

function selftest() {
  let bad = 0
  const ok = (name, cond, got) => {
    console.log(`${cond ? 'ok   ' : 'FAIL '} ${name}${cond ? '' : `  -> ${JSON.stringify(got)}`}`); if (!cond) bad++
  }
  // The item three blind graders cleared.
  let r = runMiddles(['9', '1', '17', '12'])
  ok('AM4F-05: 1, 9, 17 is found and 9 is its middle', r.mids.has(9), [...r.mids])
  // Geometric runs — the shape an author said they had not thought to look for.
  r = runMiddles(['90', '450', '2250', '31'])
  ok('geometric run 90, 450, 2250 names 450', r.mids.has(450), [...r.mids])
  r = runMiddles(['4.5', '18', '72', '7'])
  ok('geometric run 4.5, 18, 72 names 18', r.mids.has(18), [...r.mids])
  // A COMPLETE four-term run has two middles, so it names nothing uniquely —
  // this is the clean shape the brief recommends and it must not fire.
  r = runMiddles(['-15', '-5', '5', '15'])
  ok('a complete 4-term run has TWO middles, so it names nothing uniquely', r.mids.size === 2, [...r.mids])
  // A run-free set must construct a 0.0% control, not 25%.
  r = runMiddles(['3', '7', '19', '46'])
  ok('a run-free set has zero middles (control constructs to 0.0%, not 25%)', r.mids.size === 0, [...r.mids])
  // Near miss.
  r = runMiddles(['1', '9', '17.5', '12'])
  ok('a near miss at 17.5 does NOT fire', !r.mids.has(9), [...r.mids])
  ok('mostly non-numeric options are UNSCORABLE (null)',
    runMiddles(['red', 'blue', 'green', 'grey']) === null)
  console.log(bad ? `\nSELF-TEST FAILED (${bad})` : '\nself-test passed.')
  process.exit(bad ? 1 : 0)
}

function report(label, rows) {
  let scorable = 0, unscorable = 0, uniq = 0, uniqKey = 0, ctrlNum = 0, wsum = 0
  const fired = []
  for (const r of rows) {
    const v = runMiddles(r.choices)
    if (!v) { unscorable++; continue }
    scorable++
    wsum += v.k                                  // width of the SCORED items only
    ctrlNum += v.mids.size / v.k                 // constructed, per item
    if (v.mids.size !== 1) continue
    uniq++
    const kv = num(r.key)
    if (kv !== null && v.mids.has(kv)) { uniqKey++; fired.push(r.id) }
  }
  console.log(label)
  console.log(`  scorable ${scorable} of ${rows.length}  (${unscorable} unscorable — fewer than 3 numeric options)`)
  if (!scorable) { console.log('  NOT MEASURED — a rate over zero scorable items is not a pass.'); return null }
  console.log(`  CONSTRUCTED control (mean m/k over the scored items): ${(100 * ctrlNum / scorable).toFixed(1)}%`)
  if (!uniq) { console.log('  items with EXACTLY ONE run middle: 0 — nothing to decide on.'); return { scorable, uniq: 0 } }
  const rate = 100 * uniqKey / uniq
  /* The chance line is computed over the SCORED items, not over every row.
   * The first version averaged option counts across all `rows`, including the
   * 4,377 the checker could not score — which on the live bank mixes in
   * five-choice SSAT and non-numeric sets and moved the printed chance from
   * 24.5% to 26.4%, understating the margin by 1.9 points. Same "read the
   * denominator" error this file's own header warns about, in the file that
   * warns about it. */
  const chance = 100 / (wsum / scorable)
  console.log(`  items with EXACTLY ONE run middle: ${uniq}   <- the exploitable shape`)
  console.log(`    ...and it IS the key: ${uniqKey} = ${rate.toFixed(1)}%   chance ${chance.toFixed(1)}%   margin ${(rate - chance >= 0 ? '+' : '')}${(rate - chance).toFixed(1)}pts`)
  if (fired.length) console.log(`    ids: ${fired.slice(0, 15).join(' ')}${fired.length > 15 ? ` ... +${fired.length - 15}` : ''}`)
  console.log('  NB a hit is a question, not a verdict — the canonical distractor trio for a')
  console.log('     ceiling item is inherently an AP. Ask whether the run follows from the')
  console.log('     error paths or from the chosen numbers before repairing.')
  return { scorable, uniq, uniqKey }
}

/* The CLI runs ONLY when this file is the entry point. Without this guard,
 * `import { ... } from './check-run-middle.mjs'` executes the CLI, prints usage and exits —
 * so a script importing this checker to measure the live bank measures
 * NOTHING while printing something that looks like output. Added 2026-09-11
 * after exactly that happened twice in one session. */
const RUN_AS_CLI = process.argv[1] && process.argv[1].endsWith('check-run-middle.mjs')
if (RUN_AS_CLI) {
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
      let q = db.from('study_item_bank').select('id, item').eq('archived', false).eq('verified', true)
      if (argOf('--family')) q = q.eq('family', argOf('--family'))
      if (argOf('--section')) q = q.eq('section', argOf('--section'))
      const { data, error } = await q.order('id').range(from, from + 999)
      if (error) { console.error(error.message); process.exit(1) }
      rows.push(...(data ?? [])); if (!data || data.length < 1000) break
    }
    report(`LIVE BANK family=${argOf('--family') ?? 'all'} section=${argOf('--section') ?? 'all'}`,
      rows.map(r => ({ id: r.id, choices: r.item?.choices ?? [], key: r.item?.correct_answer })))
  } else {
    const path = args.find(a => a.endsWith('.json'))
    if (!path) { console.error('usage: check-run-middle.mjs <batch.json> | --bank | --selftest'); process.exit(2) }
    const batch = JSON.parse(readFileSync(path, 'utf8'))
    if (!Array.isArray(batch) || !batch.length) { console.error(`REFUSING: ${path} holds no items.`); process.exit(2) }
    if (report(path, batch.map(i => ({ id: i.id, choices: i.choices, key: i.correct_answer }))) === null) process.exit(2)
  }
}
