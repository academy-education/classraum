/**
 * READ-ONLY: detect the "derivational hub" defect in SAT Math option sets.
 *
 * Found 2026-08-01 by an options-only attack (the question removed entirely,
 * so the honest expectation is pure chance). Three independent solvers each
 * described the same structure without prompting:
 *
 *   "three options are simple transforms of a fourth (sign flip, double/half,
 *    square, reciprocal) — the hub is usually the answer; {7/3, -7/3, 3/7,
 *    7/2}, {2, -2, 1/2, 8}"
 *
 * That is what distractor generation looks like when foils are produced FROM
 * the key by applying predictable slips. Everything orbits the answer, so the
 * answer is identifiable as the centre without reading the question.
 *
 * Measured accuracy on that attack, mean of three solvers vs each file's own
 * best fixed-letter control:
 *   Advanced Math      47.9% vs 31.3%   <- leaky
 *   Algebra            43.8% vs 34.4%   <- suspect
 *   Geometry and Trig  43.8% vs 43.8%   clean
 *   Problem-Solving    36.5% vs 37.5%   clean
 * Those margins are ~1-2 SE at n=32, so the SCORES are provisional. This
 * script tests the MECHANISM directly over the full bank, where n is large
 * enough to settle it.
 *
 * Method: for each item, ask whether one option is a "hub" — at least two of
 * the other three are reachable from it under a small set of predictable
 * slips. Then ask how often that hub is the key. If distractors were derived
 * from genuinely different wrong solution paths, the hub would be the key no
 * more often than chance.
 *
 * The built-in control is the comparison itself: hub-is-key vs 25%. A bank
 * with well-built distractors reports a hub rate near chance even if many
 * items HAVE a hub, because the hub would fall on distractors as often as on
 * keys.
 *
 *   npx tsx scripts/verify-math-hub.ts
 */
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local'), quiet: true })
import { createClient } from '@supabase/supabase-js'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/** Parse an option into a number where it plainly is one. Handles integers,
 *  decimals, negatives, currency, percentages and simple a/b fractions.
 *  Returns null for anything algebraic — those are skipped, not guessed at. */
function num(raw: string): number | null {
  const s = raw.trim().replace(/[$,\s]/g, '')
  let m = /^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/.exec(s)
  if (m) { const d = parseFloat(m[2]!); return d === 0 ? null : parseFloat(m[1]!) / d }
  m = /^(-?\d+(?:\.\d+)?)%?$/.exec(s)
  if (m) return parseFloat(m[1]!)
  return null
}

const EPS = 1e-9
const close = (a: number, b: number) => Math.abs(a - b) < Math.max(EPS, Math.abs(b) * 1e-9)

/** Is `to` reachable from `from` by one predictable slip? */
function derives(from: number, to: number): boolean {
  if (from === 0) return false
  const cands = [-from, 1 / from, from * 2, from / 2, from * from, from + 1, from - 1]
  if (from > 0) cands.push(Math.sqrt(from))
  return cands.some(c => Number.isFinite(c) && close(to, c))
}

type Item = { key: string; choices: string[] }

async function load(section: string): Promise<Array<Item & { domain: string; id: string }>> {
  const rows: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('study_item_bank').select('id, item, domain')
      .eq('family', 'sat').eq('section', section)
      .eq('archived', false).eq('item_type', 'multiple_choice')
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? [])); if (!data || data.length < 1000) break
  }
  return rows
    .map(r => ({ id: r.id, key: r.item?.correct_answer, choices: r.item?.choices, domain: r.domain ?? '?' }))
    .filter(x => Array.isArray(x.choices) && x.choices.length === 4 && typeof x.key === 'string') as any
}

/** Pass --ids to print the affected item ids as a repair work-list. */
const LIST_IDS = process.argv.includes('--ids')

;(async () => {
  const items = await load('math')
  const byDomain = new Map<string, typeof items>()
  for (const it of items) {
    if (!byDomain.has(it.domain)) byDomain.set(it.domain, [] as any)
    byDomain.get(it.domain)!.push(it)
  }

  console.log('Derivational-hub detection. A "hub" is an option from which at least')
  console.log('TWO others are reachable by one predictable slip (negate, reciprocal,')
  console.log('double, halve, square, sqrt, +/-1). Chance that the hub is the key: 25%.\n')

  let gT = 0, gH = 0, gHK = 0
  const workList: Array<{ id: string; domain: string }> = []
  for (const [domain, list] of [...byDomain].sort((a, b) => b[1].length - a[1].length)) {
    let numeric = 0, withHub = 0, hubIsKey = 0
    for (const it of list) {
      const vals = it.choices.map(num)
      if (vals.some(v => v === null)) continue     // algebraic options — skip
      numeric++
      const v = vals as number[]
      // A unique hub only. Two competing hubs give a candidate no target.
      const hubs = v.map((x, i) => v.filter((y, j) => j !== i && derives(x, y)).length >= 2)
      if (hubs.filter(Boolean).length !== 1) continue
      withHub++
      const hubIdx = hubs.findIndex(Boolean)
      // Only items where the hub IS the key need repair — a hub sitting on a
      // distractor is harmless structure and gives a candidate nothing.
      if (it.choices[hubIdx] === it.key) { hubIsKey++; workList.push({ id: it.id, domain }) }
    }
    gT += numeric; gH += withHub; gHK += hubIsKey
    const rate = withHub ? 100 * hubIsKey / withHub : NaN
    console.log(`${domain}`)
    console.log(`  items with 4 numeric options : ${numeric}/${list.length}`)
    console.log(`  of those, exactly one hub    : ${withHub}` +
      (numeric ? ` (${(100 * withHub / numeric).toFixed(1)}%)` : ''))
    if (withHub >= 15) {
      console.log(`  HUB IS THE KEY               : ${hubIsKey}/${withHub} = ${rate.toFixed(1)}%` +
        (rate > 45 ? '   <-- DEFECT: distractors derived from the key' :
          rate > 35 ? '   <-- elevated' : ''))
    } else {
      console.log(`  HUB IS THE KEY               : ${hubIsKey}/${withHub} — too few to read`)
    }
    console.log()
  }

  console.log('─'.repeat(60))
  const gr = gH ? 100 * gHK / gH : NaN
  console.log(`ALL MATH: ${gH} single-hub items of ${gT} numeric; hub is the key ${gHK}/${gH} = ${gr.toFixed(1)}%  (25% = chance)`)

  // FALSIFICATION CONTROL — not optional, and not a formality.
  //
  // A high hub-is-key rate could in principle be an artifact of which VALUES
  // tend to be hubs (e.g. if hubs are usually small integers and keys are
  // usually small integers, the two correlate without any causal link in
  // authoring). Reassigning the key at random over the SAME option sets
  // breaks the authoring link while preserving every value and every hub
  // structure. If the rate stays high, this script is measuring the number
  // line rather than the bank, and its headline must not be believed.
  let ctrlH = 0, ctrlHK = 0
  for (const it of items) {
    const vals = it.choices.map(num)
    if (vals.some(v => v === null)) continue
    const v = vals as number[]
    const hubs = v.map((x, i) => v.filter((y, j) => j !== i && derives(x, y)).length >= 2)
    if (hubs.filter(Boolean).length !== 1) continue
    ctrlH++
    const fakeKey = it.choices[Math.floor(Math.random() * 4)]
    if (it.choices[hubs.findIndex(Boolean)] === fakeKey) ctrlHK++
  }
  const cr = ctrlH ? 100 * ctrlHK / ctrlH : NaN
  console.log(`CONTROL (same options, key reassigned at random): ${ctrlHK}/${ctrlH} = ${cr.toFixed(1)}%`)
  console.log(cr > 40
    ? '  !! Control is also high — the statistic is an artifact. Do NOT act on the headline.'
    : `  Control lands near chance, so the ${gr.toFixed(0)}% above is authoring, not arithmetic.`)

  if (LIST_IDS) {
    console.log(`\nREPAIR WORK-LIST — ${workList.length} items where the hub IS the key:`)
    for (const w of workList) console.log(`  ${w.id}  ${w.domain}`)
  } else {
    console.log(`\n(${workList.length} items need repair — re-run with --ids for the list)`)
  }
  console.log(`
If this sits near 25%, hubs exist but fall on distractors as often as keys —
harmless structure, no fix needed. Well above 25% means foils are being
generated FROM the key, and the fix is in distractor generation: at least one
foil must come from a genuinely different wrong solution path so the key is
not the unique centre.

Note what a clean option set looks like, per the solvers: uniform arithmetic
runs (9/10/11/13, 40/52/64/76) and flat plausible-value clusters carry no
signal at all. That is the target shape.`)
})().catch(e => { console.error(e); process.exit(1) })
