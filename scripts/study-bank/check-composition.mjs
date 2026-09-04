#!/usr/bin/env node
/**
 * check-composition.mjs — is the key reconstructible from two other options?
 *
 * The eighth structural proxy. It exists because a PSDA author's own ad-hoc
 * scan caught what check-math-hub, check-key-magnitude and the sandbox all
 * missed: the key was the exact PRODUCT of two distractors. P(both) =
 * P(first) x P(second|first), and both factors were sitting in the option
 * set, so a solver multiplies two options together and reads off the key
 * without touching the stem.
 *
 * This is a DIFFERENT relation from the derivational hub. The hub asks
 * "is the key one edit from everything else"; this asks "is the key the
 * arithmetic composition of two of the others". A set can be hub-clean and
 * composition-dirty, which is exactly the case that got through.
 *
 * SCORING follows check-math-hub: the strategy only FIRES on a set where
 * exactly one option is a composition of two others. Where it fires, we ask
 * how often that option is the key, against a 100/k control. A set with two
 * or more compositions gives the strategy nothing to point at and is not
 * scored — counting those would inflate the margin.
 *
 * TRIVIALITIES EXCLUDED, and this list is the whole difficulty of the check.
 * The hub checker was wrong twice, both times toward condemning more of the
 * bank, so each exclusion below is here because without it the checker fires
 * on arithmetic that carries no information:
 *   - operands must be two DISTINCT positions (else 2x = x+x fires on any
 *     set containing a value and its double, which is ordinary distractor
 *     practice)
 *   - x * 1 and x + 0 are identities, not compositions
 *   - x * -1 likewise
 *   - a set with duplicate values is unscorable: "which option" is undefined
 *
 * Run it against a batch file OR, with no argument, against the whole live
 * math bank — the defect is exact, so sample nothing.
 *
 *   node scripts/study-bank/check-composition.mjs [batch.json]
 *   node scripts/study-bank/check-composition.mjs --selftest
 */
import { readFileSync } from 'node:fs'

const EPS = 1e-9
const near = (a, b) => Math.abs(a - b) < Math.max(EPS, Math.abs(b) * 1e-9)

/** Parse a plain number, decimal, signed value, percent or simple fraction. */
export function asNum(s) {
  const t = String(s ?? '').trim().replace(/[\s,$]/g, '').replace(/%$/, '')
  let m = t.match(/^(-?\d+)\/(-?\d+)$/)
  if (m) return Number(m[2]) === 0 ? null : Number(m[1]) / Number(m[2])
  return /^-?\d*\.?\d+$/.test(t) ? Number(t) : null
}

/** Is vals[t] the sum or product of two OTHER, distinct positions? */
export function isComposition(vals, t) {
  for (let i = 0; i < vals.length; i++) {
    for (let j = i + 1; j < vals.length; j++) {
      if (i === t || j === t) continue
      const a = vals[i], b = vals[j]
      if (near(a + b, vals[t])) return `${a} + ${b}`
      // identities carry no information: x*1, x*-1 are not compositions
      if (Math.abs(a) !== 1 && Math.abs(b) !== 1 && near(a * b, vals[t])) return `${a} x ${b}`
    }
  }
  return null
}

/** null = unscorable; else {fires, keyIsIt, k, how} */
export function scoreItem(choices, keyIdx) {
  if (!Array.isArray(choices) || choices.length < 3) return null
  const vals = choices.map(asNum)
  if (vals.some(v => v === null)) return null
  if (new Set(vals).size !== vals.length) return null   // duplicates: undefined target
  const hits = []
  for (let t = 0; t < vals.length; t++) {
    const how = isComposition(vals, t)
    if (how) hits.push({ t, how })
  }
  if (hits.length !== 1) return { fires: false, k: vals.length }
  return { fires: true, keyIsIt: hits[0].t === keyIdx, k: vals.length, how: hits[0].how }
}

/* ---------- self-test: it must fire on a known defect and stay quiet on a
 * clean set. A checker that cannot reproduce a known answer on known data has
 * no business being pointed at unknown data. ---------- */
if (process.argv.includes('--selftest')) {
  const t = []
  // key IS the product of two distractors — the PSDA defect, rebuilt.
  // NOTE: my first two fixtures here were both wrong, and the self-test is
  // the only reason I know. '9/15, 2/3, 3/5, 5/12' has 9/15 == 3/5, so it is
  // unscorable on duplicates, not a product case; and '10,15,25,40' contains
  // TWO compositions (25=10+15 and 40=15+25), so the strategy correctly
  // declines to fire. A fixture has to isolate ONE relation to test for one.
  t.push(['product key fires', scoreItem(['0.5', '0.4', '0.2', '0.95'], 2)?.keyIsIt === true])
  // key is the sum of two distractors, and is the ONLY composition present
  t.push(['sum key fires', scoreItem(['10', '15', '25', '41'], 2)?.keyIsIt === true])
  // a DISTRACTOR is the composition, not the key: fires but keyIsIt false
  t.push(['distractor comp scores false', scoreItem(['10', '15', '25', '41'], 3)?.keyIsIt === false])
  // two compositions = nothing to point at, so the strategy must not fire
  t.push(['two compositions do not fire', scoreItem(['10', '15', '25', '40'], 2)?.fires === false])
  // clean ladder: no composition at all
  t.push(['clean set silent', scoreItem(['3', '7', '11', '19'], 1)?.fires === false])
  // x*1 must NOT count as a composition
  t.push(['times-one excluded', scoreItem(['1', '7', '9', '13'], 1)?.fires === false])
  // duplicates unscorable
  t.push(['duplicates unscorable', scoreItem(['5', '5', '9', '13'], 2) === null])
  // prose unscorable
  t.push(['prose unscorable', scoreItem(['red', 'blue', 'green', 'grey'], 0) === null])
  let bad = 0
  for (const [name, ok] of t) { console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}`); if (!ok) bad++ }
  console.log(bad ? `\n${bad} self-test(s) failed — do not trust this checker` : '\nselftest OK — it fires on a known defect and stays quiet on a clean set')
  process.exit(bad ? 1 : 0)
}

/* ---------- data ---------- */
async function liveRows() {
  const env = Object.fromEntries(readFileSync(process.cwd() + '/.env.local', 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const { createClient } = await import('@supabase/supabase-js')
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } })
  const out = []
  // PostgREST caps at 1000. A verifier once reported "0 problems" over a
  // truncated bank, so page explicitly rather than trusting one request.
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('study_item_bank')
      .select('id,family,section,cohort,item')
      .eq('verified', true).eq('archived', false).range(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data ?? [])); if (!data || data.length < 1000) break
  }
  return out
}

const file = process.argv[2]
let rows
if (file) {
  const raw = JSON.parse(readFileSync(file, 'utf8'))
  const items = Array.isArray(raw) ? raw : (raw.items ?? [])
  rows = items.map(q => ({ id: q.id, cohort: file.split('/').pop(),
    choices: q.choices, correct_answer: q.correct_answer }))
} else {
  // choices and correct_answer live inside the `item` JSONB, not as columns.
  // I guessed column names by plausibility on the first pass and PostgREST
  // rejected it outright — which is the good failure. The same guess against
  // a column that HAPPENED to exist is how this project has produced wrong
  // numbers before, so the shape is taken from check-math-hub, not from memory.
  rows = (await liveRows()).map(r => ({
    id: r.id, family: r.family, section: r.section, cohort: r.cohort,
    choices: (r.item ?? {}).choices, correct_answer: (r.item ?? {}).correct_answer,
  }))
}

const groups = new Map()
for (const r of rows) {
  const key = file ? r.cohort : `${r.family}/${r.section}/${r.cohort ?? '(none)'}`
  const keyIdx = (r.choices ?? []).findIndex(c => String(c) === String(r.correct_answer))
  if (keyIdx < 0) continue
  const s = scoreItem(r.choices, keyIdx)
  if (!s) continue
  const g = groups.get(key) ?? { scorable: 0, fired: 0, keyIs: 0, k: [], ex: [] }
  g.scorable++
  if (s.fires) { g.fired++; if (s.keyIsIt) { g.keyIs++; g.ex.push(`${r.id} (${s.how})`) } }
  g.k.push(s.k)
  groups.set(key, g)
}

const pad = (s, n) => String(s).padEnd(n)
const num = (s, n) => String(s).padStart(n)
console.log('\nKEY-AS-COMPOSITION-OF-TWO-OPTIONS\n')
console.log(pad('cohort', 42) + num('scor', 6) + num('fires', 7) + num('key', 6) + num('rate', 8) + num('ctl', 7) + num('margin', 9))
console.log('-'.repeat(85))
let worst = null
for (const [name, g] of [...groups].sort((a, b) => b[1].fired - a[1].fired)) {
  if (!g.fired) { console.log(pad(name, 42) + num(g.scorable, 6) + num(0, 7) + '   — strategy never fires'); continue }
  const k = Math.round(g.k.reduce((a, b) => a + b, 0) / g.k.length)
  const rate = 100 * g.keyIs / g.fired, ctl = 100 / k, margin = rate - ctl
  console.log(pad(name, 42) + num(g.scorable, 6) + num(g.fired, 7) + num(g.keyIs, 6)
    + num(rate.toFixed(1) + '%', 8) + num(ctl.toFixed(1) + '%', 7) + num((margin >= 0 ? '+' : '') + margin.toFixed(1), 9))
  if (!worst || margin > worst.margin) worst = { name, margin, ex: g.ex }
}
if (worst && worst.margin > 10) {
  console.log(`\nworst: ${worst.name} at ${worst.margin >= 0 ? '+' : ''}${worst.margin.toFixed(1)}pts`)
  console.log('  ' + worst.ex.slice(0, 8).join('\n  '))
}
console.log('\nnote: the strategy is scored only where EXACTLY ONE option is a')
console.log('composition of two others. Sets with none or several give a solver')
console.log('nothing to point at; counting them would inflate the margin.\n')
