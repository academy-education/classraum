#!/usr/bin/env node
/**
 * check-repairs.mjs — exact gate for the B8 sign-pair repairs.
 *
 * Reads sign-pair-items.json (the live option sets) and every repair-*.json,
 * applies each repair (replace the negated-key distractor only) and refuses
 * anything that violates the rules the authors were given. Prints per item:
 * ok / FAIL <reasons>. Exit 1 if any FAIL. Items with no repair entry are
 * listed as HELD. Nothing here touches the database; apply-repairs.mjs does,
 * and only for ids this script printed as ok.
 *
 * Rules (each one a learnable tell, all measured on this bank):
 *   pair       no x and -x anywhere in the new set
 *   dup        four distinct values; old actually replaced; key untouched
 *   printed    new != key (+,-,*,/) any number printed in the stem; new not a printed number
 *   closure    new not sum/diff/product/ratio/AM/GM/HM of two other options;
 *              key not any of those of two distractors
 *   format     integer set stays integer; fraction/decimal class matches the majority
 *   singleton  key not the unique odd/even/negative/non-integer/round-ten value
 *   text       explanation no longer mentions the old value as a standalone number
 */
import { readFileSync, readdirSync } from 'node:fs'
const D = new URL('.', import.meta.url).pathname
const items = JSON.parse(readFileSync(D + 'sign-pair-items.json', 'utf8'))
const files = readdirSync(D).filter(f => /^repair-[\w-]+\.json$/.test(f)).sort()
const repairs = new Map()
for (const f of files) for (const r of JSON.parse(readFileSync(D + f, 'utf8'))) { if (repairs.has(r.id)) console.log(`DUPLICATE repair for ${r.id} in ${f}`); repairs.set(r.id, { ...r, file: f }) }

const val = s => { const t = String(s).trim().replace(/−/g, '-').replace(/[$,%\s]/g, ''); if (/^-?\d+\/\d+$/.test(t)) { const [a, b] = t.split('/').map(Number); return a / b } return Number(t) }
const near = (a, b) => Math.abs(a - b) < 1e-9
const fmtClass = s => { const t = String(s).trim().replace(/−/g, '-'); return /\//.test(t) ? 'frac' : /\./.test(t) ? 'dec' : 'int' }
const printed = stem => [...String(stem).replace(/−/g, '-').matchAll(/-?\d+(?:\.\d+)?(?:\/\d+)?/g)].map(m => val(m[0])).filter(Number.isFinite)
const combos = (a, b) => { const out = [a + b, a - b, b - a, a * b, (a + b) / 2, Math.sqrt(Math.abs(a * b)), (a && b) ? 2 * a * b / (a + b) : NaN]; if (b) out.push(a / b); if (a) out.push(b / a); return out.filter(Number.isFinite) }

let fails = 0, oks = 0, held = 0
for (const it of items) {
  const r = repairs.get(it.id)
  if (!r) { held++; console.log(`HELD ${it.id.slice(0, 8)}  (no repair)`); continue }
  const reasons = []
  if (String(r.old) !== String(it.negated_key_distractor)) reasons.push(`old '${r.old}' != negated '${it.negated_key_distractor}'`)
  const idx = it.choices.findIndex(c => String(c) === String(r.old))
  if (idx < 0) reasons.push('old not in choices')
  const newSet = it.choices.map((c, i) => i === idx ? String(r.new) : c)
  const nums = newSet.map(val)
  const key = val(it.correct_answer), nv = val(r.new)
  if (!Number.isFinite(nv)) reasons.push('new not numeric')
  if (!newSet.includes(String(it.correct_answer))) reasons.push('key missing after repair')
  if (new Set(nums.map(n => n.toFixed(9))).size !== 4) reasons.push('dup value')
  const warns = []
  if (nums.some(a => a !== 0 && nums.some(b => near(a, -b)))) {
    if (nums.some(b => near(nv, -b))) reasons.push('new creates a pair')
    else if (nums.some(b => near(key, -b))) reasons.push('key still in a pair')
    else warns.push('pair among untouched distractors (key outside it)')
  }
  const pr = printed(it.prompt + ' ' + (it.passage ?? ''))
  if (pr.some(p => near(p, nv))) reasons.push('printed echo')
  for (const p of pr) { if (p === 0) continue; for (const c of [key + p, key - p, key * p, key / p, p - key, p / key]) if (Number.isFinite(c) && near(c, nv)) { reasons.push(`new = key op printed(${p})`); break } }
  const others = nums.filter((_, i) => i !== idx)
  for (let i = 0; i < others.length; i++) for (let j = i + 1; j < others.length; j++) if (combos(others[i], others[j]).some(c => near(c, nv))) reasons.push(`new closure of (${others[i]},${others[j]})`)
  const ds = nums.filter(n => !near(n, key))
  for (let i = 0; i < ds.length; i++) for (let j = i + 1; j < ds.length; j++) if (combos(ds[i], ds[j]).some(c => near(c, key))) {
    if (near(ds[i], nv) || near(ds[j], nv)) reasons.push(`key closure of (${ds[i]},${ds[j]}) via new`)
    else warns.push(`pre-existing key closure of (${ds[i]},${ds[j]})`)
  }
  const otherClasses = new Set(newSet.filter((_, i) => i !== idx).map(fmtClass))
  if (!otherClasses.has(fmtClass(r.new))) reasons.push(`format ${fmtClass(r.new)} not among ${[...otherClasses].join('/')}`)
  const preds = { odd: v => Number.isInteger(v) && Math.abs(v % 2) === 1, even: v => Number.isInteger(v) && v % 2 === 0, negative: v => v < 0, nonInteger: v => !Number.isInteger(v), roundTen: v => Number.isInteger(v) && v % 10 === 0 }
  for (const [n, f] of Object.entries(preds)) { const hits = nums.map(f); if (hits.filter(Boolean).length === 1 && hits[nums.findIndex(v => near(v, key))]) reasons.push(`key unique ${n}`) }
  if (r.explanation != null && new RegExp(`(^|[^\\d./-])${String(r.old).replace(/−/g, '-').replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(?![\\d./])`).test(String(r.explanation).replace(/−/g, '-')) && !new RegExp(`(^|[^\\d./-])${String(r.new).replace(/−/g, '-').replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(?![\\d./])`).test(String(r.explanation).replace(/−/g, '-'))) warns.push('explanation may still mention old value')
  if (reasons.length) { fails++; console.log(`FAIL ${it.id.slice(0, 8)}  ${JSON.stringify(newSet)} key ${it.correct_answer}  ${reasons.join('; ')}  [${r.file}]`) }
  else { oks++; console.log(`ok   ${it.id.slice(0, 8)}  ${JSON.stringify(newSet)} key ${it.correct_answer}  new=${r.new}${warns.length ? '  WARN ' + warns.join('; ') : ''}`) }
}
console.log(`\n${items.length} items: ok ${oks}, FAIL ${fails}, held ${held}  (repair files: ${files.join(', ')})`)
process.exit(fails ? 1 : 0)
