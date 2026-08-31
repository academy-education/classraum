/**
 * check-equivalent-options.mjs — two options that are the SAME VALUE.
 *
 * Found on isee-math-s5 by a blind attacker, not by a checker: IM5-30
 * offered "3 : 5" and "6 : 10" as separate options. They are the same
 * ratio, so neither can be the key, and a solver knows the answer is one
 * of the other two before reading the question.
 *
 * Every distinct-choices guard in this repo compares STRINGS. "3 : 5"
 * and "6 : 10" are different strings and identical numbers, so the
 * defect passed every gate it met.
 *
 * This is an ARITHMETIC defect, which per CLAUDE.md means it should be
 * decided over the whole population rather than sampled — the same
 * reasoning that turned "SAT Math derivational hub, bank-wide 64.4%"
 * into a measured 8% outside one authoring cohort.
 *
 *   node check-equivalent-options.mjs --bank            # the live bank
 *   node check-equivalent-options.mjs <items.json> ...  # a batch
 *   node check-equivalent-options.mjs --selftest
 */
import { readFileSync } from 'node:fs'

const gcd = (a, b) => (b ? gcd(b, a % b) : a)

/**
 * A comparable canonical form, or null when the option is not a value
 * this can decide. Returning null is the safe answer: a false "these are
 * equal" would condemn a sound item.
 */
export function canonical(raw) {
  const s = String(raw ?? '').trim().toLowerCase().replace(/\s+/g, '')
  if (!s) return null

  // ratio  3:5  6:10
  const r = s.match(/^(-?\d+):(-?\d+)$/)
  if (r) {
    const [a, b] = [Number(r[1]), Number(r[2])]
    if (!b) return null
    const d = gcd(Math.abs(a), Math.abs(b)) || 1
    return `ratio:${a / d}:${b / d}`
  }

  // fraction  3/4  6/8
  const f = s.match(/^(-?\d+)\/(-?\d+)$/)
  if (f) {
    const [a, b] = [Number(f[1]), Number(f[2])]
    if (!b) return null
    const d = gcd(Math.abs(a), Math.abs(b)) || 1
    return `num:${(a / d) / (b / d)}`
  }

  /*
   * Plain number, optionally followed by a unit that does NOT change the
   * value.
   *
   * The first version stripped ANY trailing letters, and reported two
   * false defects on the live bank: "5% decrease" == "5% increase"
   * (opposite answers, both collapsed to 5) and "36" == "36 pi" (a
   * factor of pi discarded). A suffix is only safe to ignore if it is a
   * pure unit; 'pi' multiplies and 'increase'/'decrease' negate.
   *
   * So the allowlist is explicit and short. Anything else returns null —
   * undecidable, which is the answer that cannot condemn a sound item.
   */
  const SAFE_UNIT = /^(?:cm|mm|m|km|in|ft|yd|mi|g|kg|lb|oz|ml|l|s|sec|secs|second|seconds|min|mins|minute|minutes|hr|hrs|hour|hours|day|days|week|weeks|month|months|year|years|degrees?|units?|items?|students?|people|books?|cars?|points?|dollars?|cents?)$/
  const n = s.match(/^(-?\d+(?:\.\d+)?)([a-z]*)$/)
  if (n && (n[2] === '' || SAFE_UNIT.test(n[2]))) return `num:${Number(n[1])}`

  // percent  50%  and  0.5 are NOT merged: on a real item they can be
  // different answers to differently-worded questions.
  return null
}

export function run(items) {
  const hits = []
  let checked = 0
  for (const it of items) {
    const choices = it.choices ?? it.item?.choices ?? []
    if (!Array.isArray(choices) || choices.length < 2) continue
    checked++
    const seen = new Map()
    for (const c of choices) {
      const k = canonical(c)
      if (!k) continue
      if (seen.has(k)) {
        hits.push({ id: it.id ?? '?', a: seen.get(k), b: c, canonical: k })
      } else seen.set(k, c)
    }
  }
  return { hits, checked }
}

function selftest() {
  const eq = run([{ id: 'X', choices: ['3 : 5', '6 : 10', '9 : 25', '27 : 125'] }])
  if (!eq.hits.length) { console.error('SELFTEST FAIL: equivalent ratios not caught'); process.exit(1) }

  const frac = run([{ id: 'Y', choices: ['3/4', '6/8', '1/2', '2/3'] }])
  if (!frac.hits.length) { console.error('SELFTEST FAIL: equivalent fractions not caught'); process.exit(1) }

  const num = run([{ id: 'Z', choices: ['7.50', '7.5', '8', '9'] }])
  if (!num.hits.length) { console.error('SELFTEST FAIL: 7.50 vs 7.5 not caught'); process.exit(1) }

  // Must NOT fire on genuinely different values, or on options it cannot
  // decide — a false positive here condemns a sound item.
  const ok = run([{ id: 'W', choices: ['3 : 5', '9 : 25', '27 : 125', '1 : 2'] }])
  if (ok.hits.length) { console.error('SELFTEST FAIL: distinct ratios flagged', ok.hits); process.exit(1) }

  const prose = run([{ id: 'V', choices: ['n squared', 'n(n + 1)', '3n', 'n + 2'] }])
  if (prose.hits.length) { console.error('SELFTEST FAIL: undecidable options flagged', prose.hits); process.exit(1) }

  const pct = run([{ id: 'U', choices: ['50%', '0.5', '2', '5'] }])
  if (pct.hits.length) { console.error('SELFTEST FAIL: 50% merged with 0.5', pct.hits); process.exit(1) }

  // The two FALSE POSITIVES this checker produced against the live bank
  // on its first run. A unit is only ignorable if it does not change the
  // value: 'pi' multiplies, 'increase'/'decrease' negate.
  const dir = run([{ id: 'T', choices: ['5% decrease', '5% increase', '10% decrease', 'no change'] }])
  if (dir.hits.length) { console.error('SELFTEST FAIL: opposite directions merged', dir.hits); process.exit(1) }

  const pi = run([{ id: 'S', choices: ['36', '36 pi', '72', '144 pi'] }])
  if (pi.hits.length) { console.error('SELFTEST FAIL: 36 merged with 36 pi', pi.hits); process.exit(1) }

  // …while a genuinely ignorable unit must still merge.
  const unit = run([{ id: 'R', choices: ['12 minutes', '12', '15 minutes', '20 minutes'] }])
  if (!unit.hits.length) { console.error('SELFTEST FAIL: 12 minutes vs 12 not caught'); process.exit(1) }

  console.log('selftest OK — catches equal ratios, fractions and decimals; leaves distinct values, prose and percent-vs-decimal alone')
}

const args = process.argv.slice(2)
if (args[0] === '--selftest') { selftest(); process.exit(0) }

let items
if (args[0] === '--bank') {
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  items = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('study_item_bank')
      .select('id, family, section, item').eq('archived', false).eq('verified', true)
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    items.push(...(data ?? []).map(r => ({ id: `${r.family}/${r.section}/${r.id}`, choices: r.item?.choices })))
    if (!data || data.length < 1000) break   // never trust one page
  }
} else {
  items = args.flatMap(f => JSON.parse(readFileSync(f, 'utf8')))
}

const { hits, checked } = run(items)
console.log(`${checked} items with comparable option sets, of ${items.length} read`)
if (!hits.length) { console.log('no two options share a value'); process.exit(0) }
console.log(`\n${hits.length} item(s) where two options are the SAME VALUE:`)
for (const h of hits.slice(0, 40)) console.log(`  ${h.id}: "${h.a}" == "${h.b}"  (${h.canonical})`)
process.exit(1)
