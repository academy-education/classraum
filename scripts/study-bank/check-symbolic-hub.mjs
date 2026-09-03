#!/usr/bin/env node
/**
 * check-symbolic-hub.mjs — the derivational hub, in SYMBOLIC form.
 *
 * READ ONLY. Never writes to the bank.
 *
 * ── Why this exists ──────────────────────────────────────────────────
 * check-math-hub.mjs pulls ONE NUMBER out of each option and asks
 * whether the key is the value the others orbit. That catches
 * `12 / -12 / 24 / 6`. It is blind to
 *
 *     -1/(x^2+3x)   1/(x^2+3x)   -1/(3x^2+9x)   -3/(x^2+3x)
 *
 * where the key is again the unique option each distractor is ONE edit
 * from — sign, coefficient, exponent, denominator — but the options are
 * expressions, so the numeric extractor sees nothing (or one incidental
 * coefficient) and reports the set unstructured.
 *
 * Measured 2026-09-04 on sat-adv-hard-v1: the numeric checker said
 * 34.6% of structured sets (control 25.0%), while three independent
 * options-only solvers scored 51.4% and 9 of the 10 items EVERY solver
 * got were symbolic. 64% of the batch's symbolic sets fell to all three.
 * The defect was in the half of the bank the old checker cannot read.
 *
 * ── How it scores ────────────────────────────────────────────────────
 * Each option is reduced to a multiset of structural tokens (sign,
 * numeric coefficients, variable powers, operators, grouping). Option c
 * "derives" option d when they differ by exactly one token substitution
 * or one sign flip. The hub is the option deriving the most others; an
 * item scores 1/k when the key is among k tied hubs, 0 otherwise — so a
 * randomly placed key scores exactly 25.0% by construction, same rule
 * and same control as the numeric checker.
 *
 * usage:
 *   node check-symbolic-hub.mjs --selftest
 *   node check-symbolic-hub.mjs <batch.json> [batch2.json ...]
 *   node check-symbolic-hub.mjs --bank [domain]      # live SAT math
 */
import { readFileSync } from 'node:fs'

const tokens = s => String(s).toLowerCase()
  .replace(/\s+/g, '')
  .match(/\d+\.?\d*|[a-z]+(?:\^\d+)?|[-+*/()^,]/g) ?? []

/** one token substituted, or one token added/removed at the same slot */
function oneEditApart(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false
  if (a.length === b.length) {
    let diff = 0
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++
    return diff === 1
  }
  const [s, l] = a.length < b.length ? [a, b] : [b, a]
  let i = 0, j = 0, skips = 0
  while (i < s.length && j < l.length) {
    if (s[i] === l[j]) { i++; j++ } else { skips++; j++; if (skips > 1) return false }
  }
  return true
}

export function scoreItem(choices, key) {
  const toks = choices.map(tokens)
  if (toks.some(t => t.length === 0)) return null
  const deg = toks.map((t, i) => toks.filter((u, j) => j !== i && oneEditApart(t, u)).length)
  const best = Math.max(...deg)
  if (best === 0) return null                    // unstructured set: not scored
  const ties = deg.filter(d => d === best).length
  const ki = choices.indexOf(key)
  return { structured: true, keyIsHub: deg[ki] === best, credit: deg[ki] === best ? 1 / ties : 0, best, ties }
}

function selftest() {
  const cases = [
    { name: 'symbolic hub: key is the one every distractor is one edit from',
      choices: ['-1/(x^2+3x)', '1/(x^2+3x)', '-1/(3x^2+9x)', '-3/(x^2+3x)'], key: '-1/(x^2+3x)', expectHub: true },
    { name: 'coefficient+exponent twins around the key',
      choices: ['3x^4', '2x^4', '2x^6', '4x^4'], key: '2x^4', expectHub: true },
    { name: 'a DISTRACTOR is the hub, key is peripheral',
      choices: ['2x^4', '2x^6', '2x^2', '9y+1'], key: '9y+1', expectHub: false },
    { name: 'mutually unrelated expressions',
      choices: ['x+1', '3y^2-7', 'sqrt(5)/2', '11'], key: 'x+1', expectHub: null },
  ]
  let ok = true
  for (const c of cases) {
    const r = scoreItem(c.choices, c.key)
    const got = r === null ? null : r.keyIsHub
    const pass = got === c.expectHub
    if (!pass) ok = false
    console.log(`${pass ? 'ok  ' : 'FAIL'}  ${c.name}  ->  ${r === null ? 'unstructured' : `keyIsHub=${r.keyIsHub} credit=${r.credit.toFixed(2)} ties=${r.ties}`}`)
  }
  // control: summing credit over all four key positions must equal 1.0
  const ch = ['-1/(x^2+3x)', '1/(x^2+3x)', '-1/(3x^2+9x)', '-3/(x^2+3x)']
  const total = ch.reduce((s, k) => s + (scoreItem(ch, k)?.credit ?? 0), 0)
  const ctrlOk = Math.abs(total - 1) < 1e-9
  if (!ctrlOk) ok = false
  console.log(`${ctrlOk ? 'ok  ' : 'FAIL'}  credits over all four key positions sum to ${total.toFixed(4)} (must be 1.0000 = a 25% control)`)
  console.log(ok ? '\nself-test passed.' : '\nSELF-TEST FAILED.')
  process.exit(ok ? 0 : 1)
}

function report(label, rows) {
  let structured = 0, credit = 0
  const hubs = []
  for (const { id, choices, key } of rows) {
    const r = scoreItem(choices, key)
    if (!r) continue
    structured++; credit += r.credit
    if (r.keyIsHub) hubs.push(`${id} (deg ${r.best}, ties ${r.ties})`)
  }
  const pct = structured ? (100 * credit / structured) : 0
  console.log(`${label.padEnd(34)} ${String(structured).padStart(4)} structured of ${rows.length}   key-is-hub ${pct.toFixed(1)}%   control 25.0%   margin ${(pct - 25).toFixed(1)}pts`)
  if (hubs.length) console.log(`   hubs: ${hubs.join(', ')}`)
  return { structured, pct }
}

const args = process.argv.slice(2)
if (args[0] === '--selftest') selftest()
else if (args[0] === '--bank') {
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const wanted = args[1]
  const all = []
  for (let from = 0; ; from += 1000) {                     // PostgREST caps at 1000
    const { data, error } = await db.from('study_item_bank').select('id, domain, item')
      .eq('family', 'sat').eq('section', 'math').eq('verified', true).eq('archived', false).range(from, from + 999)
    if (error) throw new Error(error.message)
    all.push(...(data ?? [])); if (!data || data.length < 1000) break
  }
  const byDomain = {}
  for (const r of all) {
    if (wanted && r.domain !== wanted) continue
    const it = r.item
    if (!it?.choices || !it.correct_answer) continue
    ;(byDomain[r.domain] ??= []).push({ id: r.id.slice(0, 8), choices: it.choices, key: it.correct_answer })
  }
  console.log(`live SAT math, ${all.length} rows read\n`)
  let S = 0, C = 0
  for (const [d, rows] of Object.entries(byDomain).sort()) {
    const { structured, pct } = report(d, rows); S += structured; C += structured * pct / 100
  }
  console.log(`\n${'ALL'.padEnd(34)} ${String(S).padStart(4)} structured   key-is-hub ${(100 * C / S).toFixed(1)}%   control 25.0%   margin ${(100 * C / S - 25).toFixed(1)}pts`)
} else {
  for (const f of args) {
    const b = JSON.parse(readFileSync(f, 'utf8'))
    report(f.split('/').pop(), b.map(it => ({ id: it.id, choices: it.choices, key: it.correct_answer })))
  }
}
