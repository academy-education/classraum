#!/usr/bin/env node
/**
 * apply-2026-10-02-math.mjs [--write | --rollback]
 *
 * Fixes the two live SAT Math defects confirmed by MATH-LIVE-AUDIT-2026-10-02.md:
 *
 *   df25c0d2  options held 3√13 (key) AND √117 — the same value, two correct
 *             choices. Replace ONLY √117 with 6 = √(4·9): the ALTITUDE, the
 *             geometric mean of the two segments, which is the classic
 *             confusion of the altitude rule with the leg rule. Explanation
 *             and the √117 distractor_rationales entry are updated to match.
 *   820a40b5  stem said "using exactly 2 kilograms of a flour supply", which the
 *             key (1500 g flour + 900 g water = 2400) contradicts: at 5:3, 2 kg
 *             of flour needs 1200 g of water. Stem now says the baker HAS 2 kg
 *             of flour and 900 g of water available. Key unchanged (2400);
 *             recomputed below from the corrected stem.
 *
 * Dry run by default. --write snapshots first (refuses if the snapshot file
 * is missing or the live row no longer matches it), then updates `item`
 * only. --rollback restores `item` from the snapshot.
 *
 * content_sha / dedup_key are GENERATED from `item`, so this edit changes
 * content_sha — by migration 076/077 any review or attack bound to the old
 * content goes stale. Checked 2026-10-02: neither id has a review or attack row.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const D = new URL('.', import.meta.url).pathname
const SNAP = D + 'snapshot-2026-10-02-math.json'
const WRITE = process.argv.includes('--write')
const ROLLBACK = process.argv.includes('--rollback')
const SNAPSHOT_ONLY = process.argv.includes('--snapshot')
const env = Object.fromEntries(readFileSync(D + '../../../.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const PREFIXES = ['df25c0d2', '820a40b5']

async function byPrefix(p) {
  const { data, error } = await db.from('study_item_bank').select('*')
    .gte('id', `${p}-0000-0000-0000-000000000000`).lte('id', `${p}-ffff-ffff-ffff-ffffffffffff`)
  if (error) throw new Error(`${p}: ${error.message}`)
  if (data.length !== 1) throw new Error(`${p}: expected exactly 1 row, got ${data.length}`)
  return data[0]
}

// ── numeric value of an option: integers, decimals, a/b, a√b, √b, U+2212 ──
function val(s) {
  const t = String(s).trim().replace(/−/g, '-').replace(/[$,%\s]/g, '')
  let m
  if ((m = t.match(/^(-?\d*(?:\.\d+)?)√(\d+(?:\.\d+)?)$/))) {
    const c = m[1] === '' ? 1 : m[1] === '-' ? -1 : Number(m[1]); return c * Math.sqrt(Number(m[2]))
  }
  if ((m = t.match(/^(-?\d+)\/(\d+)$/))) return Number(m[1]) / Number(m[2])
  return /^-?\d+(?:\.\d+)?$/.test(t) ? Number(t) : NaN
}
const near = (a, b) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
const fmtClass = s => { const t = String(s); return /√/.test(t) ? 'rad' : /\//.test(t) ? 'frac' : /\./.test(t) ? 'dec' : 'int' }
const printed = stem => [...String(stem).replace(/−/g, '-').matchAll(/-?\d+(?:\.\d+)?(?:\/\d+)?/g)].map(m => val(m[0])).filter(Number.isFinite)
const combos = (a, b) => { const o = [a + b, a - b, b - a, a * b, (a + b) / 2, Math.sqrt(Math.abs(a * b)), (a && b) ? 2 * a * b / (a + b) : NaN]; if (b) o.push(a / b); if (a) o.push(b / a); return o.filter(Number.isFinite) }

/** The b8/check-repairs.mjs rules, with radicals parsed numerically. Returns reasons (empty = ok). */
export function checkReplacement(item, oldOpt, newOpt) {
  const reasons = []
  const idx = item.choices.findIndex(c => c === oldOpt)
  if (idx < 0) return ['old not in choices']
  const set = item.choices.map((c, i) => (i === idx ? newOpt : c))
  const nums = set.map(val), key = val(item.correct_answer), nv = val(newOpt)
  if (nums.some(n => !Number.isFinite(n))) reasons.push('unparseable option')
  if (!set.includes(item.correct_answer)) reasons.push('key missing')
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (near(nums[i], nums[j])) reasons.push(`equal value ${set[i]} = ${set[j]}`)
  if (nums.some(b => b !== 0 && near(nv, -b))) reasons.push('new creates a ±pair')
  if (nums.some(b => b !== 0 && near(key, -b))) reasons.push('key in a ±pair')
  const pr = printed(item.prompt + ' ' + (item.passage ?? ''))
  if (pr.some(p => near(p, nv))) reasons.push('new is a printed number')
  for (const p of pr) { if (!p) continue; for (const c of [key + p, key - p, key * p, key / p, p - key, p / key]) if (near(c, nv)) { reasons.push(`new = key op printed(${p})`); break } }
  const others = nums.filter((_, i) => i !== idx)
  for (let i = 0; i < others.length; i++) for (let j = i + 1; j < others.length; j++) if (combos(others[i], others[j]).some(c => near(c, nv))) reasons.push(`new is a closure of (${others[i]}, ${others[j]})`)
  const ds = nums.filter(n => !near(n, key))
  for (let i = 0; i < ds.length; i++) for (let j = i + 1; j < ds.length; j++) if ((near(ds[i], nv) || near(ds[j], nv)) && combos(ds[i], ds[j]).some(c => near(c, key))) reasons.push(`key is a closure of (${ds[i]}, ${ds[j]}) via new`)
  const cls = set.map(fmtClass), keyCls = fmtClass(item.correct_answer)
  if (cls.filter(c => c === keyCls).length === 1) reasons.push(`key unique in format (${keyCls})`)
  if (!cls.filter((_, i) => i !== idx).includes(fmtClass(newOpt))) reasons.push(`new format ${fmtClass(newOpt)} not among the others`)
  const preds = { odd: v => Number.isInteger(v) && Math.abs(v % 2) === 1, even: v => Number.isInteger(v) && v % 2 === 0, negative: v => v < 0, nonInteger: v => !Number.isInteger(v), roundTen: v => Number.isInteger(v) && v % 10 === 0 }
  const ki = nums.findIndex(v => near(v, key))
  for (const [n, f] of Object.entries(preds)) { const h = nums.map(f); if (h.filter(Boolean).length === 1 && h[ki]) reasons.push(`key unique ${n}`) }
  return reasons
}

// ── independent key recomputation from the (corrected) stems ──
function solveLeg(segA, segB) { const hyp = segA + segB; return Math.sqrt(Math.max(segA, segB) * hyp) } // longer leg
function solveDough(flourAvail, waterAvail, rf, rw) { const part = Math.min(flourAvail / rf, waterAvail / rw); return part * (rf + rw) }

const OLD_820_STEM = 'A baker wants to make dough using exactly 2 kilograms of a flour supply and as much water as needed, but only has 900 grams of water available.'
const NEW_820_STEM = 'A baker has 2 kilograms of flour and 900 grams of water available.'

function plan(rows) {
  const out = []
  const a = rows.df25c0d2.item
  {
    const OLD = '√117', NEW = '6'
    const reasons = checkReplacement(a, OLD, NEW)
    if (reasons.length) throw new Error(`df25c0d2 replacement refused: ${reasons.join('; ')}`)
    const OLD_EXPL = 'Each leg is the geometric mean of the full hypotenuse (4+9=13) and its adjacent segment; the longer leg uses segment 9: √(9·13) = √117 = 3√13. 2√13 = √(4·13) is the shorter leg, √117 is left unsimplified, and 13 is the hypotenuse.'
    if (a.explanation !== OLD_EXPL) throw new Error('df25c0d2 explanation changed since audit')
    const next = {
      ...a,
      choices: a.choices.map(c => (c === OLD ? NEW : c)),
      explanation: 'Each leg is the geometric mean of the full hypotenuse (4+9=13) and its adjacent segment; the longer leg uses segment 9: √(9·13) = 3√13. 2√13 = √(4·13) is the shorter leg, 6 = √(4·9) is the altitude (the geometric mean of the two segments), and 13 is the hypotenuse.',
      distractor_rationales: a.distractor_rationales.map(r => (r.choice === OLD ? { choice: NEW, reason: 'The altitude to the hypotenuse, √(4·9), not a leg.' } : r)),
    }
    const leg = solveLeg(4, 9)
    if (!near(leg, val(next.correct_answer))) throw new Error(`df25c0d2 recompute ${leg} != key`)
    if (next.choices.filter(c => near(val(c), leg)).length !== 1) throw new Error('df25c0d2: not exactly one option equals the recomputed key')
    out.push({ id: rows.df25c0d2.id, from: a, to: next, note: `√117 -> 6; recomputed longer leg ${leg.toFixed(6)} = 3√13; exactly one option matches` })
  }
  const b = rows['820a40b5'].item
  {
    if (!b.prompt.includes(OLD_820_STEM)) throw new Error('820a40b5 stem changed since audit')
    const next = { ...b, prompt: b.prompt.replace(OLD_820_STEM, NEW_820_STEM) }
    const total = solveDough(2000, 900, 5, 3)
    if (!near(total, val(next.correct_answer))) throw new Error(`820a40b5 recompute ${total} != key ${next.correct_answer}`)
    if (next.choices.filter(c => near(val(c), total)).length !== 1) throw new Error('820a40b5: not exactly one option equals the recomputed key')
    out.push({ id: rows['820a40b5'].id, from: b, to: next, note: `stem reworded; recomputed min(2000/5, 900/3)·8 = ${total} = key (unchanged)` })
  }
  return out
}

if (ROLLBACK) {
  const snap = JSON.parse(readFileSync(SNAP, 'utf8'))
  for (const r of snap) { const { error } = await db.from('study_item_bank').update({ item: r.item }).eq('id', r.id); if (error) throw new Error(`${r.id}: ${error.message}`) }
  console.log(`rolled back ${snap.length} rows from ${SNAP}`); process.exit(0)
}

const live = {}
for (const p of PREFIXES) live[p] = await byPrefix(p)
console.log(`matched: ${PREFIXES.map(p => `${p} -> ${live[p].id}`).join(', ')}`)

if (SNAPSHOT_ONLY) {
  if (existsSync(SNAP)) { console.error(`${SNAP} exists; refusing to overwrite the pre-write snapshot`); process.exit(2) }
  writeFileSync(SNAP, JSON.stringify(PREFIXES.map(p => live[p]), null, 1) + '\n')
  console.log(`snapshot written: ${SNAP}`); process.exit(0)
}

const steps = plan(live)
for (const s of steps) {
  console.log(`\n${s.id}  ${s.note}`)
  for (const k of ['prompt', 'choices', 'explanation', 'distractor_rationales']) {
    const f = JSON.stringify(s.from[k]), t = JSON.stringify(s.to[k])
    if (f !== t) console.log(`  ${k}:\n    - ${f}\n    + ${t}`)
  }
}
if (!WRITE) { console.log('\ndry run — pass --write'); process.exit(0) }

if (!existsSync(SNAP)) { console.error(`no snapshot at ${SNAP}; run --snapshot first`); process.exit(2) }
const snap = JSON.parse(readFileSync(SNAP, 'utf8'))
for (const s of steps) {
  const sr = snap.find(r => r.id === s.id)
  if (!sr || JSON.stringify(sr.item) !== JSON.stringify(s.from)) { console.error(`${s.id}: live row differs from snapshot; refusing`); process.exit(2) }
}
for (const s of steps) {
  const { error } = await db.from('study_item_bank').update({ item: s.to }).eq('id', s.id)
  if (error) { console.error(`${s.id}: ${error.message}`); process.exit(1) }
  console.log(`updated ${s.id}`)
}
