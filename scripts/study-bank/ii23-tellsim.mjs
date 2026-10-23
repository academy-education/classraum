#!/usr/bin/env node
/**
 * ii23-tellsim.mjs — prereg-time CROSS-ITEM TELL check for sat-ii-hard-v23
 * (PREREG-II23-2026-10-23.md, "Cross-item tell check").
 *
 *   node ii23-tellsim.mjs --table <SLOTS.json>          the planned slot table (before any item)
 *   node ii23-tellsim.mjs --work  <dir>                 the authors' declarations (<dir>/{A,B,C,D}/items.json,
 *                                                       meta.roles / meta.ranks), before the probe and at freeze
 *   [--verbose]                                         print every rule's score, not only the best
 *
 * WHY. SEC25's construction table created cross-item tells (every verb+pronoun key paired opposite numbers,
 * 10/10), which graders named and the template cover punished: 9 of 29 survived. II22's graders named the same
 * failure in I&I: "strike the both-vs-neither option" and "on a weaken stem pick the crossed pair" (12 items), and
 * II22B-01 went medium because its key was "the only option in which the summer month wins". Each of those is a
 * RULE OVER OPTION ROLES that holds across the items of one type. This script plays that solver: for every item
 * type it searches the rules a test-wise student could apply across the batch, and reports the best one.
 *
 * MODEL. Every option carries the role the table (or the author's declaration) gives it, and each role carries
 * features:
 *   textual   wt  does the comparison favour the group with the HYPOTHESIS factor?  y | n | tie (same status)
 *             wr  ... the group with the RIVAL account's factor?                    y | n | tie
 *             wc  does a passage-named CONFOUND differ between the compared groups?  diff | tie
 *             su  the option compares one unit with itself (two times/conditions)    true | false
 *             last the option's groups are the ones the passage names in its final sentence
 *   quant     c1  meets the claim's derived criterion (ratio, difference, threshold)  pass | fail
 *             c2  meets the claim's grouping / second condition                      pass | fail
 *             rank the option's headline number among the four (1 = smallest)        1-4
 * The CONSTRUCT is the smallest feature set that decides the evidence direction, i.e. doing the item:
 *   textual support: wt & wr & wc (wt & wr on 4G, which has no confound): the hypothesis group wins, the rival's
 *                    factor does not favour the winner, nothing else differs;
 *   textual weaken:  wt & wc: the hypothesis group does NOT win and nothing else differs (whatever wr is, such a
 *                    finding cuts against the hypothesis, so wr is not part of deciding it);
 *   quant:           c1 & c2.
 * Rules that use the whole construct are the skill, not a tell, and are scored as a guess (1/4); every rule
 * using fewer features is a shortcut and is scored.
 *
 * RULES searched, separately for each stem (a student knows whether the stem says support or weaken):
 *   single   pick the options with feature f = v (or f != v);                      all f, v
 *   pair     pick the options with f1 = v1 AND f2 = v2 (any polarity);             all f1 < f2, not the construct
 *   odd      pick the option whose value of f is unique in its item;                all f
 *   surface  key letter (per type and per stem), headline-number rank (quant), last-sentence position (textual)
 * Expected accuracy of a rule on an item = 1/|picked| if the key is picked, 0 if not, 1/4 if it picks nothing.
 * Stem-conditioned score = sum over stems of the best rule within the stem / n of the type.
 * "Unique" = the rule picks the key and only the key.
 *
 * BARS (pre-registered in PREREG-II23; exit 1 if any is missed):
 *   B1 best single-feature rule        <= 0.50 expected accuracy, per type
 *   B2 best pair rule                  <= 0.65, per type
 *   B3 any single or pair rule picks the key UNIQUELY in <= 60% of a type's items
 *   B4 surface rules (letter, rank, last-sentence) <= 0.40, per type
 *   B5 no role is the key's role in more than 40% of a type's items, and no distractor role appears in more
 *      than 75% of a type's items (a role in every item is a strike rule, II22's "both-vs-neither")
 *   B6 each author's key-letter sequence differs from every other author's (II22: A, D and B shared a sequence)
 *   B7 no two items of a type share design AND role set; at most 2 pairs share a role set across designs
 *   L  legality: every option set is logically consistent with its stem (exactly one option is evidence in the
 *      stem's direction once all features are applied); refused per item
 *
 * LIMITS, stated so nobody quotes this as a clearance: it sees only declared roles. It cannot see wording, a
 * uniquely hedged option, a semantic tell, or a role an author declared wrongly. Passing it means the TABLE does
 * not hand the solver a rule over roles; the probe and the panel judge the items.
 *
 * EXIT 0 all bars met; 1 a bar missed or an item illegal; 2 refused (no input, empty table, unknown role,
 * malformed slot, missing meta, unknown flag).
 */
import { readFileSync, existsSync } from 'node:fs'
import { T, Q } from './ii23-roles.mjs'

const args = process.argv.slice(2)
const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const known = new Set(['--table', '--work', '--verbose'])
for (let i = 0; i < args.length; i++) {
  if (!known.has(args[i])) die(`unknown argument ${args[i]}`)
  if (args[i] !== '--verbose') { if (!args[i + 1] || args[i + 1].startsWith('--')) die(`${args[i]} needs a value`); i++ }
}
const argOf = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null }
const verbose = args.includes('--verbose')
const tablePath = argOf('--table'), workDir = argOf('--work')
if (!!tablePath === !!workDir) die('usage: ii23-tellsim.mjs --table <SLOTS.json> | --work <dir> [--verbose]')
const rd = p => { if (!existsSync(p)) die(`${p} missing`); try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { die(`${p}: ${e.message}`) } }

/* ---------- role catalogue ---------- */
// the catalogue lives in ii23-roles.mjs (shared with ii23-merge.mjs)
const TF = ['wt', 'wr', 'wc']
const QF = ['c1', 'c2']
const DESIGNS_T = new Set(['4G', '3G', '3x2', 'TIME', 'DOSE'])
const DESIGNS_Q = new Set(['ratio', 'two-condition', 'threshold-text', 'change', 'group-best', 'trend'])
const LET = ['A', 'B', 'C', 'D']

/* ---------- load ---------- */
let slots = []
if (tablePath) {
  const t = rd(tablePath)
  if (!t || !Array.isArray(t.slots) || !t.slots.length) die(`${tablePath} has no slots`)
  slots = t.slots.map(s => ({ ...s, src: 'table' }))
} else {
  for (const a of ['A', 'B', 'C', 'D']) {
    const f = `${workDir}/${a}/items.json`
    if (!existsSync(f)) continue
    const arr = rd(f)
    if (!Array.isArray(arr)) die(`${f} is not an array`)
    for (const it of arr) {
      const m = it?.meta
      if (!m || !Array.isArray(m.roles) || m.roles.length !== 4) die(`${it?.id}: meta.roles must list the role of each of the 4 choices, in order`)
      if (!Array.isArray(it.choices) || it.choices.length !== 4 || !it.choices.includes(it.correct_answer)) die(`${it?.id}: needs 4 choices with the key among them`)
      const k = it.choices.indexOf(it.correct_answer)
      const quant = !!it.graphic
      slots.push({
        slot: `${a}${Number(String(it.id).slice(-2))}`, id: it.id, type: quant ? 'quant' : 'textual', design: m.design_slot ?? m.design, stem: m.stem,
        key: m.roles[k], distractors: m.roles.filter((_, i) => i !== k), letter: LET[k], dir: m.dir,
        last: m.last ?? null, su: m.su ?? [], ranks: m.ranks ? [m.ranks[k], ...m.ranks.filter((_, i) => i !== k)] : null, src: 'work',
      })
    }
  }
  if (!slots.length) die(`no items under ${workDir}/<A-D>/items.json`)
}

/* ---------- validate + expand to option feature rows ---------- */
const items = []
const illegal = []
for (const s of slots) {
  const where = s.id ?? s.slot
  if (typeof s.slot !== 'string' || !/^[ABCD][1-9]$/.test(s.slot)) die(`${where}: slot must be like A1..D8`)
  if (!LET.includes(s.letter)) die(`${where}: letter must be A-D`)
  if (!Array.isArray(s.distractors) || s.distractors.length !== 3) die(`${where}: needs 3 distractor roles`)
  if (new Set([s.key, ...s.distractors]).size !== 4) die(`${where}: the four roles must be distinct`)
  const opts = []
  if (s.type === 'textual') {
    if (!DESIGNS_T.has(s.design)) die(`${where}: textual design "${s.design}" not one of ${[...DESIGNS_T].join(', ')}`)
    if (!['support', 'weaken'].includes(s.stem)) die(`${where}: stem must be support | weaken`)
    for (const r of [s.key, ...s.distractors]) if (!T[r]) die(`${where}: unknown textual role "${r}"`)
    if (T[s.key].key !== s.stem) illegal.push(`${where}: key role ${s.key} does not answer a ${s.stem} stem`)
    for (const r of s.distractors) if (!T[r].d || !T[r].d.includes(s.stem)) illegal.push(`${where}: ${r} may not be a distractor under ${s.stem}`)
    if (s.design === '4G' && [s.key, ...s.distractors].some(r => T[r].f[2] === 'diff')) illegal.push(`${where}: a 4G design has no confound, so no wc=diff role`)
    if (s.design === '4G' && s.stem !== 'support') illegal.push(`${where}: 4G is support-only (under weaken, "the hypothesis group loses" is unique without a confound)`)
    if (s.design !== '4G' && ![s.key, ...s.distractors].some(r => T[r].f[2] === 'diff')) illegal.push(`${where}: a ${s.design} design must use its confound in at least one option`)
    if (!['more', 'less', 'earlier', 'later'].includes(s.dir)) die(`${where}: dir must be more | less | earlier | later`)
    const su = new Set(Array.isArray(s.su) ? s.su : [])
    for (const r of su) if (![s.key, ...s.distractors].includes(r)) die(`${where}: su names ${r}, not a role of this item`)
    if (s.last !== null && s.last !== undefined && ![s.key, ...s.distractors].includes(s.last)) die(`${where}: last must be null or one of the item's roles`)
    // evidence direction once ALL features apply: support-T iff wt=y, wr!=y, wc=tie; weaken-T iff wt=n, wr!=n, wc=tie
    const ev = r => { const [wt, wr, wc] = T[r].f; if (wc !== 'tie') return 'none'; if (wt === 'y' && wr !== 'y') return 'support'; if (wt === 'n' && wr !== 'n') return 'weaken'; if (wt === 'n' && wr === 'n') return 'weaken'; return 'none' }
    const inDir = [s.key, ...s.distractors].filter(r => ev(r) === s.stem)
    if (inDir.length !== 1 || inDir[0] !== s.key) illegal.push(`${where}: ${inDir.length} options are ${s.stem} evidence once every feature applies (${inDir.join(', ')})`)
    if (s.stem === 'support' && s.distractors.includes('WKR')) illegal.push(`${where}: WKR (weakens the rival) reads as indirect support`)
    const rows = [s.key, ...s.distractors].map((r, i) => ({ role: r, key: i === 0, wt: T[r].f[0], wr: T[r].f[1], wc: T[r].f[2], su: su.has(r) ? 'y' : 'n', last: s.last === r ? 'y' : 'n' }))
    opts.push(...rows)
  } else if (s.type === 'quant') {
    if (!DESIGNS_Q.has(s.design)) die(`${where}: quant design "${s.design}" not one of ${[...DESIGNS_Q].join(', ')}`)
    for (const r of [s.key, ...s.distractors]) if (!Q[r]) die(`${where}: unknown quant role "${r}"`)
    if (s.key !== 'QK') illegal.push(`${where}: the quant key role is QK`)
    if (s.distractors.includes('QK')) illegal.push(`${where}: QK as a distractor`)
    const ranks = s.ranks
    if (!Array.isArray(ranks) || ranks.length !== 4 || [...ranks].sort().join() !== '1,2,3,4') die(`${where}: ranks must assign 1-4 to [key, d1, d2, d3]`)
    const rows = [s.key, ...s.distractors].map((r, i) => ({ role: r, key: i === 0, c1: Q[r].f[0], c2: Q[r].f[1], rank: String(ranks[i]) }))
    for (const r of rows) if (Q[r.role].raw && r.rank !== '4') illegal.push(`${where}: Q-RAW must hold the largest headline number (rank 4)`)
    const both = rows.filter(r => r.c1 === 'pass' && r.c2 === 'pass')
    if (both.length !== 1 || !both[0].key) illegal.push(`${where}: ${both.length} options meet both criteria`)
    opts.push(...rows)
  } else die(`${where}: type must be textual | quant`)
  items.push({ ...s, opts, author: s.slot[0] })
}

/* ---------- rule search ---------- */
const score = (it, pick) => { const p = it.opts.filter(pick); if (!p.length) return { acc: 0.25, uniq: false }; const k = p.some(o => o.key); return { acc: k ? 1 / p.length : 0, uniq: k && p.length === 1 } }
function rulesFor(type, feats, construct) {
  const vals = f => [...new Set(items.filter(i => i.type === type).flatMap(i => i.opts.map(o => o[f])))]
  const R = []
  for (const f of feats) for (const v of vals(f)) {
    R.push({ name: `${f}=${v}`, feats: [f], pick: o => o[f] === v })
    R.push({ name: `${f}!=${v}`, feats: [f], pick: o => o[f] !== v })
  }
  for (let i = 0; i < feats.length; i++) for (let j = i + 1; j < feats.length; j++) {
    const f1 = feats[i], f2 = feats[j]
    for (const v1 of vals(f1)) for (const v2 of vals(f2)) for (const [n1, n2] of [[false, false], [true, false], [false, true], [true, true]]) {
      R.push({ name: `${f1}${n1 ? '!=' : '='}${v1} & ${f2}${n2 ? '!=' : '='}${v2}`, feats: [f1, f2], pair: true,
        pick: o => (n1 ? o[f1] !== v1 : o[f1] === v1) && (n2 ? o[f2] !== v2 : o[f2] === v2) })
    }
  }
  for (const f of feats) R.push({ name: `odd-one-out on ${f}`, feats: [f], odd: true, pickItem: it => { const c = {}; for (const o of it.opts) c[o[f]] = (c[o[f]] ?? 0) + 1; return o => c[o[f]] === 1 } })
  return R.map(r => ({ ...r, isConstruct: it => construct(it).every(f => r.feats.includes(f)) }))
}
const strata = type => type === 'textual' ? ['support', 'weaken'] : ['all']
const inStratum = (it, st) => st === 'all' || it.stem === st
let fail = false
const out = []
function evalType(type, feats, construct, surfaceFeats) {
  const its = items.filter(i => i.type === type)
  if (!its.length) return
  const R = rulesFor(type, feats, construct)
  const best = { single: 0, pair: 0, uniqMax: 0, surface: 0 }, bestName = { single: [], pair: [], uniq: [], surface: [] }
  for (const kind of ['single', 'pair']) {
    let tot = 0; const names = []
    for (const st of strata(type)) {
      const sub = its.filter(i => inStratum(i, st)); if (!sub.length) continue
      let b = -1, bn = null
      for (const r of R.filter(r => (kind === 'pair' ? r.pair : !r.pair))) {
        let s = 0
        for (const it of sub) {
          if (r.isConstruct(it)) { s += 0.25; continue }   // the construct is the skill, not a tell: scored as a guess
          s += score(it, r.odd ? r.pickItem(it) : r.pick).acc
        }
        if (verbose) console.log(`  ${type}/${st} ${kind.padEnd(6)} ${(s / sub.length).toFixed(3)}  ${r.name}`)
        if (s > b) { b = s; bn = r.name }
      }
      tot += b; names.push(`${st}: ${bn} (${(b / sub.length).toFixed(2)})`)
    }
    best[kind] = tot / its.length; bestName[kind] = names
  }
  // B3: unique picks, any single/pair rule, per stratum
  let uq = 0; const uqn = []
  for (const st of strata(type)) {
    const sub = its.filter(i => inStratum(i, st)); if (!sub.length) continue
    let b = -1, bn = null
    for (const r of R) { let u = 0; for (const it of sub) { if (r.isConstruct(it)) continue; if (score(it, r.odd ? r.pickItem(it) : r.pick).uniq) u++ } if (u > b) { b = u; bn = r.name } }
    uq += b; uqn.push(`${st}: ${bn} (${b}/${sub.length})`)
  }
  best.uniqMax = uq / its.length; bestName.uniq = uqn
  // B4 surface: letter per stratum, plus declared surface features (rank / last)
  let sTot = 0; const sNames = []
  for (const st of strata(type)) {
    const sub = its.filter(i => inStratum(i, st)); if (!sub.length) continue
    const lc = {}; for (const it of sub) lc[it.letter] = (lc[it.letter] ?? 0) + 1
    const [bl, bc] = Object.entries(lc).sort((a, b) => b[1] - a[1])[0]
    let b = bc, bn = `key letter ${bl}`
    for (const f of surfaceFeats) for (const v of [...new Set(sub.flatMap(i => i.opts.map(o => o[f])))]) for (const neg of [false, true]) {
      let s = 0; for (const it of sub) s += score(it, o => neg ? o[f] !== v : o[f] === v).acc
      if (s > b) { b = s; bn = `${f}${neg ? '!=' : '='}${v}` }
    }
    sTot += b; sNames.push(`${st}: ${bn} (${(b / sub.length).toFixed(2)})`)
  }
  best.surface = sTot / its.length; bestName.surface = sNames
  // B5 role shares
  const kc = {}, dc = {}
  for (const it of its) { kc[it.key] = (kc[it.key] ?? 0) + 1; for (const d of new Set(it.distractors)) dc[d] = (dc[d] ?? 0) + 1 }
  const kMax = Math.max(...Object.values(kc)), dMax = Math.max(...Object.values(dc))
  const kTop = Object.entries(kc).sort((a, b) => b[1] - a[1])[0], dTop = Object.entries(dc).sort((a, b) => b[1] - a[1])[0]
  const roleKeyOk = type === 'quant' ? true : kMax / its.length <= 0.40
  const bars = [
    ['B1 best single-feature rule <= 0.50', best.single <= 0.50 + 1e-9, best.single.toFixed(3), bestName.single.join('; ')],
    ['B2 best pair rule <= 0.65', best.pair <= 0.65 + 1e-9, best.pair.toFixed(3), bestName.pair.join('; ')],
    ['B3 unique key picks by one rule <= 60%', best.uniqMax <= 0.60 + 1e-9, `${(100 * best.uniqMax).toFixed(1)}%`, bestName.uniq.join('; ')],
    ['B4 surface rule <= 0.40', best.surface <= 0.40 + 1e-9, best.surface.toFixed(3), bestName.surface.join('; ')],
    [`B5 key role <= 40%${type === 'quant' ? ' (n/a: quant key is always QK)' : ''}`, roleKeyOk, type === 'quant' ? '-' : `${kTop[0]} ${kTop[1]}/${its.length}`, ''],
    ['B5 distractor role in <= 75% of items', dMax / its.length <= 0.75 + 1e-9, `${dTop[0]} ${dTop[1]}/${its.length}`, ''],
  ]
  console.log(`\n${type.toUpperCase()}: n=${its.length}${type === 'textual' ? ` (support ${its.filter(i => i.stem === 'support').length}, weaken ${its.filter(i => i.stem === 'weaken').length})` : ''}; rules searched ${R.length}`)
  for (const [n, ok, v, why] of bars) { console.log(`  ${ok ? 'MET   ' : 'MISSED'} ${n.padEnd(42)} ${String(v).padEnd(10)} ${why}`); if (!ok) fail = true }
  out.push({ type, best })
}

if (illegal.length) { console.log('ILLEGAL option sets (fix the table / the declaration):'); for (const x of illegal) console.log('  ' + x); fail = true }
console.log(`${items.length} items from ${tablePath ?? workDir}: textual ${items.filter(i => i.type === 'textual').length}, quant ${items.filter(i => i.type === 'quant').length}`)
evalType('textual', ['wt', 'wr', 'wc', 'su', 'last'], it => it.stem === 'weaken' ? ['wt', 'wc'] : it.design === '4G' ? ['wt', 'wr'] : ['wt', 'wr', 'wc'], ['last', 'su'])
evalType('quant', ['c1', 'c2', 'rank'], () => ['c1', 'c2'], ['rank'])

// B7: no two items share a role set (key + distractors) within a type, nor design x role set (a repeated option cast is
// the template graders name, whatever the letters)
{
  const seenSet = {}, seenDS = {}
  for (const it of items) {
    const rs = `${it.type}|${it.key}|${it.distractors.slice().sort().join(',')}`
    ;(seenSet[rs] ??= []).push(it.slot); (seenDS[`${it.design}|${rs}`] ??= []).push(it.slot)
  }
  const dupDS = Object.values(seenDS).filter(v => v.length > 1), dupSet = Object.values(seenSet).filter(v => v.length > 1)
  console.log(`\nB7 repeated option casts: design x role set ${dupDS.length ? 'MISSED ' + dupDS.map(v => v.join('=')).join(', ') : 'MET (none)'}; role set alone ${dupSet.length ? dupSet.map(v => v.join('=')).join(', ') + ' (allowed across designs, <= 2 pairs)' : 'none'}`)
  if (dupDS.length || dupSet.length > 2) fail = true
}

// B6: author letter sequences
const seq = {}
for (const it of items.slice().sort((a, b) => a.slot.localeCompare(b.slot))) seq[it.author] = (seq[it.author] ?? '') + it.letter
const sv = Object.entries(seq)
const dup = []
for (let i = 0; i < sv.length; i++) for (let j = i + 1; j < sv.length; j++) if (sv[i][1] === sv[j][1]) dup.push(`${sv[i][0]}=${sv[j][0]}`)
console.log(`\nB6 author key-letter sequences: ${sv.map(([a, s]) => `${a} ${s}`).join(', ')}${dup.length ? `  MISSED (identical: ${dup.join(', ')})` : '  MET (all distinct)'}`)
if (dup.length) fail = true
for (const [a, s] of sv) { const c = {}; for (const l of s) c[l] = (c[l] ?? 0) + 1; if (s.length === 8 && LET.some(l => c[l] !== 2)) { console.log(`  author ${a}: letters ${JSON.stringify(c)} (the table fixes 2/2/2/2)`); fail = true } }
console.log(fail ? '\nRESULT: a bar is missed or an option set is illegal' : '\nRESULT: all bars met')
process.exit(fail ? 1 : 0)
