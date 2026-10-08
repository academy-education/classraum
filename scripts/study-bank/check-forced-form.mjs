/**
 * check-forced-form.mjs <batch.json> [--expect N] [--json out.json]
 *
 * Does the KEY carry a divisibility or form that FEWER THAN THREE of the four
 * wrong options share?
 *
 * WHY (REGISTER §5, ssat-math-s15, 2026-10-08). 16 of s15's 17 drops were
 * with-source free eliminations, and the class that dominated was a property
 * the STEM forces and the option set does not respect: a total that must be a
 * multiple of the per-unit count (S15A-14, A-27, C-01, E-07), an equilateral
 * area that must carry sqrt(3) (B-14), a cylinder volume whose pi-coefficient
 * must carry the printed height (B-06). The s14 brief had named these classes
 * and the authors wrote them anyway; the authors' own `interval` fields missed
 * every one, because they report the bounds already designed against.
 *
 * So this does not ask the author anything. It reads only the OPTION VALUES:
 * for every property in a fixed battery that the key HAS, it counts the
 * distractors that share it. Fewer than three is a flag. The script cannot see
 * whether the stem forces the property — most flags will be accidental (a key
 * of 12 is even and a multiple of 3 and 4 for no reason). That decision is
 * made by a person reading the stem, which is why a flag is either FIXED (make
 * >= 3 distractors share it) or carries a declared reason in the item's
 * `forced_form_notes` ({ "<property>": "not forced: <why>" }) that is read by
 * hand before the freeze. A declaration is not a pass; it is a line to read.
 *
 * Battery (key must have it; flagged if < 3 of 4 distractors do):
 *   integer             key is a whole number (a count / a length in units)
 *   multiple of d       d = 2..12, on the integer value or on the coefficient
 *                       of a single pi / sqrt(r) term
 *   odd                 key odd
 *   denominator q       key a reduced fraction p/q, distractors must be
 *                       expressible over q (x*q integral)
 *   positive / negative sign of the key
 *   perfect square, perfect cube (integer keys > 1)
 *   carries pi, carries sqrt(r)   symbolic form of the key
 *   percent / dollar / unit text  surface form of the key string
 *
 * Refuses (exit 2) on input it cannot read: not an array, an item without 5
 * or 4 choices, a key not among the choices, or --expect not matching.
 * Exit 1 when any flag has no declared note (OPEN), 0 otherwise.
 *
 * Break-test (2026-10-08, against ssat-math-s15.batch.json, no notes): see the
 * --selftest block, which asserts that the six s15 forced-structure drops
 * (A-14, A-27, C-01, E-07, B-14, B-06) are each flagged.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const selftest = args.includes('--selftest')
const path = selftest ? new URL('./ssat-math-s15.batch.json', import.meta.url).pathname : args.find(a => !a.startsWith('--') && !/^\d+$/.test(a) && !a.endsWith('.out.json'))
const ei = args.indexOf('--expect'); const expect = ei >= 0 ? Number(args[ei + 1]) : null
const ji = args.indexOf('--json'); const jsonOut = ji >= 0 ? args[ji + 1] : null
if (!path) { console.error('usage: check-forced-form.mjs <batch.json> [--expect N] [--json out.json] | --selftest'); process.exit(2) }

let batch
try { batch = JSON.parse(readFileSync(path, 'utf8')) } catch (e) { console.error(`REFUSING: cannot read ${path}: ${e.message}`); process.exit(2) }
if (!Array.isArray(batch)) batch = batch?.items
if (!Array.isArray(batch) || !batch.length) { console.error('REFUSING: no items'); process.exit(2) }
if (expect !== null && batch.length !== expect) { console.error(`REFUSING: ${batch.length} items, expected ${expect}`); process.exit(2) }

/* ---------- parsing an option string into a value + form ---------- */
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a }
function parse(raw) {
  let s = String(raw).trim().replace(/−/g, '-').replace(/,(?=\d{3}\b)/g, '')
  const out = { raw, percent: /%/.test(s), dollar: /\$/.test(s), unitText: null, pi: false, root: null, coef: null, num: null, den: null, value: null }
  s = s.replace(/[%$]/g, '').trim()
  const unit = s.match(/^(-?[\d./]+)\s+([a-zA-Z][a-zA-Z .]*)$/)
  if (unit && !/pi|sqrt/.test(unit[2])) { out.unitText = unit[2].trim(); s = unit[1] }
  // coefficient x pi
  let m = s.match(/^(-?\d+(?:\/\d+)?)?\s*\*?\s*(π|pi)$/)
  if (m) { out.pi = true; s = m[1] ?? '1'; if (s === '-') s = '-1' }
  // coefficient x sqrt(r)
  m = s.match(/^(-?\d+(?:\/\d+)?)?\s*\*?\s*(?:√\(?(\d+)\)?|sqrt\((\d+)\))$/)
  if (m) { out.root = Number(m[2] ?? m[3]); s = m[1] ?? '1'; if (s === '-') s = '-1' }
  m = s.match(/^(-?\d+)\s*\/\s*(\d+)$/)
  if (m) { let p = Number(m[1]), q = Number(m[2]); if (!q) return null; const g = gcd(p, q); p /= g; q /= g; out.num = p; out.den = q; out.value = p / q; return out }
  m = s.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/) // mixed number
  if (m) { const w = Number(m[1]), a = Number(m[2]), b = Number(m[3]); let p = Math.abs(w) * b + a; if (w < 0) p = -p; const g = gcd(p, b); out.num = p / g; out.den = b / g; out.value = p / b; return out }
  m = s.match(/^-?\d*\.?\d+$/)
  if (m) {
    const v = Number(s); out.value = v
    const dec = (s.split('.')[1] || '').length
    const q = 10 ** dec; const p = Math.round(v * q); const g = gcd(p, q) || 1
    out.num = p / g; out.den = q / g; return out
  }
  return null
}
const isInt = o => o && o.den === 1
const props = o => {
  const P = new Map()
  if (!o) return P
  if (o.pi) P.set('carries pi', true)
  if (o.root) P.set(`carries sqrt(${o.root})`, true)
  if (o.percent) P.set('percent form', true)
  if (o.dollar) P.set('dollar form', true)
  if (o.unitText) P.set(`unit "${o.unitText}"`, true)
  const tag = o.pi ? ' (pi-coefficient)' : o.root ? ` (sqrt(${o.root})-coefficient)` : ''
  if (o.value > 0) P.set('positive' + tag, true); else if (o.value < 0) P.set('negative' + tag, true)
  if (isInt(o)) {
    const n = Math.abs(o.num)
    P.set('integer' + tag, true)
    if (n !== 0) for (let d = 2; d <= 12; d++) if (n % d === 0) P.set(`multiple of ${d}${tag}`, true)
    if (n % 2 === 1) P.set('odd' + tag, true)
    if (!tag && n > 1 && Number.isInteger(Math.sqrt(n))) P.set('perfect square', true)
    if (!tag && n > 1 && Number.isInteger(Math.round(Math.cbrt(n))) && Math.round(Math.cbrt(n)) ** 3 === n) P.set('perfect cube', true)
  } else if (o.den) {
    P.set(`denominator ${o.den}${tag}`, true)
  }
  return P
}
/* a distractor shares "denominator q" when it is expressible over q */
function shares(prop, o) {
  if (!o) return false
  const dm = prop.match(/^denominator (\d+)(.*)$/)
  if (dm) { const q = Number(dm[1]); const tagOk = props(o).has('positive' + dm[2]) || props(o).has('negative' + dm[2]) || o.value === 0; return tagOk && o.den != null && q % o.den === 0 }
  return props(o).has(prop)
}

const rows = []; let scorable = 0, unparsed = 0, open = 0, declared = 0
for (const it of batch) {
  const ch = it.choices
  if (!Array.isArray(ch) || (ch.length !== 5 && ch.length !== 4)) { console.error(`REFUSING: ${it.id} has ${ch?.length} choices`); process.exit(2) }
  if (!ch.includes(it.correct_answer)) { console.error(`REFUSING: ${it.id} key not among choices`); process.exit(2) }
  const key = parse(it.correct_answer)
  const dis = ch.filter(c => c !== it.correct_answer).map(parse)
  if (!key) { unparsed++; rows.push({ id: it.id, status: 'non-numeric key (not measured)', flags: [] }); continue }
  scorable++
  const notes = it.forced_form_notes || {}
  const flags = []
  for (const [p] of props(key)) {
    const n = dis.filter(d => shares(p, d)).length
    if (n < 3) {
      const note = notes[p]
      if (note) declared++; else open++
      flags.push({ property: p, distractorsSharing: n, of: dis.length, note: note || null })
    }
  }
  rows.push({ id: it.id, key: it.correct_answer, unparsedDistractors: dis.filter(d => !d).length, flags })
}

const flaggedItems = rows.filter(r => r.flags.length)
console.log(`check-forced-form: ${batch.length} items, key parsed on ${scorable} of ${batch.length} (${unparsed} non-numeric keys NOT measured)`)
console.log(`  items with >= 1 flag: ${flaggedItems.length} of ${scorable}; flags OPEN (no note) ${open}, DECLARED (read by hand) ${declared}`)
for (const r of flaggedItems) {
  for (const f of r.flags) console.log(`  ${f.note ? 'DECLARED' : 'OPEN    '} ${r.id.padEnd(9)} key ${String(r.key).padEnd(10)} ${f.property.padEnd(34)} shared by ${f.distractorsSharing}/${f.of}${f.note ? `  — ${f.note}` : ''}`)
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(rows, null, 1))

if (selftest) {
  const must = { 'S15A-14': 'multiple of 10', 'S15A-27': 'multiple of 6', 'S15C-01': 'multiple of 5', 'S15E-07': 'multiple of 10', 'S15B-14': 'carries sqrt(3)', 'S15B-06': 'multiple of 6 (pi-coefficient)' }
  let bad = 0
  for (const [id, p] of Object.entries(must)) {
    const r = rows.find(x => x.id === id)
    const hit = r?.flags.some(f => f.property === p)
    console.log(`selftest ${id} flags "${p}": ${hit ? 'ok' : 'FAIL'}`); if (!hit) bad++
  }
  // a fixed version must go quiet: give A-27 three more multiples of 6
  const fixed = { ...batch.find(x => x.id === 'S15A-27') }; fixed.choices = ['12', '24', '30', '48', '60']
  const fk = parse(fixed.correct_answer), fd = fixed.choices.filter(c => c !== fixed.correct_answer).map(parse)
  const still = fd.filter(d => shares('multiple of 6', d)).length >= 3 && props(fk).has('multiple of 6')
  console.log(`selftest A-27 with 4 multiples of 6 among distractors -> not flagged on that property: ${still ? 'ok' : 'FAIL'}`); if (!still) bad++
  if (scorable < 100) { console.log(`selftest FAIL: only ${scorable} scorable on s15`); bad++ }
  console.log(bad ? `${bad} selftest failure(s)` : 'selftest clean'); process.exit(bad ? 1 : 0)
}
process.exit(open ? 1 : 0)
