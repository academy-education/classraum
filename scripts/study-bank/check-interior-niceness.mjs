#!/usr/bin/env node
/**
 * check-interior-niceness.mjs [--attack <key.json> <solver.json...> --] <batch.json ...>
 *
 * PRE-FLIGHT, NOT A GATE. Written 2026-10-08 for act-math-v24 from act-math-v23's
 * hold: the key-position tell was gone (13/28/14 by value), but on items whose
 * key was one of the two INTERIOR options the blind samples hit it 56/84 = 66.7%
 * against the matched control's 47/96 = 49.0%. The register's reading: the key
 * was the "cleaner" interior value — 0.80 beside 0.96, 5.60 beside 5.29.
 *
 * For each item with four numeric options it sorts by value, takes the two
 * interior options (ranks 2 and 3), and scores each for "niceness" with a
 * display complexity a solver sees at a glance:
 *
 *   decimal / integer   significant digits + decimal places, trailing zeros
 *                       stripped first (5.60 -> 5.6 = 3; 288 = 3; 20 = 1;
 *                       0.96 = 4; 1792.42 = 8)
 *   fraction a/b        c(a) + c(b) + 1          (1/4 = 3, 19/36 = 5, 336/625 = 7)
 *   anything else       digits + symbols (√, π, ^, letters), e.g. 3√13 = 4
 *
 * and a FORM class (integer / decimal-1dp / decimal-2dp / ... / fraction /
 * radical / other). It prints, per file:
 *
 *   - interior-key items, and how often the key is the CLEANER interior option
 *     (strictly lower complexity) among those where the two differ; chance 50%
 *   - interior PARITY violations (v24 rule): the two interior options differ in
 *     form class, or in complexity by >= 2
 *   - complement pairs: any two options summing to 1, 90, 180 or 360 (or 100
 *     when the options carry %), and whether the key is in the pair
 *   - shared-denominator singling: among fraction options, the key's
 *     denominator class has a size no other class has ({2,1,1} with the key in
 *     the pair, {3,1} either way)
 *
 * With --attack, it joins the options-only attack (key file + solver files,
 * '--' ends the list) by candidate localId AND by the live-control rows, and
 * prints the blind hit rate on interior-key items split by key-cleaner / tie /
 * key-messier, per arm. That is the break-test: on v23 the key-cleaner stratum
 * should carry the candidate gap.
 *
 * BREAK-TEST ON v23 (2026-10-08) — the register's narrow hypothesis was WRONG
 * and the parity rule survives. Candidate keys were the cleaner interior option
 * on only 6/20 differing pairs (30.0%; controls 9/12 = 75.0%), so "the key is
 * the nicer value" does not describe v23. What does: the interior pair was
 * ASYMMETRIC on 20/28 candidate interior-key items vs 12/32 controls, and the
 * blind samples hit asymmetric-pair keys in BOTH directions (candidates 44/60,
 * controls 28/36) far above tie pairs (candidates 12/24, controls 19/60).
 * Asymmetry is the information, whichever way it points. So the headline line
 * is the asymmetric share, and the key-cleaner split is secondary.
 *
 * Refuses (exit 2) when it scores nothing, when a batch file is unreadable, or
 * when an attack file's ids do not join. Never prints a rate without its
 * denominator. Exit 0 otherwise: it is a reading list, not a verdict.
 */
import { readFileSync } from 'node:fs'
import { val } from './key-extremity-breakdown.mjs'

const eq = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
const norm = s => String(s).trim().replace(/[−–]/g, '-').replace(/^\$\s*/, '').replace(/^-\s*\$/, '-').replace(/\s*(degrees|°)$/, '')
function plainC(t) {
  t = t.replace(/^[-+]/, '').replace(/,/g, '').replace(/%$/, '')
  if (!/^\d*\.?\d+$/.test(t)) return null
  let [ip, fp = ''] = t.split('.')
  fp = fp.replace(/0+$/, '')
  ip = ip.replace(/^0+/, '')
  const digits = (ip + fp).replace(/^0+/, '')
  const sig = fp ? digits.length : digits.replace(/0+$/, '').length
  return { c: Math.max(sig, 1) + fp.length, dp: fp.length }
}
export function niceness(raw) {
  const s = norm(raw)
  const p = plainC(s)
  if (p) return { c: p.c, form: p.dp ? `decimal-${p.dp}dp` : 'integer' }
  const f = s.replace(/^-/, '').match(/^(\d+)\/(\d+)$/)
  if (f) return { c: plainC(f[1]).c + plainC(f[2]).c + 1, form: 'fraction', den: Number(f[2]) }
  const digits = (s.match(/\d/g) || []).length
  const syms = (s.match(/[√π^a-zA-Z]/g) || []).length
  return { c: digits + syms, form: /√/.test(s) ? 'radical' : 'other' }
}

const args = process.argv.slice(2)
if (args[0] === '--selftest') {
  const fails = []
  const t = (cond, msg) => { if (!cond) fails.push(msg) }
  t(niceness('5.60').c === 3 && niceness('5.29').c === 5, 'decimal complexity (5.60=3, 5.29=5)')
  t(niceness('0.96').c === 4 && niceness('0.80').c === 2 && niceness('288').c === 3 && niceness('20').c === 1, 'plain complexity')
  t(niceness('336/625').c === 7 && niceness('1/4').c === 3, 'fraction complexity')
  t(niceness('3√13').c === 4 && niceness('3√13').form === 'radical', 'radical')
  const a07 = analyse(['0.51', '0.80', '0.96', '1.00'], '0.96')   // AM23A-07: key messier, parity broken
  t(a07.keyCleaner === 'messier' && a07.parity, 'AM23A-07 messier + parity')
  const g02 = analyse(['5.29', '6.00', '5.60', '3.87'], '5.60')   // AM23G-02: key cleaner
  t(g02.keyCleaner === 'cleaner' && g02.parity, 'AM23G-02 cleaner + parity')
  const sym = analyse(['4.17', '5.38', '6.29', '7.41'], '5.38')    // a parity-clean control: must be a tie, no flags
  t(sym.keyCleaner === 'tie' && !sym.parity && !sym.comps.length && !sym.denom, 'symmetric item stays quiet')
  t(analyse(['3/4', '1/4', '2/3', '3/10'], '1/4').comps.some(c => c.key && c.sum === 1), 'AM23S-02 complement')
  t(analyse(['14/25', '527/625', '336/625', '7/12'], '336/625').denom?.keyGroupSize === 2, 'AM23F-07 shared denominator')
  t(!analyse(['1/8', '3/8', '5/12', '7/12'], '3/8').denom, '{2,2} denominators stay quiet')
  t(analyse(['x', '1', '2', '3'], '1').skip === 'non-numeric', 'non-numeric is skipped, not scored')
  if (fails.length) { console.error('SELFTEST FAIL: ' + fails.join('; ')); process.exit(1) }
  console.log('selftest 11/11 pass'); process.exit(0)
}
let attack = null
const ai = args.indexOf('--attack')
if (ai >= 0) {
  const end = args.indexOf('--', ai)
  if (end < 0) { console.error('REFUSING: --attack list must end with --'); process.exit(2) }
  const [keyPath, ...solvers] = args.slice(ai + 1, end)
  args.splice(ai, end - ai + 1)
  if (!keyPath || !solvers.length) { console.error('REFUSING: --attack needs a key file and >= 1 solver file'); process.exit(2) }
  const rd = p => { try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { console.error(`REFUSING: ${p}: ${e.message}`); process.exit(2) } }
  attack = { key: rd(keyPath), solvers: solvers.map(rd), keyPath }
  for (const [i, s] of attack.solvers.entries()) {
    const miss = Object.keys(attack.key).filter(id => !s[id]?.pick)
    if (miss.length) { console.error(`REFUSING: solver ${solvers[i]} lacks picks for ${miss.length} ids (${miss.slice(0, 3)})`); process.exit(2) }
  }
}
if (!args.length) { console.error('usage: check-interior-niceness.mjs [--attack key.json solver.json... --] <batch.json ...>'); process.exit(2) }

export function analyse(choices, key) {
  choices = choices.map(String); key = String(key)
  if (choices.length !== 4 || !choices.includes(key)) return { skip: 'shape' }
  const v = choices.map(val)
  if (v.some(x => !Number.isFinite(x))) return { skip: 'non-numeric' }
  const order = choices.map((c, i) => ({ c, v: v[i] })).sort((a, b) => a.v - b.v)
  if (order.some((o, i) => i && eq(o.v, order[i - 1].v))) return { skip: 'tied values' }
  const rank = order.findIndex(o => o.c === key)
  const [lo, hi] = [order[1], order[2]]
  const nl = niceness(lo.c), nh = niceness(hi.c)
  const parity = nl.form !== nh.form || Math.abs(nl.c - nh.c) >= 2
  let keyCleaner = null
  if (rank === 1 || rank === 2) {
    const nk = rank === 1 ? nl : nh, no = rank === 1 ? nh : nl
    keyCleaner = nk.c < no.c ? 'cleaner' : nk.c > no.c ? 'messier' : 'tie'
  }
  const pct = choices.some(c => /%$/.test(c))
  const targets = [1, 90, 180, 360, ...(pct ? [100] : [])]
  const comps = []
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) for (const t of targets) if (eq(v[i] + v[j], t)) comps.push({ pair: [choices[i], choices[j]], sum: t, key: choices[i] === key || choices[j] === key })
  let denom = null
  const ns = choices.map(niceness)
  const fr = ns.filter(n => n.form === 'fraction')
  if (fr.length >= 3) {
    const groups = {}
    choices.forEach((c, i) => { const g = ns[i].den ?? `nonfrac:${ns[i].form}`; (groups[g] ??= []).push(c) })
    const sizes = Object.values(groups).map(g => g.length)
    const kg = Object.values(groups).find(g => g.includes(key))
    const uniqueSize = sizes.filter(s => s === kg.length).length === 1
    if (uniqueSize && sizes.length > 1 && sizes.length < 4) denom = { groups: Object.values(groups), keyGroupSize: kg.length }
  }
  return { rank, interior: [lo.c, hi.c], nl, nh, parity, keyCleaner, comps, denom }
}

function report(label, items) {
  const rows = items.map(it => ({ it, a: analyse(it.choices, it.correct_answer) }))
  const sc = rows.filter(r => !r.a.skip)
  console.log(`\n### ${label}: ${sc.length} scorable of ${rows.length}` + (rows.length - sc.length ? ` (skipped ${rows.length - sc.length}: ${[...new Set(rows.filter(r => r.a.skip).map(r => r.a.skip))].join(', ')})` : ''))
  if (!sc.length) return null
  const inter = sc.filter(r => r.a.keyCleaner)
  const cl = inter.filter(r => r.a.keyCleaner === 'cleaner').length, me = inter.filter(r => r.a.keyCleaner === 'messier').length, ti = inter.length - cl - me
  const differ = cl + me
  console.log(`  interior-key items with an ASYMMETRIC interior pair (complexity differs): ${differ}/${inter.length}` + (inter.length ? ` = ${(100 * differ / inter.length).toFixed(1)}%` : ''))
  console.log(`  interior-key items ${inter.length} of ${sc.length}: key CLEANER ${cl}, messier ${me}, tie ${ti}` + (differ ? `  -> key cleaner on ${cl}/${differ} = ${(100 * cl / differ).toFixed(1)}% of differing pairs (chance 50%)` : '  -> no differing pairs, NOT MEASURED'))
  const par = sc.filter(r => r.a.parity)
  console.log(`  interior PARITY violations ${par.length}/${sc.length} (form differs or complexity gap >= 2); on interior-key items ${par.filter(r => r.a.keyCleaner).length}/${inter.length}`)
  const comp = sc.filter(r => r.a.comps.length)
  console.log(`  complement pairs ${comp.length}/${sc.length} items (key in pair ${comp.filter(r => r.a.comps.some(c => c.key)).length})`)
  const den = sc.filter(r => r.a.denom)
  console.log(`  shared-denominator singling ${den.length}/${sc.filter(r => r.it.choices.map(niceness).filter(n => n.form === 'fraction').length >= 3).length} fraction items`)
  for (const r of sc) {
    const f = []
    if (r.a.keyCleaner === 'cleaner') f.push(`KEY-CLEANER interior ${r.a.interior.join(' | ')} (c ${r.a.nl.c}/${r.a.nh.c})`)
    if (r.a.parity) f.push(`parity ${r.a.nl.form}:${r.a.nl.c} vs ${r.a.nh.form}:${r.a.nh.c}`)
    for (const c of r.a.comps) f.push(`complement ${c.pair.join('+')}=${c.sum}${c.key ? ' (key)' : ''}`)
    if (r.a.denom) f.push(`denominators ${r.a.denom.groups.map(g => '{' + g.join(',') + '}').join(' ')} key-group size ${r.a.denom.keyGroupSize}`)
    if (f.length) console.log(`    ${String(r.it.id ?? '?').padEnd(14)} key ${String(r.it.correct_answer).padEnd(9)} ${f.join('; ')}`)
  }
  return { rows: sc, cl, me, ti, differ, par: par.length }
}

let any = false
const byId = new Map()
for (const f of args) {
  let items
  try { items = JSON.parse(readFileSync(f, 'utf8')) } catch (e) { console.error(`REFUSING: ${f}: ${e.message}`); process.exit(2) }
  if (!Array.isArray(items) || !items.length) { console.error(`REFUSING: ${f} holds no items`); process.exit(2) }
  for (const it of items) byId.set(String(it.id), it)
  if (report(f.split('/').pop(), items)) any = true
}
if (!any) { console.error('REFUSING: nothing scored'); process.exit(2) }

if (attack) {
  console.log(`\n### attack join: ${attack.keyPath} x ${attack.solvers.length} samples`)
  const arms = {}
  let unjoined = 0
  for (const [bid, k] of Object.entries(attack.key)) {
    const it = byId.get(String(k.localId))
    if (!it) { unjoined++; continue }
    const a = analyse(it.choices, it.correct_answer)
    if (a.skip || !a.keyCleaner) continue
    const arm = (arms[k.kind] ??= { cleaner: [0, 0], messier: [0, 0], tie: [0, 0] })
    for (const s of attack.solvers) { arm[a.keyCleaner][1]++; if (s[bid].pick === k.letter) arm[a.keyCleaner][0]++ }
  }
  const joined = Object.keys(attack.key).length - unjoined
  console.log(`  joined ${joined} of ${Object.keys(attack.key).length} attack ids to the batch files given (pass the controls file to score the control arm)`)
  if (!joined) { console.error('REFUSING: no attack id joined'); process.exit(2) }
  for (const [kind, arm] of Object.entries(arms)) {
    const tot = ['cleaner', 'messier', 'tie'].reduce((s, x) => [s[0] + arm[x][0], s[1] + arm[x][1]], [0, 0])
    const p = ([h, n]) => n ? `${h}/${n} = ${(100 * h / n).toFixed(1)}%` : '0/0 (none)'
    const asym = [arm.cleaner[0] + arm.messier[0], arm.cleaner[1] + arm.messier[1]]
    console.log(`  ${kind.padEnd(13)} interior-key picks ${p(tot)} | ASYMMETRIC pair ${p(asym)} (key cleaner ${p(arm.cleaner)}, key messier ${p(arm.messier)}) | tie ${p(arm.tie)}`)
  }
}
