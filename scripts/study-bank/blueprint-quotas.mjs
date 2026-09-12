/**
 * The per-domain blueprint shares, DERIVED FROM SOURCE — not held here.
 *
 * WHY THIS FILE EXISTS, AND WHY IT NOW PARSES RATHER THAN DECLARES.
 * `form-capacity.mjs` and `next-form.mjs` each carried their own quota table.
 * The copies were wrong FOUR times on 2026-09-12, and each wrong copy produced
 * a confident authoring brief:
 *
 *   1. SAT Math quotas invented outright -- Algebra 13 against a real 15, PSDA
 *      10 against 7, Geometry 6 against 7. Asked for the form-20 deficit it
 *      answered "Advanced Math +12" when the truth was "+12 and Algebra +3".
 *   2. ACT quotas applied at 8 per form for every domain when Number and
 *      Quantity is 5. Nine items were commissioned into a domain that already
 *      had twelve forms' worth, and bought nothing.
 *   3. `round()` used where ACT needs `ceil()`. ACT shares are published range
 *      MINIMUMS -- 17% of a 48-question form is 8.16 questions and a form
 *      carrying 8 does not meet the floor -- so the need is 9, not 8.
 *   4. THE FOURTH WAS IN THIS FILE, which was created to fix the first three.
 *      It declared ACT Statistics and Probability at 0.17 and Integrating
 *      Essential Skills at 0.17. `act-test.ts` says [12,15] and [20,20]. So
 *      the per-form need was 9 and 9 where the truth is 6 and 10 -- three
 *      items over on one domain and one under on another, in the table the
 *      other two tools had just been pointed at. Caught only because
 *      `form-capacity.mjs` validates ITS copy against act-test.ts with a drift
 *      guard, and the two files disagreed.
 *
 * The lesson defect 4 teaches is not "be more careful". A single source of
 * truth that is TYPED is still a copy; it just has fewer readers to disagree
 * with it. So nothing below is typed: the ACT ranges are parsed out of
 * `src/lib/study/act-test.ts` and the SAT shares out of `BLUEPRINT` in
 * `src/lib/study/assemble.ts`, which are the tables the product itself uses.
 * A parse that finds nothing THROWS; it never falls back to a default.
 *
 * This module must stay free of side effects -- no database, no CLI. It reads
 * two source files at import and nothing else.
 */
import { readFileSync } from 'node:fs'

/** Pull `'Name': [lo, hi],` pairs out of a named export in act-test.ts. */
function actRanges(src, exportName) {
  const m = src.match(new RegExp(`export const ${exportName}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\}`))
  if (!m) throw new Error(`blueprint-quotas: ${exportName} not found in act-test.ts`)
  const out = {}
  for (const line of m[1].split('\n')) {
    const mm = line.match(/'([^']+)':\s*\[\s*(\d+)\s*,\s*(\d+)\s*\]/)
    if (mm) out[mm[1]] = Number(mm[2]) / 100          // the RANGE MINIMUM
  }
  if (!Object.keys(out).length) throw new Error(`blueprint-quotas: ${exportName} parsed to zero domains`)
  return out
}

/** Pull one section's shares out of BLUEPRINT in assemble.ts.
 *
 * ANCHORED INSIDE `BLUEPRINT` ON PURPOSE. The first version of this searched
 * the whole file for `reading_writing:\s*\{`, and assemble.ts line 371 holds a
 * DIFFERENT single-line `reading_writing: { title: ..., label: ... },` object.
 * The non-greedy body ran straight past it to the next `\n  }`, which closes
 * BLUEPRINT.math -- so `satShares(src, 'reading_writing')` returned Algebra /
 * Advanced Math / PSDA / Geometry and Trigonometry at 0.35/0.35/0.15/0.15.
 *
 * assertShares() PASSED it, because the wrong block still sums to 1.00. The
 * arithmetic was checked and the identity of the input was not -- the exact
 * shape of "a check that cannot read its input must not return a number".
 * Caught by printing perForm() for every key instead of trusting the assert:
 * sat/reading_writing came back with the math domains at form 54. */
function satShares(src, section) {
  const block = src.match(/export const BLUEPRINT[^=]*=\s*\{([\s\S]*?)\n\}/)
  if (!block) throw new Error('blueprint-quotas: BLUEPRINT not found in assemble.ts')
  const m = block[1].match(new RegExp(`\\n  ${section}:\\s*\\{([\\s\\S]*?)\\n  \\}`))
  if (!m) throw new Error(`blueprint-quotas: BLUEPRINT.${section} not found inside BLUEPRINT`)
  const out = {}
  for (const line of m[1].split('\n')) {
    const mm = line.match(/'([^']+)':\s*([0-9.]+)/)
    if (mm) out[mm[1]] = Number(mm[2])
  }
  if (!Object.keys(out).length) throw new Error(`blueprint-quotas: BLUEPRINT.${section} parsed to zero domains`)
  return out
}

const ACT_SRC = readFileSync('src/lib/study/act-test.ts', 'utf8')
const SAT_SRC = readFileSync('src/lib/study/assemble.ts', 'utf8')

/** A section's question count, from the ACT_SECTIONS table in act-test.ts.
 *
 * DERIVED FOR THE SAME REASON THE SHARES ARE. The first version of this file
 * typed ACT Math's form as 48. act-test.ts says 45 -- the enhanced ACT cut it
 * from 60 -- and the error put Integrating Essential Skills at ceil(.20*48)=10
 * per form where the truth is exactly 9. That alone moved the reported ACT
 * Math capacity from 8 forms to 7 and made this tool contradict
 * form-capacity.mjs, which reads 45. Fifth wrong ACT number in one day, and
 * the second one inside the file written to end them. */
function actForm(key) {
  const m = ACT_SRC.match(new RegExp(`key:\\s*'${key}'[^\\n]*?questions:\\s*(\\d+)`))
  if (!m) throw new Error(`blueprint-quotas: no question count for act/${key} in act-test.ts`)
  return Number(m[1])
}

export const QUOTAS = {
  /* SAT form sizes are two modules each and are not stated as one number
   * anywhere in src, so they stay written here -- flagged as the one pair of
   * literals left in this file. 27 x 2 and 22 x 2. */
  'sat/math': { form: 44, domains: satShares(SAT_SRC, 'math') },
  'sat/reading_writing': { form: 54, domains: satShares(SAT_SRC, 'reading_writing') },
  // Published RANGE MINIMUMS, not a partition. They do not sum to 1 on purpose.
  'act/english': { form: actForm('english'), minimums: true, domains: actRanges(ACT_SRC, 'ENGLISH_QUOTAS') },
  'act/math': { form: actForm('math'), minimums: true, domains: actRanges(ACT_SRC, 'MATH_QUOTAS') },
  'act/reading': { form: actForm('reading'), minimums: true, domains: actRanges(ACT_SRC, 'READING_QUOTAS') },
  'act/science': { form: actForm('science'), minimums: true, domains: actRanges(ACT_SRC, 'SCIENCE_QUOTAS') },
}

/** Items of each domain one form consumes. `ceil` for minimums, `round` for a
 *  partition — see defect 3 above. */
export function perForm(key) {
  const q = QUOTAS[key]
  if (!q) return null
  const r = q.minimums ? Math.ceil : Math.round
  return Object.fromEntries(Object.entries(q.domains).map(([d, sh]) => [d, Math.max(1, r(sh * q.form))]))
}

/** Shares must partition to 1, or — for minimums — never exceed it. Asserted
 *  rather than trusted, because every one of the four defects above would
 *  have survived a reading of this file and none would have survived a check. */
export function assertShares() {
  const bad = []
  for (const [k, q] of Object.entries(QUOTAS)) {
    const n = Object.keys(q.domains).length
    if (!n) { bad.push(`${k} parsed to zero domains`); continue }
    const total = Object.values(q.domains).reduce((a, b) => a + b, 0)
    if (q.minimums ? total > 1.001 : Math.abs(total - 1) > 0.02) {
      bad.push(`${k} shares sum to ${total.toFixed(2)}${q.minimums ? ', which exceeds 1 for range minimums' : ', not 1'}`)
    }
  }
  /* IDENTITY, not just arithmetic. A parser that returns the wrong section's
   * domains produces a table that sums correctly and is entirely wrong, which
   * is what happened on the first draft of satShares. No two sections of one
   * family share a domain vocabulary, so overlap means a mis-parse. */
  const keys = Object.keys(QUOTAS)
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
    if (keys[i].split('/')[0] !== keys[j].split('/')[0]) continue
    const a = Object.keys(QUOTAS[keys[i]].domains), b = new Set(Object.keys(QUOTAS[keys[j]].domains))
    const shared = a.filter(d => b.has(d))
    if (shared.length === a.length) bad.push(`${keys[i]} and ${keys[j]} parsed to the SAME domains (${shared.join(', ')}) — one of them read the wrong block`)
  }
  return bad
}
