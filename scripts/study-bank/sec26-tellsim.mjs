#!/usr/bin/env node
/**
 * sec26-tellsim.mjs — prereg-time CROSS-ITEM TELL check for sat-sec-hard-v26
 * (PREREG-SEC26-2026-10-23.md, "Cross-item tell check"). Adapted from ii23-tellsim.mjs.
 *
 *   node sec26-tellsim.mjs --table [<SLOTS.json>]     the planned slot table, before any item
 *                                                     (default sat-sec-v26-work/SLOTS.json)
 *   node sec26-tellsim.mjs --work  <dir>              the authors' files: <dir>/{A,B,C,D}/items.json
 *                                                     + declarations.json, parsed from the OPTION TEXT
 *                                                     with sec26-parse.mjs (the counts script's parser)
 *   [--slots <SLOTS.json>]                            with --work: the table to read the rows from (default
 *                                                     sat-sec-v26-work/SLOTS.json); used to replay SEC25's files
 *   [--verbose]                                       print every rule's score
 *
 * WHY. In SEC25 the construction table itself built two rules that held across every item of a kind,
 * and all three graders named both: in every verb+pronoun grid the key paired OPPOSITE numbers (10/10),
 * and a present-perfect option never won (5/5). The template cover then held 20 of 29. Both rules were
 * visible in the table before any author wrote a word. This script plays a test-wise student who has
 * seen many items of the batch: for each kind of item it searches the shortcut rules over what can be
 * seen WITHOUT doing the grammar, and reports the best one.
 *
 * MODEL. Every option carries surface features a student can read without parsing the sentence:
 *   agreement (2x2 grids)
 *     num    the verb's number                                   sg | pl
 *     near   num against the noun just before the blank          agr | opp
 *     first  num against the first noun of the sentence          agr | opp
 *     after  num against the first noun after the blank          agr | opp | none
 *     d2     the second dimension's value                        past/present | perfect/nonperfect |
 *                                                                have/be/do | the pronoun's number
 *     been   the option contains "been" or "being"               y | n
 *     match  pronoun grids: pronoun number = verb number         y | n   (SEC25's 10/10 rule)
 *     pnear  pronoun grids: pronoun number against the near noun agr | opp
 *   boundary (four options, same words)
 *     mark   the mark the option adds (garden-path rows: a single mark at EITHER position reads the
 *            same, "comma-pos" / "semicolon-pos", because no student can tell the right position
 *            without parsing)
 *     strong ; : . — ? present          y | n
 *     bare   no mark at all             y | n
 *     nmarks 0 | 1 | 2
 *     misplaced  a single mark one word off its slot (non-garden rows)   y | n
 *   noun form ({X, X's, Xs, Xs'})
 *     poss y | n;  plural y | n
 * Nothing here is the construct: the true subject's number and the decider's verdict cannot be read
 * off the surface, so every rule over these features is a shortcut and is scored.
 *
 * STRATA. A student sees which kind of grid an item is, so rules are searched separately per stratum:
 * agreement items by second dimension (tense | aspect | aux | pronoun), boundary, noun. The agreement
 * features num / near / first / after are ALSO searched pooled over every agreement item (a student
 * applies "opposite the noun before the blank" to all of them), and the worse of the two is barred.
 *
 * BARS ARE PER ITEM TYPE (agreement | boundary | noun), so a clean stratum cannot dilute a leaky one
 * of another type; within agreement the four grid kinds are strata (the student sees which kind).
 *
 * RULES   single  f = v or f != v
 *         pair    f1 (=|!=) v1 AND f2 (=|!=) v2
 *         odd     the option whose value of f is unique in its item
 *         surface key letter, per stratum
 * Expected accuracy of a rule on an item = 1/|picked| if it picks the key, 0 if not, 1/4 if it picks
 * nothing. A stratum score is the best rule's mean; the batch score is the n-weighted sum of strata.
 *
 * BARS (pre-registered in PREREG-SEC26; exit 1 if any is missed). Chance is 0.25 on every item.
 *   B1 best single-feature rule <= 0.35 per type, stratum-conditioned, and pooled over agreement items (a binary feature that always
 *      sides with the key scores 0.50 on a 2x2; SEC25's table scores 0.50 on pronoun and aspect items)
 *   B2 best pair rule <= 0.45 per type (a pair that always picks the key scores 1.00)
 *   B3 one rule picks the key ALONE in <= 50% of any stratum with n >= 4
 *   B4 key-letter rule <= 0.35 per type (the most common key letter within each stratum)
 *   B5 key-value shares: in every agreement stratum with n >= 4 no second-dimension key value in more
 *      than 60% of items; pronoun grids: matched pairs keyed in 40-60%; aspect grids: perfect keyed in
 *      40-60%; boundary: no key mark in more than 3 items, bare key <= 2, lone-strong key <= 2;
 *      noun forms: every class keyed at most once more than any other
 *   B6 letters: 10 per letter batch-wide; each author 3/3/2/2; author sequences distinct; aligned
 *      quads of the frozen order (slot order) that are a full ABCD permutation <= 3 of 10, and sliding
 *      4-windows that are a permutation <= 30% (SEC25's frozen order: quads 100%)
 *   B7 no mechanism family larger than 10 items, no boundary family larger than 4 (the template cover
 *      refuses a component over 20 and holds k-1 of a majority-named group)
 *
 * LIMITS, stated so nobody quotes this as a clearance. It sees declared or parsed ROLES, not words:
 * not a uniquely hedged option, not the passage (a planted "since" is visible to a reader and not to
 * this script), not a semantic tell, not option length. Passing it means the TABLE (or the files'
 * option structure) does not hand a student a rule over roles; the probe and the panel judge items.
 *
 * EXIT 0 all bars met; 1 a bar missed; 2 refused (no/empty input, malformed row, unknown flag,
 * duplicate slot or id, declarations missing or not matching the items).
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseItem, possOf, marksOf, dimension, dimKey, PERFECT } from './sec26-parse.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
let mode = null, path = null, verbose = false, slotsArg = null
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--verbose') verbose = true
  else if (a === '--slots') { slotsArg = args[++i]; if (!slotsArg || slotsArg.startsWith('--')) die('--slots needs a path') }
  else if (a === '--table' || a === '--work') {
    if (mode) die('give exactly one of --table / --work')
    mode = a.slice(2)
    if (args[i + 1] && !args[i + 1].startsWith('--')) path = args[++i]
  } else die(`unknown argument ${a}`)
}
if (!mode) die('usage: sec26-tellsim.mjs --table [<SLOTS.json>] | --work <dir> [--verbose]')
if (mode === 'table' && !path) path = join(HERE, 'sat-sec-v26-work', 'SLOTS.json')
if (mode === 'work' && !path) die('--work needs a directory')
const rd = p => { if (!existsSync(p)) die(`${p} missing`); try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { die(`${p}: ${e.message}`) } }
const LET = ['A', 'B', 'C', 'D']
const AUTH = ['A', 'B', 'C', 'D']
const other = n => (n === 'sg' ? 'pl' : 'sg')
const GARDEN = new Set()   // slots whose comma positions are indistinguishable without parsing

/* ---------- the table (always read: --work needs the garden rows and the families) ---------- */
if (slotsArg && mode === 'table') die('--slots goes with --work (with --table, name the table directly)')
const tablePath = mode === 'table' ? path : (slotsArg ?? join(HERE, 'sat-sec-v26-work', 'SLOTS.json'))
const table = rd(tablePath)
if (!table || !Array.isArray(table.slots) || !table.slots.length) die(`${tablePath} has no slots`)
const ROW = {}
for (const s of table.slots) {
  if (!s || typeof s.slot !== 'string' || !/^[ABCD](10|[1-9])$/.test(s.slot)) die(`slot "${s?.slot}" must be like A1..D10`)
  if (ROW[s.slot]) die(`duplicate slot ${s.slot}`)
  if (!['agr', 'punct', 'poss'].includes(s.class)) die(`${s.slot}: class must be agr | punct | poss`)
  if (!LET.includes(s.letter)) die(`${s.slot}: letter must be A-D`)
  if (typeof s.family !== 'string' || !s.family) die(`${s.slot}: family missing`)
  ROW[s.slot] = s
  if (s.class === 'punct' && s.garden) GARDEN.add(s.slot)
}
const PREFIX = table.id_prefix ?? 'SEC26'
const slotOf = id => { const m = new RegExp(`^${PREFIX}([ABCD])-(\\d\\d)$`).exec(id); return m ? `${m[1]}${Number(m[2])}` : null }

/* ---------- build option feature rows ---------- */
const STRONGM = new Set(['semicolon', 'colon', 'period', 'dash', 'question', 'dash pair'])
function punctOpts(marks, keyIdx, garden) {
  return marks.map((m0, i) => {
    let m = String(m0)
    const misplaced = /@shifted$/.test(m)
    // garden-path rows: a single mark at EITHER position reads the same to a student who has not parsed
    if (garden && /^[a-z]+(@shifted)?$/.test(m) && m !== 'none') m = m.replace(/@shifted$/, '') + '-pos'
    const base = m.replace(/@shifted$/, '').replace(/-pos$/, '')
    const nm = m === 'none' ? 0 : /pair|^mixed/.test(m) ? 2 : 1
    return { key: i === keyIdx, mark: garden ? m : misplaced ? 'misplaced' : base, strong: STRONGM.has(base) ? 'y' : 'n', bare: m === 'none' ? 'y' : 'n', nmarks: String(nm), misplaced: !garden && misplaced ? 'y' : 'n' }
  })
}
function possOpts(classes, keyIdx) {
  return classes.map((c, i) => ({ key: i === keyIdx, form: c, poss: /poss/.test(c) ? 'y' : 'n', plural: /^pl/.test(c) ? 'y' : 'n' }))
}
// agreement: options are {key, other} number x {key, other} second-dimension value
function agrOpts({ keyNum, nearNum, firstNum, afterNum, dim, dKey, dOther, beenKey, beenOther }) {
  const out = []
  for (const num of [keyNum, other(keyNum)]) for (const d of [dKey, dOther]) {
    const o = { key: num === keyNum && d === dKey, num, near: num === nearNum ? 'agr' : 'opp', first: num === firstNum ? 'agr' : 'opp',
      after: afterNum ? (num === afterNum ? 'agr' : 'opp') : 'none', d2: d, been: (d === dKey ? beenKey : beenOther) ? 'y' : 'n' }
    if (dim === 'pronoun') { o.match = d === num ? 'y' : 'n'; o.pnear = d === nearNum ? 'agr' : 'opp' }
    out.push(o)
  }
  return out
}
const BEEN = new Set(['e', 'f', 'r', 'k', 'l'])
const D2OTHER = { tense: { past: 'present', present: 'past' }, aspect: { perfect: 'nonperfect', 'non-perfect': 'perfect', nonperfect: 'perfect' } }
const items = []
if (mode === 'table') {
  for (const s of table.slots) {
    const where = s.slot
    if (s.class === 'agr') {
      for (const f of ['key', 'near']) if (!['sg', 'pl'].includes(s[f])) die(`${where}: ${f} must be sg | pl`)
      if (!['agr', 'opp'].includes(s.first)) die(`${where}: first must be agr | opp`)
      if (!['agr', 'opp', 'free'].includes(s.after ?? 'free')) die(`${where}: after must be agr | opp | free`)
      if (!['tense', 'aspect', 'aux', 'pronoun'].includes(s.dim)) die(`${where}: dim must be tense | aspect | aux | pronoun`)
      if (typeof s.grid !== 'string' || typeof s.code !== 'string') die(`${where}: grid and code required`)
      const codes = s.grid.replace('+p', '').split('|')
      if (!codes.includes(s.code)) die(`${where}: key code ${s.code} not in grid ${s.grid}`)
      let dKey = s.dkey, dOther
      if (s.dim === 'pronoun') { if (!['sg', 'pl'].includes(s.dkey)) die(`${where}: pronoun dkey must be sg | pl`); dOther = other(s.dkey) }
      else if (s.dim === 'aux') { const oc = codes.find(c => c !== s.code); dOther = { m: 'do', n: 'have', i: 'be', j: 'be' }[oc]; if (!['do', 'have', 'be'].includes(dKey) || !dOther || dOther === dKey) die(`${where}: aux grid ${s.grid} with key ${dKey}`) }
      else { if (dKey === 'non-perfect') dKey = 'nonperfect'; dOther = D2OTHER[s.dim]?.[dKey]; if (!dOther) die(`${where}: ${s.dim} dkey ${s.dkey}`) }
      const oc = codes.length === 2 ? codes.find(c => c !== s.code) : s.code
      const firstNum = s.first === 'agr' ? s.key : other(s.key)
      const afterNum = s.after === 'agr' ? s.key : s.after === 'opp' ? other(s.key) : null
      items.push({ slot: where, author: where[0], letter: s.letter, family: s.family, stratum: s.dim, agr: true,
        opts: agrOpts({ keyNum: s.key, nearNum: s.near, firstNum, afterNum, dim: s.dim, dKey, dOther, beenKey: BEEN.has(s.code), beenOther: BEEN.has(oc) }) })
    } else if (s.class === 'punct') {
      if (!Array.isArray(s.marks) || s.marks.length !== 4) die(`${where}: marks must list the four options' marks`)
      const ki = s.marks.indexOf(s.key)
      if (ki < 0) die(`${where}: key mark ${s.key} is not among its marks`)
      if (s.marks.filter(m => m === s.key).length !== 1) die(`${where}: key mark ${s.key} appears twice`)
      items.push({ slot: where, author: where[0], letter: s.letter, family: s.family, stratum: 'boundary', opts: punctOpts(s.marks, ki, !!s.garden) })
    } else {
      const C = ['sg', 'sg-poss', 'pl', 'pl-poss']
      if (!C.includes(s.key)) die(`${where}: noun key must be one of ${C.join(', ')}`)
      items.push({ slot: where, author: where[0], letter: s.letter, family: s.family, stratum: 'noun', opts: possOpts(C, C.indexOf(s.key)) })
    }
  }
} else {
  let seen = 0
  for (const a of AUTH) {
    const fi = `${path}/${a}/items.json`, fd = `${path}/${a}/declarations.json`
    if (!existsSync(fi)) continue
    const arr = rd(fi)
    if (!Array.isArray(arr) || !arr.length) die(`${fi} holds no items`)
    const decl = rd(fd)
    if (!Array.isArray(decl)) die(`${fd} is not an array`)
    const D = {}
    for (const d of decl) { if (!d || typeof d.id !== 'string') die(`${fd}: a declaration has no id`); if (D[d.id]) die(`${fd}: duplicate declaration ${d.id}`); D[d.id] = d }
    const ids = arr.map(x => x?.id)
    if (new Set(ids).size !== ids.length) die(`${fi}: duplicate ids`)
    const dk = Object.keys(D).sort(), ik = ids.slice().sort()
    if (dk.join() !== ik.join()) die(`${fd} ids do not match ${fi}`)
    for (const it of arr) {
      const slot = slotOf(it.id)
      if (!slot || slot[0] !== a || !ROW[slot]) die(`${fi}: ${it.id} is not a ${PREFIX}${a}-NN table slot`)
      if (!Array.isArray(it.choices) || it.choices.length !== 4 || !it.choices.includes(it.correct_answer)) die(`${it.id}: needs 4 choices with the key among them`)
      const k = it.choices.indexOf(it.correct_answer), row = ROW[slot], d = D[it.id]
      const strip = c => c.toLowerCase().replace(/[.,;:—–"'()?-]/g, ' ').replace(/\s+/g, ' ').trim()
      const base = { slot, id: it.id, author: a, letter: LET[k], family: row.family }
      if (new Set(it.choices.map(strip)).size === 1) {
        items.push({ ...base, stratum: 'boundary', opts: punctOpts(marksOf(it.choices, k), k, GARDEN.has(slot)) })
      } else if (possOf(it.choices)) {
        items.push({ ...base, stratum: 'noun', opts: possOpts(possOf(it.choices), k) })
      } else {
        const { parsed, pronVaries } = parseItem(it.choices)
        const codes = [...new Set(parsed.map(p => p.code))]
        if (parsed.some(p => !p.number)) die(`${it.id}: an option carries no verb number (the counts script reads it as an incomplete grid; fix that first)`)
        const nearNum = d.near_noun?.number, firstNum = d.first_noun_of_sentence?.number
        if (!['sg', 'pl'].includes(nearNum) || !['sg', 'pl'].includes(firstNum)) die(`${it.id}: declaration near_noun / first_noun_of_sentence number missing`)
        const afterNum = d.after_noun_within_8?.number ?? null
        let dim, val
        if (pronVaries) { dim = 'pronoun'; val = p => p.pron }
        else {
          if (codes.length !== 2) die(`${it.id}: ${codes.length} verb forms (${codes.join(',')}); not a 2x2`)
          dim = dimension(codes[0], codes[1])
          if (!['tense', 'aspect', 'aux'].includes(dim)) die(`${it.id}: second dimension ${dim} is not one this batch uses`)
          val = p => { const v = dimKey(dim, p.code); return v === 'non-perfect' ? 'nonperfect' : v }
        }
        const opts = parsed.map((p, i) => {
          const o = { key: i === k, num: p.number, near: p.number === nearNum ? 'agr' : 'opp', first: p.number === firstNum ? 'agr' : 'opp',
            after: afterNum ? (p.number === afterNum ? 'agr' : 'opp') : 'none', d2: val(p),
            been: /\bbe(en|ing)\b/i.test(it.choices[i]) ? 'y' : 'n' }
          if (dim === 'pronoun') { o.match = p.pron === p.number ? 'y' : 'n'; o.pnear = p.pron === nearNum ? 'agr' : 'opp' }
          return o
        })
        items.push({ ...base, stratum: dim, agr: true, opts })
      }
      seen++
    }
  }
  if (!seen) die(`no items under ${path}/<A-D>/items.json`)
}
if (!items.length) die('no items')

/* ---------- rule search ---------- */
const score = (it, pick) => { const p = it.opts.filter(pick); if (!p.length) return { acc: 0.25, uniq: false }; const k = p.some(o => o.key); return { acc: k ? 1 / p.length : 0, uniq: k && p.length === 1 } }
function rules(its, feats) {
  const vals = f => [...new Set(its.flatMap(i => i.opts.map(o => o[f])).filter(v => v !== undefined))]
  const R = []
  for (const f of feats) for (const v of vals(f)) {
    R.push({ name: `${f}=${v}`, pick: o => o[f] === v })
    R.push({ name: `${f}!=${v}`, pick: o => o[f] !== undefined && o[f] !== v })
  }
  for (let i = 0; i < feats.length; i++) for (let j = i + 1; j < feats.length; j++) {
    const f1 = feats[i], f2 = feats[j]
    for (const v1 of vals(f1)) for (const v2 of vals(f2)) for (const [n1, n2] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      R.push({ name: `${f1}${n1 ? '!=' : '='}${v1} & ${f2}${n2 ? '!=' : '='}${v2}`, pair: true,
        pick: o => o[f1] !== undefined && o[f2] !== undefined && (n1 ? o[f1] !== v1 : o[f1] === v1) && (n2 ? o[f2] !== v2 : o[f2] === v2) })
    }
  }
  for (const f of feats) R.push({ name: `odd-one-out on ${f}`, odd: f })
  return R
}
const pickFor = (r, it) => {
  if (!r.odd) return r.pick
  const c = {}; for (const o of it.opts) c[o[r.odd]] = (c[o[r.odd]] ?? 0) + 1
  return o => o[r.odd] !== undefined && c[o[r.odd]] === 1
}
function best(its, feats) {
  const R = rules(its, feats)
  const res = { single: { s: -1 }, pair: { s: -1 }, uniq: { u: -1 } }
  for (const r of R) {
    let s = 0, u = 0
    for (const it of its) { const x = score(it, pickFor(r, it)); s += x.acc; if (x.uniq) u++ }
    if (verbose) console.log(`    ${(s / its.length).toFixed(3)}  ${r.name}`)
    const kind = r.pair ? 'pair' : 'single'
    if (s > res[kind].s) res[kind] = { s, name: r.name }
    if (u > res.uniq.u) res.uniq = { u, name: r.name }
  }
  return res
}
const FEATS = {
  tense: ['num', 'near', 'first', 'after', 'd2', 'been'], aspect: ['num', 'near', 'first', 'after', 'd2', 'been'],
  aux: ['num', 'near', 'first', 'after', 'd2'], pronoun: ['num', 'near', 'first', 'after', 'd2', 'match', 'pnear'],
  boundary: ['mark', 'strong', 'bare', 'nmarks', 'misplaced'], noun: ['form', 'poss', 'plural'],
}
const ORDER = ['pronoun', 'tense', 'aspect', 'aux', 'boundary', 'noun']
const TYPES = [['agreement', ['pronoun', 'tense', 'aspect', 'aux']], ['boundary', ['boundary']], ['noun', ['noun']]]
let fail = false
const N = items.length
console.log(`${N} items from ${path}: ${ORDER.map(s => `${s} ${items.filter(i => i.stratum === s).length}`).join(', ')}`)
const per = {}
const uniqFails = []
console.log('\nPER STRATUM (best rule within each kind of item; chance 0.250)')
for (const st of ORDER) {
  const its = items.filter(i => i.stratum === st)
  if (!its.length) continue
  const b = best(its, FEATS[st])
  const lc = {}; for (const it of its) lc[it.letter] = (lc[it.letter] ?? 0) + 1
  const [bl, bc] = Object.entries(lc).sort((x, y) => y[1] - x[1])[0]
  per[st] = { n: its.length, single: b.single.s, pair: b.pair.s, letter: bc }
  console.log(`  ${st.padEnd(9)} n=${String(its.length).padStart(2)}  single ${(b.single.s / its.length).toFixed(3)} (${b.single.name})  pair ${(b.pair.s / its.length).toFixed(3)} (${b.pair.name})  unique ${b.uniq.u}/${its.length} (${b.uniq.name})  letter ${bl} ${bc}/${its.length}`)
  if (its.length >= 4 && b.uniq.u / its.length > 0.50 + 1e-9) uniqFails.push(`${st} ${b.uniq.u}/${its.length} by "${b.uniq.name}"`)
}
const A = items.filter(i => i.agr)
const pooled = A.length ? best(A, ['num', 'near', 'first', 'after']) : null
if (pooled) console.log(`  pooled over all ${A.length} agreement items (num/near/first/after): single ${(pooled.single.s / A.length).toFixed(3)} (${pooled.single.name})  pair ${(pooled.pair.s / A.length).toFixed(3)} (${pooled.pair.name})`)

const bar = (name, ok, val, why = '') => { console.log(`  ${ok ? 'MET   ' : 'MISSED'} ${name.padEnd(66)} ${String(val).padEnd(9)} ${why}`); if (!ok) fail = true }
console.log('\nBARS (per item type; agreement is stratum-conditioned over its four grid kinds)')
for (const [type, sts] of TYPES) {
  const ps = sts.map(s => per[s]).filter(Boolean)
  const n = ps.reduce((a, x) => a + x.n, 0)
  if (!n) continue
  const s1 = ps.reduce((a, x) => a + x.single, 0) / n, s2 = ps.reduce((a, x) => a + x.pair, 0) / n, sl = ps.reduce((a, x) => a + x.letter, 0) / n
  bar(`B1 ${type}: best single-feature rule <= 0.35`, s1 <= 0.35 + 1e-9, s1.toFixed(3))
  bar(`B2 ${type}: best pair rule <= 0.45`, s2 <= 0.45 + 1e-9, s2.toFixed(3))
  bar(`B4 ${type}: key-letter rule <= 0.35`, sl <= 0.35 + 1e-9, sl.toFixed(3))
}
if (pooled) {
  bar('B1 agreement, pooled rules over every agreement item <= 0.35', pooled.single.s / A.length <= 0.35 + 1e-9, (pooled.single.s / A.length).toFixed(3), pooled.single.name)
  bar('B2 agreement, pooled pair rules <= 0.45', pooled.pair.s / A.length <= 0.45 + 1e-9, (pooled.pair.s / A.length).toFixed(3), pooled.pair.name)
}
bar('B3 one rule picks the key alone in <= 50% of any stratum (n >= 4)', uniqFails.length === 0, uniqFails.length ? 'MISSED' : 'ok', uniqFails.join('; '))

// B5 key-value shares
const b5 = []
for (const st of ['pronoun', 'tense', 'aspect', 'aux']) {
  const its = items.filter(i => i.stratum === st)
  if (its.length < 4) continue
  const c = {}; for (const it of its) { const k = it.opts.find(o => o.key); c[k.d2] = (c[k.d2] ?? 0) + 1 }
  const [v, n] = Object.entries(c).sort((x, y) => y[1] - x[1])[0]
  if (n / its.length > 0.60 + 1e-9) b5.push(`${st}: key ${v} in ${n}/${its.length}`)
}
const prn = items.filter(i => i.stratum === 'pronoun'), prM = prn.filter(i => i.opts.find(o => o.key).match === 'y').length
if (prn.length && (prM / prn.length < 0.40 - 1e-9 || prM / prn.length > 0.60 + 1e-9)) b5.push(`pronoun: matched pair keyed ${prM}/${prn.length} (SEC25: 0/10)`)
const asp = items.filter(i => i.stratum === 'aspect'), asP = asp.filter(i => i.opts.find(o => o.key).d2 === 'perfect').length
if (asp.length && (asP / asp.length < 0.40 - 1e-9 || asP / asp.length > 0.60 + 1e-9)) b5.push(`aspect: perfect keyed ${asP}/${asp.length} (SEC25: 0/5)`)
const bd = items.filter(i => i.stratum === 'boundary')
if (bd.length) {
  const mc = {}; for (const it of bd) { const k = it.opts.find(o => o.key); mc[k.mark] = (mc[k.mark] ?? 0) + 1 }
  for (const [m, n] of Object.entries(mc)) if (n > 3) b5.push(`boundary: key mark ${m} in ${n}`)
  const bare = bd.filter(i => i.opts.find(o => o.key).bare === 'y').length
  const lone = bd.filter(i => { const k = i.opts.find(o => o.key); return k.strong === 'y' && i.opts.filter(o => o.strong === 'y').length === 1 }).length
  if (bare > 2) b5.push(`boundary: bare key ${bare}`)
  if (lone > 2) b5.push(`boundary: lone-strong key ${lone}`)
}
const nn = items.filter(i => i.stratum === 'noun')
if (nn.length) { const c = { sg: 0, 'sg-poss': 0, pl: 0, 'pl-poss': 0 }; for (const it of nn) c[it.opts.find(o => o.key).form]++; const v = Object.values(c); if (Math.max(...v) - Math.min(...v) > 1) b5.push(`noun: key classes ${JSON.stringify(c)}`) }
bar('B5 key-value shares (pronoun match 40-60%, perfect 40-60%, ...)', b5.length === 0, b5.length ? 'MISSED' : 'ok', b5.join('; ') || `pronoun matched ${prM}/${prn.length}, aspect perfect ${asP}/${asp.length}`)

// B6 letters and sequences (slot order = the frozen order: A1..A10, B1..B10, ...)
const bySlot = s => [s[0], Number(s.slice(1))]
const ordered = items.slice().sort((x, y) => { const [a1, n1] = bySlot(x.slot), [a2, n2] = bySlot(y.slot); return a1 === a2 ? n1 - n2 : a1 < a2 ? -1 : 1 })
const seqAll = ordered.map(i => i.letter).join('')
const b6 = []
const lt = {}; for (const l of seqAll) lt[l] = (lt[l] ?? 0) + 1
if (N === 40 && LET.some(l => lt[l] !== 10)) b6.push(`batch letters ${JSON.stringify(lt)} (10 each)`)
const seqs = {}
for (const it of ordered) seqs[it.author] = (seqs[it.author] ?? '') + it.letter
for (const [a, s] of Object.entries(seqs)) { const c = LET.map(l => [...s].filter(x => x === l).length).sort(); if (s.length === 10 && c.join() !== '2,2,3,3') b6.push(`author ${a} letters ${s} (3/3/2/2)`) }
const sv = Object.entries(seqs)
for (let i = 0; i < sv.length; i++) for (let j = i + 1; j < sv.length; j++) if (sv[i][1] === sv[j][1]) b6.push(`authors ${sv[i][0]} and ${sv[j][0]} share ${sv[i][1]}`)
const isPerm = w => w.length === 4 && [...w].sort().join('') === 'ABCD'
let quads = 0, nq = 0; for (let i = 0; i + 4 <= seqAll.length; i += 4) { nq++; if (isPerm(seqAll.slice(i, i + 4))) quads++ }
let wins = 0, nw = 0; for (let i = 0; i + 4 <= seqAll.length; i++) { nw++; if (isPerm(seqAll.slice(i, i + 4))) wins++ }
if (N === 40 && quads > 3) b6.push(`aligned quads that are a permutation ${quads}/${nq}`)
if (nw && wins / nw > 0.30 + 1e-9) b6.push(`sliding windows that are a permutation ${wins}/${nw}`)
bar('B6 letters 10 each, authors 3/3/2/2 and distinct, quads <= 3/10, windows <= 30%', b6.length === 0, b6.length ? 'MISSED' : 'ok',
  b6.join('; ') || `${sv.map(([a, s]) => `${a} ${s}`).join(', ')}; quads ${quads}/${nq}, windows ${wins}/${nw}`)

// B7 family sizes
const fam = {}; for (const it of items) (fam[it.family] ??= []).push(it.slot)
const b7 = []
for (const [f, l] of Object.entries(fam)) { if (l.length > 10) b7.push(`${f} ${l.length}`); if (/^B-/.test(f) && l.length > 4) b7.push(`${f} ${l.length} (boundary family > 4)`) }
bar('B7 no family > 10 items; no boundary family > 4', b7.length === 0, b7.length ? 'MISSED' : 'ok', b7.join('; ') || Object.entries(fam).map(([f, l]) => `${f} ${l.length}`).join(', '))

console.log(fail ? '\nRESULT: a bar is missed' : '\nRESULT: all bars met')
process.exit(fail ? 1 : 0)
