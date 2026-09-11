#!/usr/bin/env node
/**
 * check-stem-echo.mjs — is an option eliminable because it merely repeats a
 * number the STEM already handed over?
 *
 *   node scripts/study-bank/check-stem-echo.mjs --selftest
 *   node scripts/study-bank/check-stem-echo.mjs <batch.json>
 *   node scripts/study-bank/check-stem-echo.mjs --bank [--family sat] [--section math]
 *
 * ── Why this checker and not one of the five that already exist ──────
 *
 * On 2026-09-11 `act-math-v3-sp` passed every structural gate in the repo —
 * sandbox 24/24, distractors 72/72, hub 0 structured, plurality 0 fires,
 * key-magnitude within control, letters a flat 6/6/6/6 — and three
 * independent options-only attackers still scored 68.1% pooled with 13 of
 * 24 items solved by all three. The author's own per-item audit had
 * concluded "no option eliminable by kind or magnitude" on all 24.
 *
 * All three attackers named the same channel, unprompted, and it is not a
 * relation AMONG the options at all:
 *
 *     AM3S-05  stem gives a 2-of-5 composition;  2/5 and 3/5 are options
 *     AM3S-09  stem states an uncorrected mean of 74;  74 is an option
 *     AM3S-20  stem gives p = 50/125;             50/125 is an option
 *     AM3S-23  stem's unrestricted total is 84;   84 is an option
 *
 * A question that asks you to COMBINE the givens cannot be answered by one
 * of the givens sitting there unchanged. So the echo is a free elimination,
 * and `check-math-hub` cannot see it by construction: that checker reads
 * only the option set, and this defect needs the stem and the options
 * together.
 *
 * ── What this does NOT claim ──────────────────────────────────────────
 *
 * An echo is not automatically a defect. Plenty of sound items key to a
 * number the stem names — "which of the listed values is the mode" keys to
 * a member of the printed list, and that is the item. The claim this
 * checker can support is comparative and nothing more:
 *
 *     if a DISTRACTOR echoes far more often than the KEY does, then
 *     "eliminate the echo" is a rule that pays.
 *
 * So the control is DERIVED, never a literal: over the same population,
 * what share of all options are echoes, against the share of KEYS that are.
 * A hardcoded 25% here would be exactly the defect CLAUDE.md records in
 * math-bank-helper (a 25% control on five-choice data — five free points,
 * always in the flattering direction).
 *
 * ── And it refuses rather than defaulting ─────────────────────────────
 *
 * An item whose stem holds no numbers at all is UNSCORABLE, not clean. A
 * batch of those reports "NOT MEASURED" and exits 2. Six checkers in this
 * repo were once found emitting confident verdicts over input they had
 * never read; the denominator is printed before every rate here.
 */
import { readFileSync } from 'node:fs'

/** Numbers as a reader meets them: integers, decimals, percents, fractions.
 *  Values are normalised so 50/125, 0.4 and 40% collide — an echo a student
 *  can see is an echo whatever its typography. */
function numbersIn(text) {
  const out = new Set()
  const s = String(text ?? '')
  for (const m of s.matchAll(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/g)) {
    const d = Number(m[2]); if (d) out.add(round(Number(m[1]) / d))
  }
  for (const m of s.matchAll(/(\d+(?:\.\d+)?)\s*%/g)) out.add(round(Number(m[1]) / 100))
  /* "2 of 5", "2 out of 5", "2 in 5" — prose ratios. A stem that says
   * "a bag holds 2 of 5 red" has handed the reader 2/5 as surely as if it
   * had printed the fraction, and the first version of this checker missed
   * exactly that case: its own self-test failed on the very item the three
   * attackers had named. Bare 2 and 5 are still added separately below. */
  for (const m of s.matchAll(/(\d+(?:\.\d+)?)\s*(?:of|out of|in)\s*(\d+(?:\.\d+)?)/gi)) {
    const d = Number(m[2]); if (d) out.add(round(Number(m[1]) / d))
  }
  for (const m of s.matchAll(/(?<![\d./])(\d+(?:\.\d+)?)(?![\d.]*\s*[/%])/g)) out.add(round(Number(m[1])))
  return out
}
/* 1e-9 rather than ===: 50/125 and 0.4 must collide, and binary floats do
 * not promise that they will. */
const round = v => Math.round(v * 1e9) / 1e9

/** One option's value, or null when it is not a number at all. */
function valueOf(choice) {
  const s = String(choice ?? '').trim()
  let m = s.match(/^\$?\s*(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)\s*$/)
  if (m && Number(m[2])) return round(Number(m[1]) / Number(m[2]))
  m = s.match(/^\$?\s*(-?\d+(?:\.\d+)?)\s*%$/)
  if (m) return round(Number(m[1]) / 100)
  m = s.match(/^\$?\s*(-?[\d,]+(?:\.\d+)?)\s*[a-zA-Z°%]*$/)
  if (m) { const v = Number(m[1].replace(/,/g, '')); if (Number.isFinite(v)) return round(v) }
  return null
}

/**
 * Verdict for one item.
 *   null            unscorable — no numeric stem, or no numeric options
 *   { echoes, keyEchoes, n }
 */
export function echoVerdict(stem, choices, key) {
  const stemNums = numbersIn(stem)
  if (stemNums.size === 0) return null
  const vals = choices.map(valueOf)
  if (vals.every(v => v === null)) return null
  const echoes = []
  choices.forEach((c, i) => { if (vals[i] !== null && stemNums.has(vals[i])) echoes.push(c) })
  const kv = valueOf(key)
  return { echoes, keyEchoes: kv !== null && stemNums.has(kv), n: choices.length }
}

function selftest() {
  const cases = [
    // The item all three attackers named. Only 2/5 is a DIRECT echo; 3/5 is
    // its complement, which this checker deliberately does not infer — see
    // the limits note at the bottom of this self-test.
    ['prose ratio in the stem is an echo', 'A bag holds 2 of 5 red. What is P(two reds)?',
      ['2/5', '3/5', '8/25', '17/25'], '8/25', { echoCount: 1, keyEchoes: false }],
    ['typography does not hide it', 'p is 0.4 for each trial. Find P(exactly one).',
      ['50/125', '40%', '18/125', '1/3'], '18/125', { echoCount: 2, keyEchoes: false }],
    ['a legitimate key echo is reported, not hidden', 'The list is 3, 7, 7, 9. What is the mode?',
      ['3', '7', '9', '8'], '7', { echoCount: 3, keyEchoes: true }],
    ['no numeric stem is UNSCORABLE, not clean', 'Which weekday comes next?',
      ['Monday', 'Friday', 'Tuesday', 'Sunday'], 'Friday', null],
    ['no numeric options is UNSCORABLE', 'Of the 5 bags, which colour dominates?',
      ['red', 'blue', 'green', 'grey'], 'red', null],
    ['a stem number that matches nothing fires nothing', 'A tank holds 37 litres. What is half of 80?',
      ['40', '20', '60', '25'], '40', { echoCount: 0, keyEchoes: false }],
  ]
  let bad = 0
  for (const [name, stem, ch, key, want] of cases) {
    const got = echoVerdict(stem, ch, key)
    let ok
    if (want === null) ok = got === null
    else ok = got !== null && got.echoes.length === want.echoCount && got.keyEchoes === want.keyEchoes
    console.log(`${ok ? 'ok   ' : 'FAIL '} ${name}  ->  ${got === null ? 'unscorable' : `echoes=${got.echoes.length} keyEchoes=${got.keyEchoes}`}`)
    if (!ok) { bad++; console.log(`      wanted ${JSON.stringify(want)}`) }
  }
  // Break the checker itself: a stem whose only number IS the key must not
  // read as clean, or the comparative rate below is measuring nothing.
  const t = echoVerdict('Start from 12. What is 12?', ['12', '5', '9', '20'], '12')
  if (!t || !t.keyEchoes) { bad++; console.log('FAIL  a key that is literally the stem number was not detected') }
  else console.log('ok    a key that is literally the stem number is detected')
  // A complement of a stem number (3/5 where the stem gives 2 of 5) is a
  // channel the attackers also named and this checker does NOT model. It is
  // left out because inferring complements needs to know what the stem's
  // whole is, and guessing that wrong would manufacture echoes. So every
  // rate below is a FLOOR on the real echo rate, not an estimate of it.
  const comp = echoVerdict('A bag holds 2 of 5 red. What is P(two reds)?',
    ['2/5', '3/5', '8/25', '17/25'], '8/25')
  console.log(`ok    complement 3/5 is NOT counted (${comp.echoes.length} echo, not 2) — rates are a floor`)
  console.log(bad ? `\nSELF-TEST FAILED (${bad})` : '\nself-test passed.')
  process.exit(bad ? 1 : 0)
}

function report(label, rows) {
  let scorable = 0, keyEcho = 0, optTotal = 0, optEcho = 0
  const anyEcho = []
  for (const r of rows) {
    const v = echoVerdict(r.stem, r.choices, r.key)
    if (!v) continue
    scorable++
    optTotal += v.n; optEcho += v.echoes.length
    if (v.keyEchoes) keyEcho++
    if (v.echoes.length && !v.keyEchoes) anyEcho.push(r.id)
  }
  console.log(`${label}`)
  console.log(`  scorable        : ${scorable} of ${rows.length}  (${rows.length - scorable} unscorable — no numeric stem or no numeric options)`)
  if (scorable === 0) {
    console.log('  NOT MEASURED — a rate over zero scorable items is not a pass.')
    process.exit(2)
  }
  // The control is derived from this very population, never a literal.
  const optRate = 100 * optEcho / optTotal
  const keyRate = 100 * keyEcho / scorable
  console.log(`  options that echo the stem : ${optEcho}/${optTotal} = ${optRate.toFixed(1)}%   <- the control`)
  console.log(`  KEYS that echo the stem    : ${keyEcho}/${scorable} = ${keyRate.toFixed(1)}%`)
  console.log(`  margin                     : ${(keyRate - optRate).toFixed(1)}pts`)
  console.log(`  items where an echo exists and the key is NOT it: ${anyEcho.length} of ${scorable} = ${(100 * anyEcho.length / scorable).toFixed(1)}%`)
  console.log(`  ^ on those, "eliminate the echo" removes a distractor for free.`)
  return { scorable, anyEcho }
}

/* The CLI runs ONLY when this file is the entry point. Without this guard,
 * `import { ... } from './check-stem-echo.mjs'` executes the CLI, prints usage and exits —
 * so a script importing this checker to measure the live bank measures
 * NOTHING while printing something that looks like output. Added 2026-09-11
 * after exactly that happened twice in one session. */
const RUN_AS_CLI = process.argv[1] && process.argv[1].endsWith('check-stem-echo.mjs')
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
    // Paged AND ordered — range() over an unordered relation repeats rows on
    // one page and never returns others, which would quietly shrink the
    // population this whole measurement rests on.
    for (let from = 0; ; from += 1000) {
      let q = db.from('study_item_bank').select('id, item, cohort').eq('archived', false)
      if (argOf('--family')) q = q.eq('family', argOf('--family'))
      if (argOf('--section')) q = q.eq('section', argOf('--section'))
      const { data, error } = await q.order('id').range(from, from + 999)
      if (error) { console.error(error.message); process.exit(1) }
      rows.push(...(data ?? [])); if (!data || data.length < 1000) break
    }
    const mapped = rows.map(r => ({ id: r.id, cohort: r.cohort, stem: r.item?.prompt,
      choices: r.item?.choices ?? [], key: r.item?.correct_answer }))
      .filter(r => Array.isArray(r.choices) && r.choices.length >= 3)
    report(`LIVE BANK  family=${argOf('--family') ?? 'all'} section=${argOf('--section') ?? 'all'}  (${rows.length} rows read)`, mapped)
  } else {
    const path = args.find(a => a.endsWith('.json'))
    if (!path) { console.error('usage: check-stem-echo.mjs <batch.json> | --bank | --selftest'); process.exit(2) }
    const batch = JSON.parse(readFileSync(path, 'utf8'))
    if (!Array.isArray(batch) || !batch.length) {
      console.error(`REFUSING: ${path} holds no items.`); process.exit(2)
    }
    const r = report(path, batch.map(i => ({ id: i.id, stem: i.prompt, choices: i.choices, key: i.correct_answer })))
    if (r.anyEcho.length) console.log(`  ids: ${r.anyEcho.join(' ')}`)
  }
}
