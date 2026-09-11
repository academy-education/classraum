#!/usr/bin/env node
/**
 * check-key-is-sum.mjs — is the KEY the sum or difference of two other
 * options?
 *
 *   node scripts/study-bank/check-key-is-sum.mjs --selftest
 *   node scripts/study-bank/check-key-is-sum.mjs <batch.json>
 *   node scripts/study-bank/check-key-is-sum.mjs --bank [--family sat] [--section math]
 *
 * ── The gap, confirmed by break-test rather than assumed ─────────────
 *
 * `check-math-hub` does NOT cover this, and a repairer proved it: a scratch
 * copy carrying `13 + 14 = 27` and `15 - 4 = 11` in its option sets still
 * reported "0 of 24 ... no hub". That checker's OPS list is UNARY key->option
 * slips — negate, halve, square, +/-1, 90-x, 180-x — so a binary relation
 * among three options is invisible to it by construction.
 *
 * Three independent sources pointed here on 2026-09-11: a repairer's own
 * checker found the key inside an {a, b, a+b} triple on three geometry items
 * no grader had named; two blind graders found "key = sum of two others"
 * recurring on 5 of 14 SSAT maths items; and a third found the same on two
 * more. It is worth a checker in the repo rather than five private ones.
 *
 * ── Why this is a real channel and not arithmetic noise ──────────────
 *
 * A solver who spots that one option is the sum of two others has a rule that
 * needs no stem. Whether it PAYS depends on whether the key is that option
 * more often than chance. With n options there are n choose 2 pairs and n
 * candidate results, so the control is derived from the data, not assumed:
 * among items where exactly one option is the sum/difference of two others,
 * how often is it the key, against a 1/n baseline.
 *
 * The blind graders also found the repair rule that matters, and it is
 * cheaper than renumbering: **the option completing the relation is almost
 * always the option with no student error behind it.** Pruning a weak
 * distractor and breaking the relation are usually the same edit.
 */
import { readFileSync } from 'node:fs'

const num = s => {
  const t = String(s).trim()
  let m = t.match(/^-?\d+(?:\.\d+)?$/); if (m) return Number(t)
  m = t.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/); if (m && Number(m[2])) return Number(m[1]) / Number(m[2])
  m = t.match(/^(-?\d+(?:\.\d+)?)\s*%$/); if (m) return Number(m[1]) / 100
  return null
}

/** Options that are the sum or difference of two OTHER options. */
export function sumNodes(choices) {
  const v = choices.map(num)
  if (v.filter(x => x !== null).length < 3) return null      // unscorable
  const out = []
  for (let k = 0; k < v.length; k++) {
    if (v[k] === null) continue
    for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) {
      if (i === k || j === k || v[i] === null || v[j] === null) continue
      const tol = Math.max(1e-9, Math.abs(v[k]) * 1e-9)
      if (Math.abs(v[i] + v[j] - v[k]) < tol) { out.push(k); i = j = v.length }
    }
  }
  return { nodes: [...new Set(out)], n: v.length, vals: v }
}

function selftest() {
  let bad = 0
  const ok = (name, cond, got) => {
    console.log(`${cond ? 'ok   ' : 'FAIL '} ${name}${cond ? '' : `  -> ${JSON.stringify(got)}`}`); if (!cond) bad++
  }
  // The two relations a repairer proved check-math-hub misses.
  let r = sumNodes(['13', '14', '27', '9'])
  ok('13 + 14 = 27 is found', r.nodes.length === 1 && r.vals[r.nodes[0]] === 27, r)
  r = sumNodes(['15', '4', '11', '7'])
  ok('15 - 4 = 11 is found (a difference is a sum read the other way)',
    r.nodes.some(k => r.vals[k] === 15 || r.vals[k] === 11), r)
  // A set with no relation must return an empty node list, not null.
  r = sumNodes(['3', '7', '19', '46'])
  ok('an unrelated set returns zero nodes (not unscorable)', r !== null && r.nodes.length === 0, r)
  // A zero option makes every value trivially a sum; that is noise, so check
  // it is reported rather than silently swallowed.
  r = sumNodes(['0', '5', '5', '9'])
  ok('a 0 option makes 5 = 0 + 5 — reported, so the caller can discount it', r.nodes.length > 0, r)
  // Unscorable, not clean.
  ok('mostly non-numeric options are UNSCORABLE (null)',
    sumNodes(['red', 'blue', 'green', 'grey']) === null)
  // Break it: a near miss must not fire.
  r = sumNodes(['13', '14', '27.5', '9'])
  ok('a near miss at 27.5 does NOT fire', r.nodes.length === 0, r)
  console.log(bad ? `\nSELF-TEST FAILED (${bad})` : '\nself-test passed.')
  process.exit(bad ? 1 : 0)
}

function report(label, rows) {
  let scorable = 0, unscorable = 0, uniq = 0, uniqKey = 0, wsum = 0
  const fired = []
  for (const r of rows) {
    const v = sumNodes(r.choices)
    if (!v) { unscorable++; continue }
    scorable++; wsum += v.n
    if (v.nodes.length !== 1) continue
    uniq++
    const kv = num(r.key)
    if (kv !== null && Math.abs(v.vals[v.nodes[0]] - kv) < 1e-9) { uniqKey++; fired.push(r.id) }
  }
  console.log(label)
  console.log(`  scorable ${scorable} of ${rows.length}  (${unscorable} unscorable — fewer than 3 numeric options)`)
  if (!scorable) { console.log('  NOT MEASURED — a rate over zero scorable items is not a pass.'); return null }
  if (!uniq) { console.log('  items with EXACTLY ONE sum node: 0 — NOT MEASURED on the decidable statistic.'); return { scorable, uniq: 0 } }
  const control = 100 / (wsum / scorable)
  const rate = 100 * uniqKey / uniq
  console.log(`  items with EXACTLY ONE sum node: ${uniq}   <- the exploitable shape`)
  console.log(`    ...and it IS the key: ${uniqKey} = ${rate.toFixed(1)}%   control ${control.toFixed(1)}%   margin ${(rate - control >= 0 ? '+' : '')}${(rate - control).toFixed(1)}pts`)
  if (fired.length) console.log(`    ids: ${fired.slice(0, 15).join(' ')}${fired.length > 15 ? ` ... and ${fired.length - 15} more` : ''}`)
  return { scorable, uniq, uniqKey }
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
  if (!path) { console.error('usage: check-key-is-sum.mjs <batch.json> | --bank | --selftest'); process.exit(2) }
  const batch = JSON.parse(readFileSync(path, 'utf8'))
  if (!Array.isArray(batch) || !batch.length) { console.error(`REFUSING: ${path} holds no items.`); process.exit(2) }
  if (report(path, batch.map(i => ({ id: i.id, choices: i.choices, key: i.correct_answer }))) === null) process.exit(2)
}
