#!/usr/bin/env node
/**
 * check-key-magnitude.mjs <family> <batch.json>
 *
 * Is the key the LARGEST (or smallest) of its options more or less often than
 * in the live bank for the same family/section?
 *
 * WHY THIS EXISTS. On 2026-09-22 act-math-v11 passed the options-only attack
 * at 33.3% against a derived control of 35.7% -- margin -2.4, a clean pass --
 * while the key was the largest option on 7.1% of items against 21.5% in the
 * live bank. A solver applying "never the largest" mechanically scored exactly
 * 33.3%, which is 1/4 -> 1/3: the value of one free elimination.
 *
 * The pooled margin CANNOT see this. A tell that shifts the whole option set
 * also raises the best-fixed-letter control it is measured against, so the two
 * move together and the margin stays flat. Magnitude rank therefore needs its
 * own check, against the live bank rather than against 25%.
 *
 * FRACTIONS ARE EVALUATED. The first two versions of this measurement were
 * wrong: one stripped non-digits so "11/6" became 116, the other read it as
 * the mixed number "1 1/6" because the space was optional. Both silently
 * mis-ranked every fraction-bearing item. The parser is self-tested below and
 * the CLI refuses to run if the fixtures fail.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

export function val(s) {
  let t = String(s).trim().replace(/[$,]/g, '').replace(/[a-zA-Z°%]+$/, '').trim()
  const mixed = t.match(/^(-?\d+)\s+(\d+)\/(\d+)$/)          // space REQUIRED
  if (mixed) { const w = Number(mixed[1]), f = Number(mixed[2]) / Number(mixed[3]); return w < 0 ? w - f : w + f }
  const frac = t.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/)
  if (frac) { const d = Number(frac[2]); return d === 0 ? null : Number(frac[1]) / d }
  t = t.replace(/\s+/g, '')
  if (!/^-?[\d.]+$/.test(t)) return null
  const v = parseFloat(t)
  return isFinite(v) ? v : null
}

export function rank(items) {
  let n = 0, big = 0, small = 0
  for (const x of items) {
    const o = (x.choices || []).map(val)
    if (o.length !== 4 || o.some(v => v === null) || new Set(o).size !== 4) continue
    const k = val(x.correct_answer); if (k === null) continue
    n++; if (k === Math.max(...o)) big++; if (k === Math.min(...o)) small++
  }
  return { n, big, small }
}

const RUN_AS_CLI = process.argv[1] && process.argv[1].endsWith('check-key-magnitude.mjs')
if (RUN_AS_CLI) {
  const T = [['11/6', 11/6], ['3/11', 3/11], ['1/2', .5], ['$196.50', 196.5], ['1,296', 1296],
             ['8,400 ft', 8400], ['-18', -18], ['2 1/2', 2.5], ['45°', 45], ['abc', null], ['x + 3', null]]
  for (const [i, w] of T) { const g = val(i)
    const ok = (w === null) ? g === null : (g !== null && Math.abs(g - w) < 1e-9)
    if (!ok) { console.error(`SELF-TEST FAILED: val(${JSON.stringify(i)}) = ${g}, want ${w}`); process.exit(2) } }
  if (!(val('11/6') > val('1/2'))) { console.error('SELF-TEST FAILED: fraction ordering'); process.exit(2) }

  const [fam, file] = process.argv.slice(2)
  if (!fam || !file) { console.error('usage: check-key-magnitude.mjs <family/section> <batch.json>'); process.exit(2) }
  const [family, section] = fam.split('/')
  let cand
  try { cand = JSON.parse(readFileSync(file, 'utf8')) } catch (e) { console.error(`REFUSING: cannot read ${file}: ${e.message}`); process.exit(2) }
  if (!Array.isArray(cand) || !cand.length) { console.error(`REFUSING: ${file} holds zero items`); process.exit(2) }

  const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const rows = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('study_item_bank').select('item')
      .eq('family', family).eq('section', section).eq('verified', true).eq('archived', false).range(f, f + 999)
    if (error) throw new Error(error.message); rows.push(...data); if (data.length < 1000) break
  }
  const live = rank(rows.map(r => r.item).filter(Boolean))
  const c = rank(cand)
  if (live.n < 50) { console.error(`REFUSING: only ${live.n} scorable live ${fam} items — too thin to be a control`); process.exit(2) }
  if (c.n < 10) { console.error(`REFUSING: only ${c.n} scorable candidate items`); process.exit(2) }
  const p = live.big / live.n, q = live.small / live.n
  const z = (obs, n, pr) => (obs - n * pr) / Math.sqrt(n * pr * (1 - pr))
  const zb = z(c.big, c.n, p), zs = z(c.small, c.n, q)
  console.log('')
  console.log(`  live ${fam}`.padEnd(28) + `n=${String(live.n).padStart(4)}   largest ${(100*p).toFixed(1)}%   smallest ${(100*q).toFixed(1)}%`)
  console.log('  ' + file.replace(/^.*\//, '').padEnd(26) + `n=${String(c.n).padStart(4)}   largest ${(100*c.big/c.n).toFixed(1)}%   smallest ${(100*c.small/c.n).toFixed(1)}%`)
  console.log(`  z against live:              largest ${zb.toFixed(2)}   smallest ${zs.toFixed(2)}     (|z| > 1.96 is a real deviation)`)
  const bad = Math.abs(zb) > 1.96 || Math.abs(zs) > 1.96
  console.log('  ' + (bad ? 'DEVIATES from the live bank — a free elimination is available' : 'consistent with the live bank'))
  console.log('')
  process.exitCode = bad ? 1 : 0
}
