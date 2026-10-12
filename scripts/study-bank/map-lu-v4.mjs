#!/usr/bin/env node
/**
 * map-lu-v4.mjs — toolchain for map-lu-v4 (grades 5-8 MAP Language Usage:
 * Spelling grades 5-8, Grammar and Usage grades 5-6, Capitalization grade 6).
 * Bars: MAP-LU-V4.prereg.md, committed before any item existed. Every strand
 * gets its own verdict. Refuses (exit 2) on input it cannot read; exits 1 on a
 * failed bar. Denominators print before verdicts. Run from the repo root.
 *
 * IMPORTED UNCHANGED: v2's item checks, dictionary guard, T2 and pilot-pass
 * rule (map-lu-v2.mjs); v3's pooled E3, word-grade screen, per-format key
 * dealing and slot bar (map-lu-v3.mjs). What v4 adds:
 *   - L-class: every word-format Spelling edit carries a SEEDED type that fixes
 *     its length change AND its letter class (vowel / consonant, doubling or
 *     not), enforced exactly on the four options (map-lu-v4/wclass.json)
 *   - T2-L: a second structural-predictor family over letter-class features
 *     (consonants, doubled consonants, doubled vowels, vowel runs, vowel and
 *     consonant bigrams, distinct letters, final vowel, alphabetical rank),
 *     run beside v2's T2 everywhere T2 runs; either firing fails
 *   - Spelling pre-flight at freeze: the strand checks run on exactly the
 *     items the freeze would take; if they fail, ONE seeded re-draw from the
 *     survivors (same per-grade format counts); if that fails too, the strand
 *     fails
 *
 *   spell <word...>            dictionary oracle (the spelling author may run this, nothing else)
 *   assign                     seeded L-class types (wclass.json) and sentence key ranks (lrank.json)
 *   select-control             the 24-item matched live control (read-only DB) -> W/control.json
 *   checks <batch.json>        exact item checks + per-strand batch checks + pooled E3
 *   preflight                  T2 + T2-L on the authored batch and its likely-frozen subset (report)
 *   teacher-input | teacher-merge | rerate-input | repair-input    teacher gate and repair, as v3
 *   screen-input               W/screen.words.json
 *   freeze                     revisions, drops, repairs, SCREEN, quotas, pre-flight + re-draw, Stage 0
 *   render | score | build <strand> | insert <strand> [--commit]    as v3
 *   --selftest                 break-test every new rule and every bar at its margin
 *
 * W = $MLV4_W or scripts/study-bank/map-lu-v4/
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'

const ROOT = process.cwd()
const SB = ROOT + '/scripts/study-bank/'
const V2 = await import(SB + 'map-lu-v2.mjs')
const V3 = await import(SB + 'map-lu-v3.mjs')
const { rng, nsspell, variantHit, misspellingOk, structural: structuralV2, dupFails, t2, hscores, wsItem, bars, strandOf, passBar, easierMax, harderLt, T2_MARGIN, T2_ALPHA, T2_PERMS } = V2
const { pooledE3, e3Counts, screenDrops, testedWord, fmtGroup, dealFlat, slotCheck } = V3
const { periodicity } = await import(SB + 'map-pilot-2-checks.mjs')
const { dl } = await import(SB + 'map-pilot-checks.mjs')

const W = (process.env.MLV4_W || 'scripts/study-bank/map-lu-v4/').replace(/\/?$/, '/')
const SL = ['A', 'B', 'C', 'D']
export const STRANDS = ['spell', 'gram', 'cap']
const COHORT = { spell: 'map-lu-v4-spelling', gram: 'map-lu-v4-grammar', cap: 'map-lu-v4-capitalization' }
export const AUTHORED = { spell: { 5: 12, 6: 12, 7: 12, 8: 12 }, gram: { 5: 8, 6: 8 }, cap: { 6: 10 } }
export const FREEZE = { spell: { 5: 7, 6: 7, 7: 7, 8: 7 }, gram: { 5: 6, 6: 6 }, cap: { 6: 8 } }
// per grade, in id order: w s w w s w w s w w s w (8 word, 4 sentence); the first 7 are w s w w s w w
export const FORMAT_ORDER = ['word', 'sentence', 'word', 'word', 'sentence', 'word', 'word', 'sentence', 'word', 'word', 'sentence', 'word']
const sum = o => Object.values(o).reduce((a, b) => a + b, 0)
export const nFrozen = s => sum(FREEZE[s])
export const E3_MAX = 0.25

const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const rd = p => { if (!existsSync(p)) die(`missing ${p}`); try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { die(`${p} is not JSON: ${e.message}`) } }
const wr = (p, o) => { mkdirSync(W, { recursive: true }); writeFileSync(p, JSON.stringify(o, null, 1) + '\n') }
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex')
const seedOf = s => parseInt(createHash('sha256').update(s).digest('hex').slice(0, 8), 16)
const shuffleWith = (a, r) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const fmtT = r => `n=${r.n} control ${(100 * r.control).toFixed(1)}% | ${r.nH ?? ''}${r.nH ? ' heuristics | ' : ''}min-p ${r.best} ${(100 * r.bestScore).toFixed(1)}% raw p ${r.rawP.toFixed(4)} fw p ${r.fwP.toFixed(4)} -> ${r.fires ? 'FIRES' : 'clear'} | top: ${r.top.map(([n, s]) => `${n} ${(100 * s).toFixed(1)}`).join(', ')}`
const idNum = id => +String(id).match(/(\d+)$/)[1]

// ---------- T2-L: the letter-class structural-predictor family ----------
/*
 * v3's Spelling stopped on a vowel-count tell that its seeded LENGTH profile
 * created. v2's T2 (8 features x 7 selectors = 56 heuristics) already holds
 * len, vowels and doubles. Adding the letter-class features to the SAME
 * family dilutes it: on v3's own Stage 0 word picks the extended family's
 * family-wise p is 0.17 against T2's 0.086 (selftest), i.e. it would have
 * missed the tell that stopped v3. So the new features are a SECOND family,
 * same selectors, same Westfall-Young min-p, same margin and alpha; a strand
 * fails if EITHER family fires.
 */
const V = /[aeiouy]/i, C = /[b-df-hj-np-tv-xz]/i
const pairs = (s, a, b) => { const m = String(s).toLowerCase(); let c = 0; for (let i = 1; i < m.length; i++) if (a.test(m[i - 1]) && b.test(m[i])) c++; return c }
export const LFEAT = {
  consonants: s => (s.match(/[b-df-hj-np-tv-xz]/gi) ?? []).length,
  dbl_cons: s => (s.match(/([b-df-hj-np-tv-xz])\1/gi) ?? []).length,
  dbl_vowel: s => (s.match(/([aeiouy])\1/gi) ?? []).length,
  vruns: s => (s.match(/[aeiouy]+/gi) ?? []).length,
  vv: s => pairs(s, V, V),
  cc: s => pairs(s, C, C),
  distinct: s => new Set(String(s).toLowerCase().replace(/[^a-z]/g, '')).size,
  final_v: s => (/[aeiouy][^a-z]*$/i.test(s) ? 1 : 0),
}
const idx = (v, p) => v.map((x, i) => (p(x) ? i : -1)).filter(i => i >= 0)
// v2's seven selectors, copied verbatim (v2 does not export them); selftest proves equality with v2's T2
export const SEL = {
  unique_max: v => { const a = idx(v, x => x === Math.max(...v)); return a.length === 1 ? a : null },
  unique_min: v => { const a = idx(v, x => x === Math.min(...v)); return a.length === 1 ? a : null },
  between: v => { const mx = Math.max(...v), mn = Math.min(...v), a = idx(v, x => x > mn && x < mx); return a.length ? a : null },
  at_max: v => { const a = idx(v, x => x === Math.max(...v)); return a.length < v.length ? a : null },
  at_min: v => { const a = idx(v, x => x === Math.min(...v)); return a.length < v.length ? a : null },
  mode: v => { const c = {}; v.forEach(x => (c[x] = (c[x] ?? 0) + 1)); const top = Math.max(...Object.values(c)), tv = Object.keys(c).filter(k => c[k] === top); if (top < 2 || tv.length !== 1) return null; const a = idx(v, x => String(x) === tv[0]); return a.length < v.length ? a : null },
  odd_one: v => { const c = {}; v.forEach(x => (c[x] = (c[x] ?? 0) + 1)); if (Math.max(...Object.values(c)) < 2) return null; const a = idx(v, x => c[x] === 1); return a.length ? a : null },
}
export function heuristicsOf(items, feats, { alpha = false, dlsum = false } = {}) {
  const F = [...Object.keys(feats), ...(dlsum ? ['dlsum'] : []), ...(alpha ? ['alpha'] : [])]
  const names = []
  for (const f of F) for (const s of Object.keys(SEL)) names.push(`${s}(${f})`)
  const sets = items.map(it => {
    const ch = it.choices.map(String)
    const vals = Object.fromEntries(Object.entries(feats).map(([k, f]) => [k, ch.map(f)]))
    if (dlsum) vals.dlsum = ch.map((a, i) => ch.reduce((s, b, j) => s + (i === j ? 0 : dl(a, b)), 0))
    if (alpha) { const srt = [...ch].sort(); vals.alpha = ch.map(c => srt.indexOf(c)) }
    const out = []
    for (const f of F) for (const sel of Object.values(SEL)) out.push(sel(vals[f]))
    return { n: ch.length, sets: out }
  })
  return { names, sets }
}
/** The same verdict machinery as v2's t2, over any heuristic family. */
export function t2family(items, H, { perms = T2_PERMS, seed = 20261012, keyIdx } = {}) {
  if (!items.length) die('T2 over zero items')
  const k = keyIdx ?? items.map(it => it.choices.map(String).indexOf(String(it.correct_answer)))
  if (k.some(x => x < 0)) die('T2: an item has no key among its choices')
  const obs = hscores(H, k), r = rng(seed)
  const nulls = Array.from({ length: perms }, () => hscores(H, items.map(it => Math.floor(r() * it.choices.length))))
  const cols = H.names.map((_, h) => nulls.map(v => v[h]).sort((a, b) => a - b))
  const pOf = (h, x) => { const c = cols[h]; let lo = 0, hi = c.length; while (lo < hi) { const m = (lo + hi) >> 1; if (c[m] < x - 1e-12) lo = m + 1; else hi = m } return (c.length - lo + 1) / (c.length + 1) }
  const pobs = obs.map((x, h) => pOf(h, x)), minObs = Math.min(...pobs)
  const nullMin = nulls.map(v => Math.min(...v.map((x, h) => pOf(h, x))))
  const fwP = (nullMin.filter(m => m <= minObs + 1e-12).length + 1) / (perms + 1)
  const hb = pobs.indexOf(minObs)
  const control = items.reduce((s, it) => s + 1 / it.choices.length, 0) / items.length
  const fires = obs[hb] >= control + T2_MARGIN - 1e-12 && fwP < T2_ALPHA
  const top = H.names.map((n, i) => [n, obs[i], pobs[i]]).sort((a, b) => b[1] - a[1]).slice(0, 5)
  return { n: items.length, nH: H.names.length, control, best: H.names[hb], bestScore: obs[hb], rawP: minObs, fwP, fires, top, obs: Object.fromEntries(H.names.map((n, i) => [n, obs[i]])) }
}
export const t2L = (items, o = {}) => t2family(items, heuristicsOf(items, LFEAT, { alpha: true }), o)

// ---------- L-class: seeded edit types for word-format Spelling ----------
/*
 * Each trouble spot is ONE edit of a fixed TYPE. The type fixes the change in
 * (length, vowels, doubled consonants) and, for a same-length edit, the letter
 * class of the changed letters. y counts as a vowel (as in T2). No edit may
 * create or break a doubled VOWEL.
 *   DV drop a vowel            (-1,-1, 0)   AV add a vowel                 (+1,+1, 0)
 *   DD drop one of a doubled   (-1, 0,-1)   AD add a consonant that        (+1, 0,+1)
 *      consonant pair                          doubles a single consonant
 *   DC drop a single consonant (-1, 0, 0)   AC add a consonant, no double  (+1, 0, 0)
 *   XV change a vowel to another vowel, or swap two adjacent vowels   (0,0,0)
 *   XC change a consonant to another consonant, or swap two adjacent consonants (0,0,0)
 */
export const TYPES = { DV: [-1, -1, 0], DD: [-1, 0, -1], DC: [-1, 0, 0], AV: [1, 1, 0], AD: [1, 0, 1], AC: [1, 0, 0], XV: [0, 0, 0], XC: [0, 0, 0] }
const VOWEL_CLASS = new Set(['DV', 'AV', 'XV'])
/** (length, vowels, doubled consonants, doubled vowels) */
export const vec = s => { s = String(s); return [s.length, (s.match(/[aeiouy]/gi) ?? []).length, LFEAT.dbl_cons(s), LFEAT.dbl_vowel(s)] }
const dvec = (a, b) => { const x = vec(a), y = vec(b); return x.map((v, i) => y[i] - v) }
/** Type of a single edit from key k to option o (dl 1), or a reason it fits no type. */
export function editType(k, o) {
  const d = dvec(k, o)
  if (d[3] !== 0) return { err: `"${o}" creates or breaks a doubled vowel` }
  if (d[0] === -1) { if (d[1] === -1 && d[2] === 0) return { t: 'DV' }; if (d[1] === 0 && d[2] === -1) return { t: 'DD' }; if (d[1] === 0 && d[2] === 0) return { t: 'DC' } }
  if (d[0] === 1) { if (d[1] === 1 && d[2] === 0) return { t: 'AV' }; if (d[1] === 0 && d[2] === 1) return { t: 'AD' }; if (d[1] === 0 && d[2] === 0) return { t: 'AC' } }
  if (d[0] === 0 && d[1] === 0 && d[2] === 0 && k.length === o.length) {
    const diff = [...k].map((c, i) => (c === o[i] ? null : [c, o[i]])).filter(Boolean).flat()
    if (diff.length && diff.every(c => V.test(c))) return { t: 'XV' }
    if (diff.length && diff.every(c => C.test(c))) return { t: 'XC' }
    return { err: `"${o}" changes letters across classes (${diff.join('')})` }
  }
  return { err: `"${o}" fits no edit type (length ${d[0]}, vowels ${d[1]}, doubled consonants ${d[2]})` }
}
export const pairKey = ts => [...ts].sort().join('+')
export function classErr(it) {
  const want = it.edit_types
  if (!Array.isArray(want) || want.length !== 2 || !want.every(t => TYPES[t])) return `L-class edit_types (two of ${Object.keys(TYPES).join('/')}, assigned) missing`
  const k = String(it.correct_answer), o = it.choices.map(String).filter(c => c !== k)
  if (o.length !== 3) return 'L-class needs the key and three distinct misspellings'
  const d1 = o.map(x => dl(k, x))
  const singles = o.filter((_, i) => d1[i] === 1), both = o.filter((_, i) => d1[i] === 2)
  if (singles.length !== 2 || both.length !== 1) return `L-class needs two single-edit options and one double-edit option (edit distances ${d1.join(',')})`
  const got = singles.map(x => editType(k, x))
  const bad = got.find(g => g.err); if (bad) return `L-class ${bad.err}`
  if (pairKey(got.map(g => g.t)) !== pairKey(want)) return `L-class assigned ${pairKey(want)}, got ${pairKey(got.map(g => g.t))}`
  const exp = [0, 1, 2].map(j => TYPES[want[0]][j] + TYPES[want[1]][j]), db = dvec(k, both[0])
  if (db[0] !== exp[0] || db[1] !== exp[1] || db[2] !== exp[2] || db[3] !== 0) return `L-class the both-errors option "${both[0]}" changes (length, vowels, doubled consonants, doubled vowels) by ${db.join(',')}, needs ${exp.join(',')},0`
  return null
}

/** v2's item checks, plus v4's grade sets, L-rank (sentence) and L-class (word), each against its seeded assignment. */
let ASG = null
const assigned = () => (ASG ??= { types: existsSync(W + 'wclass.json') ? JSON.parse(readFileSync(W + 'wclass.json', 'utf8')).types : {}, ranks: existsSync(W + 'lrank.json') ? JSON.parse(readFileSync(W + 'lrank.json', 'utf8')).ranks : {} })
export function structural(it) {
  const r = structuralV2(it), s = strandOf(it), A = assigned()
  if (s === 'spell' && it.spelling_format === 'word' && A.types[it.id] && pairKey(it.edit_types ?? []) !== A.types[it.id]) r.errs.push(`L-class edit_types ${pairKey(it.edit_types ?? [])} are not the assigned ${A.types[it.id]}`)
  if (s === 'spell' && it.spelling_format === 'sentence' && A.ranks[it.id] && it.key_length_rank !== A.ranks[it.id]) r.errs.push(`L-rank ${it.key_length_rank} is not the assigned ${A.ranks[it.id]}`)
  if (!STRANDS.includes(s)) r.errs.push(`strand ${it.map_strand} is not in map-lu-v4 (${STRANDS.join('/')})`)
  else if (!Object.keys(FREEZE[s]).map(Number).includes(it.grade_target)) r.errs.push(`grade_target ${it.grade_target} not in ${Object.keys(FREEZE[s]).join('/')} for ${s} in v4`)
  if (s === 'spell' && it.spelling_format === 'sentence' && ![1, 2, 3, 4].includes(it.key_length_rank)) r.errs.push('L-rank key_length_rank (1-4, assigned) missing')
  if (s === 'spell' && it.spelling_format === 'word') { const e = classErr(it); if (e) r.errs.push(e) }
  return r
}

/** Per-strand batch checks: distinct rules, spelling word uniqueness, T2 and T2-L (strand, and per Spelling format). No E3 (pooled). */
export function batchChecks(items, s, o = {}) {
  const errs = [], n = items.length
  const field = { cap: 'cap_rule', gram: 'varied_dimension' }[s]
  if (field) { const v = items.map(i => String(i[field] ?? '').toLowerCase().trim()); if (new Set(v).size !== v.length) errs.push(`${field} repeats`) }
  if (s === 'spell') {
    const tested = items.map(testedWord)
    if (new Set(tested).size !== tested.length) errs.push('a tested spelling word repeats')
    const words = c => String(c).toLowerCase().replace(/[^a-z'\s-]/g, ' ').replace(/'s\b/g, '').split(/[\s-]+/).filter(Boolean)
    items.forEach((it, a) => items.forEach((x, b) => { if (a !== b && x.choices.some(c => words(c).includes(tested[a]))) errs.push(`tested word "${tested[a]}" (${it.id}) appears in ${x.id}`) }))
  }
  const fam = sub => ({ T2: t2(sub, o), T2L: t2L(sub, o) })
  const F = fam(items)
  for (const [nm, T] of Object.entries(F)) if (T.fires) errs.push(`${nm} ${T.best} predicts the key: ${(100 * T.bestScore).toFixed(1)}% vs control ${(100 * T.control).toFixed(1)}%, family-wise p ${T.fwP.toFixed(4)}`)
  const perFormat = {}
  if (s === 'spell') for (const f of ['word', 'sentence']) {
    const sub = items.filter(i => i.spelling_format === f)
    if (!sub.length) continue
    perFormat[f] = fam(sub)
    for (const [nm, T] of Object.entries(perFormat[f])) if (T.fires) errs.push(`${nm}[${f}] ${T.best} predicts the key: ${(100 * T.bestScore).toFixed(1)}% vs control ${(100 * T.control).toFixed(1)}%, family-wise p ${T.fwP.toFixed(4)}`)
  }
  const e = e3Counts(items)
  return { errs, n, longest: e.longest, shortest: e.shortest, fam: F, perFormat }
}

// ---------- the seeded assignment ----------
/*
 * Per word item, an unordered PAIR of edit types, chosen by a seeded search
 * so that on every seedable count feature (length, vowels, consonants,
 * doubled consonants) no T2 selector scores above ASSIGN_CAP on (a) all 32
 * word items, (b) the 20 the freeze takes if nothing drops, and in mean over
 * 400 seeded per-grade 5-of-8 subsets; letter class balanced (vowel-class
 * edits 30-34 of 64); rarer real-student edits capped (AC <= 4, XC <= 6,
 * DC <= 10); AC and XC only beside a common type.
 */
export const ASSIGN_CAP = 0.3126
const COMMON = ['DV', 'DD', 'DC', 'AV', 'AD', 'XV']
export const PAIR_MENU = (() => { const m = new Set(); for (const a of Object.keys(TYPES)) for (const b of Object.keys(TYPES)) { if (!COMMON.includes(a) && !COMMON.includes(b)) continue; if (a === 'DC' && b === 'DC') continue; m.add(pairKey([a, b])) } return [...m].sort() })()
const FEATS4 = ['len', 'vowels', 'consonants', 'dbl']
const vecT = t => { const [l, v, d] = TYPES[t]; return { len: l, vowels: v, consonants: l - v, dbl: d } }
/** selector scores of the key (value 0) among {0, a, b, a+b}, per feature x selector */
function itemScores(pair) {
  const [a, b] = pair.split('+').map(vecT), out = []
  for (const f of FEATS4) {
    const v = [0, a[f], b[f], a[f] + b[f]]
    for (const sel of Object.values(SEL)) { const S = sel(v); out.push(S ? (S.includes(0) ? 1 / S.length : 0) : 0.25) }
  }
  return out
}
const SC = Object.fromEntries(PAIR_MENU.map(p => [p, itemScores(p)]))
export const maxScore = pairsList => { const n = pairsList.length, acc = new Array(SC[PAIR_MENU[0]].length).fill(0); for (const p of pairsList) SC[p].forEach((x, i) => (acc[i] += x)); return Math.max(...acc) / n }
export const scoreNames = () => FEATS4.flatMap(f => Object.keys(SEL).map(s => `${s}(${f})`))
export const scoreTable = pairsList => { const n = pairsList.length, acc = new Array(SC[PAIR_MENU[0]].length).fill(0); for (const p of pairsList) SC[p].forEach((x, i) => (acc[i] += x)); return Object.fromEntries(scoreNames().map((nm, i) => [nm, acc[i] / n])) }
export const wordIds = () => [5, 6, 7, 8].flatMap((g, gi) => FORMAT_ORDER.map((f, j) => [`MLV4-S${String(gi * 12 + j + 1).padStart(2, '0')}`, f]).filter(([, f]) => f === 'word').map(([id]) => id))
export const sentenceIds = () => [5, 6, 7, 8].flatMap((g, gi) => FORMAT_ORDER.map((f, j) => [`MLV4-S${String(gi * 12 + j + 1).padStart(2, '0')}`, f]).filter(([, f]) => f === 'sentence').map(([id]) => id))
export const likelyFrozenWord = ids => ids.filter(id => { const p = ((idNum(id) - 1) % 12) + 1; return p <= 7 })
function subsets(ids, k, r, T) { const by = {}; ids.forEach(id => (by[Math.floor((idNum(id) - 1) / 12)] ??= []).push(id)); return Array.from({ length: T }, () => Object.values(by).flatMap(g => shuffleWith(g.slice(), r).slice(0, k))) }
export function assignmentStats(asg) {
  const ids = Object.keys(asg), all = ids.map(i => asg[i]), lf = likelyFrozenWord(ids).map(i => asg[i])
  const subs = subsets(ids, 5, rng(seedOf('map-lu-v4-wclass-subsets')), 400).map(s => maxScore(s.map(i => asg[i])))
  const edges = all.flatMap(p => p.split('+')), cnt = t => edges.filter(e => e === t).length
  return { all: maxScore(all), lf: maxScore(lf), subMean: subs.reduce((a, b) => a + b, 0) / subs.length, subP90: subs.sort((a, b) => a - b)[Math.floor(0.9 * subs.length)], vowelEdits: edges.filter(e => VOWEL_CLASS.has(e)).length, counts: Object.fromEntries(Object.keys(TYPES).map(t => [t, cnt(t)])) }
}
const feasible = st => st.vowelEdits >= 30 && st.vowelEdits <= 34 && st.counts.AC <= 4 && st.counts.XC <= 6 && st.counts.DC <= 10
export function searchAssignment(seedStr = 'map-lu-v4-wclass', iters = 6000) {
  const ids = wordIds(), r = rng(seedOf(seedStr))
  const obj = st => Math.max(st.all, st.lf) + 0.5 * st.subMean + (feasible(st) ? 0 : 1)
  let cur = Object.fromEntries(ids.map(i => [i, PAIR_MENU[Math.floor(r() * PAIR_MENU.length)]])), cs = assignmentStats(cur), co = obj(cs)
  for (let t = 0; t < iters; t++) {
    const nx = { ...cur }, id = ids[Math.floor(r() * ids.length)]; nx[id] = PAIR_MENU[Math.floor(r() * PAIR_MENU.length)]
    const ns = assignmentStats(nx), no = obj(ns)
    if (no <= co) { cur = nx; cs = ns; co = no }
  }
  return { asg: cur, stats: cs }
}
/** sentence-format key length ranks: each rank twice among each half (first two / last two sentence items per grade) */
export function assignRanks(seedStr = 'map-lu-v4-lrank') {
  const ids = sentenceIds(), r = rng(seedOf(seedStr)), out = {}
  for (const half of [0, 1]) {
    const sub = ids.filter((_, i) => Math.floor((i % 4) / 2) === half)
    const ranks = shuffleWith([1, 1, 2, 2, 3, 3, 4, 4], r)
    sub.forEach((id, i) => (out[id] = ranks[i]))
  }
  return Object.fromEntries(ids.map(i => [i, out[i]]))
}

// ---------- Spelling pre-flight and the one seeded re-draw ----------
/** First survivors per grade quota, in id order. */
export function firstPick(pool, s) { const pick = []; for (const [gr, q] of Object.entries(FREEZE[s])) pick.push(...pool.filter(i => strandOf(i) === s && i.grade_target === +gr).slice(0, q)); return pick }
/** The re-draw: per grade, the same number of word and sentence items as the first pick, sampled from that grade's survivors of each format by a seeded shuffle. */
export function redraw(pool, first, seedStr = 'map-lu-v4-redraw') {
  const r = rng(seedOf(seedStr)), out = []
  for (const gr of Object.keys(FREEZE.spell).map(Number)) for (const f of ['word', 'sentence']) {
    const need = first.filter(i => i.grade_target === gr && i.spelling_format === f).length
    const cand = shuffleWith(pool.filter(i => strandOf(i) === 'spell' && i.grade_target === gr && i.spelling_format === f), r)
    out.push(...cand.slice(0, need))
  }
  return out.sort((a, b) => idNum(a.id) - idNum(b.id))
}
/** Pre-flight decision: returns { pick, which: 'first'|'redraw'|'fail', first, second } using a checker (items -> errs[]). */
export function preflightDecide(pool, check, seedStr) {
  const first = firstPick(pool, 'spell'), e1 = check(first)
  if (!e1.length) return { pick: first, which: 'first', errsFirst: e1 }
  const second = redraw(pool, first, seedStr), e2 = check(second)
  return e2.length ? { pick: second, which: 'fail', errsFirst: e1, errsSecond: e2 } : { pick: second, which: 'redraw', errsFirst: e1, errsSecond: e2 }
}

/** revisions + re-rate drops + repairs, as v3 (no re-profile step in v4). */
function pipeline() {
  const authored = rd(W + 'batch.authored.json')
  const rev = existsSync(W + 'revised.json') ? Object.fromEntries(rd(W + 'revised.json').map(i => [i.id, i])) : {}
  const dropped = []
  if (Object.keys(rev).length) {
    const ra = rd(W + 'rerate-a.json'), rb = rd(W + 'rerate-b.json')
    for (const id of Object.keys(rev)) {
      const orig = authored.find(i => i.id === id)
      if (!orig) die(`revised item ${id} is not in the authored batch`)
      const newOpts = rev[id].choices.filter(c => c !== rev[id].correct_answer && !orig.choices.includes(c))
      for (const opt of newOpts) {
        const a = ra[id]?.distractors?.find(d => d.option === opt), b = rb[id]?.distractors?.find(d => d.option === opt)
        if (!a || !b) die(`${id}: re-rate missing for "${opt.slice(0, 40)}"`)
        if (a.would_pick !== 'yes' || b.would_pick !== 'yes') { dropped.push(id); break }
      }
    }
  }
  const after = authored.map(i => rev[i.id] ?? i).filter(i => !dropped.includes(i.id))
  const repairs = existsSync(W + 'repairs.json') ? rd(W + 'repairs.json') : {}
  const fixed = after.map(i => repairs[i.id] ?? i)
  const dups = dupFails(fixed, new Set([...Object.keys(rev), ...Object.keys(repairs)]))
  const errsOf = i => [...structural(i).errs, ...(dups[i.id] ? [dups[i.id]] : [])]
  return { authored, rev, dropped, after, repairs, fixed, errsOf, exactFail: fixed.filter(i => errsOf(i).length), survivors: fixed.filter(i => !errsOf(i).length) }
}

// ---------- selftest ----------
async function selftest() {
  let fail = 0
  const expect = (c, m) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fail++ }
  const z = (n, v) => Array(n).fill(v)
  const rv = p => JSON.parse(readFileSync(SB + p, 'utf8'))
  for (const s of STRANDS) for (const [g, q] of Object.entries(FREEZE[s])) expect(q <= AUTHORED[s][g], `${s} grade ${g}: freeze ${q} <= authored ${AUTHORED[s][g]}`)
  expect(nFrozen('spell') === 28 && nFrozen('gram') === 12 && nFrozen('cap') === 8, 'frozen sizes 28 / 12 / 8')
  expect(FORMAT_ORDER.slice(0, 7).filter(f => f === 'word').length === 5 && FORMAT_ORDER.filter(f => f === 'word').length === 8, 'format order: 8 word + 4 sentence per grade, the first 7 hold 5 word + 2 sentence')
  // bars at every v4 strand size
  for (const s of STRANDS) {
    const n = nFrozen(s), base = { n, pass: n, easier: 0, harder: 0, diffs: { a: z(n, 0), b: z(n, 0) }, candPct: 90, ctlPct: 70 }
    const pb = passBar(n), em = easierMax(n), hl = Math.ceil(harderLt(n))
    expect(bars({ ...base, pass: pb }).b && !bars({ ...base, pass: pb - 1 }).b, `${s} n=${n} S1-b: ${pb} passes, ${pb - 1} fails`)
    expect(bars({ ...base, easier: em }).c && !bars({ ...base, easier: em + 1 }).c, `${s} S1-c: easier ${em}/${2 * n} passes, ${em + 1} fails`)
    expect(bars({ ...base, harder: hl - 1 }).c && !bars({ ...base, harder: hl }).c, `${s} S1-c: harder ${hl - 1}/${2 * n} passes, ${hl} fails`)
    const half = Math.floor(n / 2)
    expect(bars({ ...base, diffs: { a: [...z(half, -1), ...z(n - half, 0)], b: z(n, 0) } }).d, `${s} S1-d: mean -${(half / n).toFixed(2)} passes`)
    expect(!bars({ ...base, diffs: { a: z(n, 0), b: [...z(half + 1, 1), ...z(n - half - 1, 0)] } }).d, `${s} S1-d: +${((half + 1) / n).toFixed(2)} fails`)
  }
  expect(passBar(28) >= 20, `Spelling pilot-pass bar ${passBar(28)}/28 is at or above the owner's ~20, so a passing strand clears at least ${passBar(28)}`)
  const ob = { n: 28, pass: 28, easier: 0, harder: 0, diffs: { a: z(28, 0), b: z(28, 0) } }
  expect(bars({ ...ob, candPct: 90, ctlPct: 100 }).oo && !bars({ ...ob, candPct: 89.9, ctlPct: 100 }).oo, 'S2 ceiling: at a 100% control the bar is 90, attainable both ways')
  expect(!bars({ ...ob, candPct: 100, ctlPct: 24.9 }).oo, 'S2: control below 25% is INVALID and cannot pass')

  // T2-L: the copied selectors reproduce v2's T2 exactly over v2's features
  const FEAT2 = { len: s => s.length, words: s => s.trim().split(/\s+/).length, caps: s => (s.match(/[A-Z]/g) ?? []).length, marks: s => (s.match(/[.,;:!?'"‘’“”()\-–—…]/g) ?? []).length, commas: s => (s.match(/,/g) ?? []).length, doubles: s => (s.match(/([a-z])\1/gi) ?? []).length, vowels: s => (s.match(/[aeiouy]/gi) ?? []).length }
  const v3pick = rv('map-lu-v3/stage0-pick-spell.json'), v3w = v3pick.filter(i => i.spelling_format === 'word')
  const mine = t2family(v3w, heuristicsOf(v3w, FEAT2, { dlsum: true })), theirs = t2(v3w)
  expect(Object.keys(theirs.obs).every(k => Math.abs(theirs.obs[k] - mine.obs[k]) < 1e-12) && Math.abs(mine.fwP - theirs.fwP) < 1e-12, `copied selectors reproduce v2's T2 on v3's word picks (${Object.keys(theirs.obs).length} heuristics, fw p ${theirs.fwP.toFixed(4)} = ${mine.fwP.toFixed(4)})`)
  expect(theirs.fires && theirs.best === 'unique_min(vowels)', `v2's T2 still fires on v3's Stage 0 word picks (the vowel tell): ${fmtT(theirs)}`)
  const merged = t2family(v3w, heuristicsOf(v3w, { ...FEAT2, ...LFEAT }, { dlsum: true, alpha: true }))
  expect(!merged.fires && merged.fwP > 0.1, `ONE merged family would MISS v3's tell (fw p ${merged.fwP.toFixed(4)} over ${merged.nH} heuristics): the letter features are a second family`)
  // T2-L catches a consonant-count tell that v2's T2 cannot see (length and vowels balanced, consonants not)
  // constructed: all four options equal in length, vowels, marks, doubles and edit distance; the key alone has a
  // non-letter ('#') where the others have a consonant, so only the consonant count (a letter-class feature) separates it
  const ct = Array.from({ length: 20 }, (_, i) => { const st = 'abcdefghijklmnopqrst'.slice(i % 10, (i % 10) + 6).replace(/[aeiou]/g, 'x'); const key = st.slice(0, 2) + 'a#o' + st.slice(2, 4); const ch = [key, ...['k', 'm', 'p'].map(c => key.replace('#', c))]; return { choices: ch, correct_answer: key } })
  const ctv2 = t2(ct), ctL = t2L(ct)
  expect(!ctv2.fires && ctL.fires && /consonants|vruns|vv|cc|distinct|final_v|alpha|dbl/.test(ctL.best), `a constructed consonant-count tell: v2's T2 ${ctv2.fires ? 'fires' : 'clear'} (fw p ${ctv2.fwP.toFixed(4)}), T2-L ${ctL.fires ? 'FIRES' : 'clear'} on ${ctL.best} ${(100 * ctL.bestScore).toFixed(1)}%`)
  // the same constructed tell with keys randomised: T2-L stays clear (it reads the key, not the options)
  const ctr = ct.map((it, i) => ({ ...it, correct_answer: it.choices[i % 4] }))
  expect(!t2L(ctr).fires, `T2-L is clear on the same options with the key rotated through all four slots (fw p ${t2L(ctr).fwP.toFixed(4)})`)
  console.log(`info T2-L on v3's Stage 0 word picks: ${fmtT(t2L(v3w))}`)
  const v3p = rv('map-lu-v3/inserted-punct.batch.json')
  console.log(`info T2-L on v3's 11 inserted Punctuation items: ${fmtT(t2L(v3p))}`)
  expect(t2(rv('map-lu-mech-v1.batch.json').filter(i => strandOf(i) === 'cap')).fires, "v2's T2 (imported, unchanged) still fires on v1 Capitalization")

  // L-class
  const it0 = { correct_answer: 'necessary', choices: ['necessary', 'neccessary', 'necesary', 'neccesary'] }
  expect(!classErr({ ...it0, edit_types: ['AD', 'DD'] }), `L-class: necessary/neccessary/necesary/neccesary reads as AD+DD (${classErr({ ...it0, edit_types: ['AD', 'DD'] })})`)
  expect(!!classErr({ ...it0, edit_types: ['AD', 'DC'] }), 'L-class: the same item assigned AD+DC FAILS')
  expect(!!classErr(it0), 'L-class: a word item with no assigned types FAILS')
  const asgS01 = assigned().types['MLV4-S01']
  if (asgS01) { const good = synthFor('MLV4-S01', asgS01), other = synthFor('MLV4-S01', 'DD+DV'); expect(!structural({ ...good, map_strand: 'Spelling', spelling_format: 'word' }).errs.some(e => /L-class/.test(e)) && structural({ ...other, map_strand: 'Spelling', spelling_format: 'word' }).errs.some(e => /not the assigned/.test(e)), `L-class: an item realising its seeded pair passes; the same id carrying a different (valid) pair fails`) }
  const dis = { correct_answer: 'disastrous', choices: ['disastrous', 'disasterous', 'disastrious', 'disasterious'] }
  expect(!classErr({ ...dis, edit_types: ['AV', 'AV'] }) && !!classErr({ ...dis, edit_types: ['AC', 'AV'] }), 'L-class: disasterous / disastrious read as AV+AV (vowels added), and AC+AV fails')
  expect(editType('separate', 'seperate').t === 'XV' && editType('ecstasy', 'ecstacy').t === 'XC' && editType('receive', 'recieve').t === 'XV', 'L-class: seperate XV, ecstacy XC, recieve (vowel swap) XV')
  expect(!!editType('committee', 'committe').err && editType('committee', 'commitee').t === 'DD', 'L-class: committe (breaks the doubled vowel) fits no type; commitee (drops a t) is DD')
  expect(editType('government', 'goverment').t === 'DC' && editType('exercise', 'excercise').t === 'AC' && editType('temperature', 'temprature').t === 'DV', 'L-class: goverment DC, excercise AC, temprature DV')
  expect(editType('calendar', 'calendor').t === 'XV', 'L-class: calendor XV')
  expect(!!editType('able', 'abel').err, 'L-class: a cross-class swap (le -> el) fits no type')
  // v3's frozen word items under L-class: the 'shortest' vowel-adding items would have needed vowel-class seeds
  const v3t = v3w.map(it => { const k = it.correct_answer, s = it.choices.filter(c => c !== k && dl(k, c) === 1); return pairKey(s.map(x => editType(k, x).t ?? 'ERR')) })
  console.log(`info v3's 16 frozen word items read as: ${v3t.join(' ')}`)

  // the seeded assignment: reproducible, balanced, within the cap
  const asgFile = existsSync(W + 'wclass.json') ? rd(W + 'wclass.json') : null
  if (asgFile) {
    const re = searchAssignment(asgFile.seedString, asgFile.iters)
    expect(JSON.stringify(re.asg) === JSON.stringify(asgFile.types), `wclass.json reproduces from its seed (${asgFile.seedString}, ${asgFile.iters} iterations)`)
    const st = assignmentStats(asgFile.types)
    expect(st.all <= ASSIGN_CAP && st.lf <= ASSIGN_CAP, `assignment: max selector score on the seedable features ${(100 * st.all).toFixed(1)}% on all 32, ${(100 * st.lf).toFixed(1)}% on the likely-frozen 20 (cap ${(100 * ASSIGN_CAP).toFixed(1)}%); subsets mean ${(100 * st.subMean).toFixed(1)}%, p90 ${(100 * st.subP90).toFixed(1)}%`)
    expect(feasible(st), `assignment: vowel-class edits ${st.vowelEdits}/64, counts ${JSON.stringify(st.counts)}`)
    // and the synthetic items it implies pass T2 and T2-L as computed on strings
    const syn = Object.entries(asgFile.types).map(([id, p]) => synthFor(id, p))
    expect(syn.every(s => !classErr(s)), `synthetic items realise every assigned pair exactly (${syn.map(classErr).filter(Boolean)[0] ?? 'all ok'})`)
    const sT = t2(syn), sL = t2L(syn)
    console.log(`info synthetic realisation of the assignment: T2 ${fmtT(sT)}\ninfo T2-L ${fmtT(sL)}`)
    // a v3-style assignment (lengths balanced, every added letter a vowel, every dropped letter from a double) FIRES on vowels or doubles
    const v3style = Object.keys(asgFile.types).map((id, i) => synthFor(id, ['AV+AV', 'DD+DD', 'XV+XV', 'AV+DD'][i % 4]))
    const v3sT = t2(v3style)
    expect(v3sT.fires, `a v3-style assignment (length-balanced profiles, letter class free: adds = vowels, drops = doubles) fires T2: ${v3sT.best} ${(100 * v3sT.bestScore).toFixed(1)}%, fw p ${v3sT.fwP.toFixed(4)}`)
    const sTab = scoreTable(Object.values(asgFile.types)), v3Tab = scoreTable(['AV+AV', 'DD+DD', 'XV+XV', 'AV+DD'].flatMap(p => z(8, p)))
    console.log(`info top seedable selector scores, assignment: ${Object.entries(sTab).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n, v]) => `${n} ${(100 * v).toFixed(1)}`).join(', ')}; v3-style: ${Object.entries(v3Tab).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n, v]) => `${n} ${(100 * v).toFixed(1)}`).join(', ')}`)
  } else expect(false, 'wclass.json missing (run assign)')
  const lr = existsSync(W + 'lrank.json') ? rd(W + 'lrank.json').ranks : null
  expect(lr && JSON.stringify(lr) === JSON.stringify(assignRanks()) && [1, 2, 3, 4].every(k => Object.values(lr).filter(x => x === k).length === 4), 'lrank.json reproduces from its seed; each rank used 4 times')

  // pre-flight and the one re-draw
  const mkS = (id, g, f, tag) => ({ id, map_strand: 'Spelling', grade_target: g, spelling_format: f, tag, choices: ['a', 'b', 'c', 'd'], correct_answer: 'a' })
  const pool = [5, 6, 7, 8].flatMap((g, gi) => FORMAT_ORDER.map((f, j) => mkS(`MLV4-S${String(gi * 12 + j + 1).padStart(2, '0')}`, g, f, j)))
  const fp = firstPick(pool, 'spell')
  expect(fp.length === 28 && fp.filter(i => i.spelling_format === 'word').length === 20, 'first pick: 28 items, 20 word + 8 sentence when nothing drops')
  const okAll = preflightDecide(pool, () => [])
  expect(okAll.which === 'first' && okAll.pick === okAll.pick && okAll.pick.length === 28, 'pre-flight: a clean first pick is frozen as is (no re-draw)')
  const firstBad = preflightDecide(pool, p => (p.every(i => i.tag <= 6) ? ['fires'] : []))
  expect(firstBad.which === 'redraw' && firstBad.pick.some(i => i.tag > 6) && firstBad.pick.length === 28, `pre-flight: a first pick that fires is re-drawn once; the re-draw (clean) is frozen (${firstBad.pick.filter(i => i.tag > 6).length} later items in)`)
  const bothBad = preflightDecide(pool, () => ['fires'])
  expect(bothBad.which === 'fail', 'pre-flight: when the re-draw fires too, the strand FAILS (no second re-draw)')
  const rd1 = redraw(pool, fp), rd2 = redraw(pool, fp)
  expect(JSON.stringify(rd1.map(i => i.id)) === JSON.stringify(rd2.map(i => i.id)) && [5, 6, 7, 8].every(g => ['word', 'sentence'].every(f => rd1.filter(i => i.grade_target === g && i.spelling_format === f).length === fp.filter(i => i.grade_target === g && i.spelling_format === f).length)), 're-draw is deterministic (seeded) and keeps each grade\'s word / sentence counts')
  // on v3's real data: v3's Stage 0 Spelling would have been re-drawn (shown, not a bar)
  const v3under4 = batchChecks(v3pick, 'spell').errs
  expect(v3under4.some(e => /^T2\[word\] unique_min\(vowels\)/.test(e)), `v4's Stage 0 checker refuses v3's Spelling pick on the same tell (${v3under4.join('; ')})`)

  // pooled E3 and the screen are v3's (imported); re-assert their margins at v4's sizes
  const mk = (n, kLong) => Array.from({ length: n }, (_, i) => ({ choices: i < kLong ? ['aaaaaaaa', 'bb', 'ccc', 'dddd'] : ['aa', 'bbbbbbbb', 'ccc', 'dddd'], correct_answer: i < kLong ? 'aaaaaaaa' : 'ccc' }))
  expect(!Object.keys(pooledE3({ spell: mk(28, 7), gram: mk(12, 3), cap: mk(8, 2) }).fails).length, 'pooled E3 at exactly 12/48 = 25.0% passes')
  const over = pooledE3({ spell: mk(28, 7), gram: mk(12, 4), cap: mk(8, 2) })
  expect(Object.keys(over.fails).join() === 'gram', `pooled E3 at 13/48 fails, attributed only to the strand over 25% (${Object.keys(over.fails).join()})`)
  const it5 = { id: 'X', map_strand: 'Spelling', spelling_format: 'word', correct_answer: 'word', grade_target: 5, choices: [] }
  expect(!screenDrops([it5], { word: { grade: 5 } }, { word: { grade: 5 } }).drops.X && !!screenDrops([it5], { word: { grade: 4 } }, { word: { grade: 4 } }).drops.X && !!screenDrops([it5], { word: { grade: 4 } }, {}).error, 'screen (v3): at target keeps, both below drops, missing is an error')
  // per-format dealing at v4's group sizes, including uneven ones after a drop
  for (const [w, s] of [[20, 8], [21, 7], [19, 9]]) {
    const synth = [...z(w, 0).map((_, i) => ({ id: 'w' + i, map_strand: 'Spelling', spelling_format: 'word' })), ...z(s, 0).map((_, i) => ({ id: 's' + i, map_strand: 'Spelling', spelling_format: 'sentence' })), ...z(12, 0).map((_, i) => ({ id: 'g' + i, map_strand: 'Parts of Speech' })), ...z(8, 0).map((_, i) => ({ id: 'c' + i, map_strand: 'Capitalization' }))]
    let ok = true
    for (let t = 0; t < 20; t++) { const r = rng(300 + t), order = shuffleWith(synth.slice(), r), letters = dealFlat(order, r); if (!slotCheck(order.map((it, i) => ({ strand: strandOf(it), group: fmtGroup(it), letter: letters[i] }))).ok) ok = false }
    expect(ok, `dealFlat passes the slot bar with Spelling word ${w} / sentence ${s}, 20 seeds`)
  }
  // grade sets
  expect(structural({ map_strand: 'Capitalization', grade_target: 5, ccss: 'L.5.2a', choices: ['A b.', 'a b.', 'A B.', 'a B.'], correct_answer: 'A b.', cap_rule: 'x', prompt: 'p' }).errs.some(e => /not in 6 for cap/.test(e)), 'a grade-5 Capitalization item fails v4 (grade 6 only)')
  expect(structural({ map_strand: 'Parts of Speech', grade_target: 7, ccss: 'L.7.1a', choices: ['a', 'b', 'c', 'd'], correct_answer: 'a', varied_dimension: 'x', prompt: 'p' }).errs.some(e => /not in 5\/6 for gram/.test(e)), 'a grade-7 Grammar item fails v4 (grades 5-6 only)')
  expect(structural({ map_strand: 'Punctuation', grade_target: 7, ccss: 'L.7.2a', choices: ['a', 'b', 'c', 'd'], correct_answer: 'a', punct_rule: 'x', prompt: 'p' }).errs.some(e => /not in map-lu-v4/.test(e)), 'a Punctuation item fails v4 (not in this batch)')
  console.log(fail ? `SELFTEST FAILED (${fail})` : 'selftest passed: every new rule and bar can fail at its margin')
  process.exit(fail ? 1 : 0)
}
/** A synthetic word item realising an assigned type pair, for the selftest (letters chosen to hit each type exactly). */
export function synthFor(id, pair) {
  const [t1, t2x] = pair.split('+')
  // key: two well-separated segments; segment edits never touch each other
  const seg = { DV: ['bat', 'bt'], DD: ['bass', 'bas'], DC: ['bant', 'bat'], AV: ['bt', 'bat'], AD: ['bas', 'bass'], AC: ['bat', 'bant'], XV: ['bat', 'bet'], XC: ['bat', 'bad'] }
  const seg2 = { DV: ['lom', 'lm'], DD: ['lopp', 'lop'], DC: ['lomp', 'lom'], AV: ['lm', 'lom'], AD: ['lop', 'lopp'], AC: ['lom', 'lomp'], XV: ['lom', 'lum'], XC: ['lom', 'lot'] }
  const [k1, e1] = seg[t1], [k2, e2] = seg2[t2x]
  const key = 'r' + k1 + 'i' + k2 + 'e'
  const first = 'r' + e1 + 'i' + k2 + 'e', second = 'r' + k1 + 'i' + e2 + 'e', both = 'r' + e1 + 'i' + e2 + 'e'
  return { id, choices: [key, first, second, both], correct_answer: key, edit_types: [t1, t2x] }
}

// ---------- modes ----------
const [mode, arg] = process.argv.slice(2)
const isMain = import.meta.url === `file://${process.argv[1]}`
if (!isMain) { /* imported */ }
else if (mode === '--selftest') await selftest()
else if (mode === 'spell') {
  const ws = process.argv.slice(3)
  if (!ws.length) die('usage: spell <word...>')
  const ns = nsspell(ws.map(w => w.toLowerCase()))
  ws.forEach((w, i) => console.log(`${w.padEnd(18)} NSSpellChecker ${ns[i] ? 'accepts' : 'rejects'} | as a correct word: ${variantHit(w) ? 'REFUSED (' + variantHit(w) + ')' : 'ok'} | as a misspelling: ${misspellingOk(w).length ? 'REFUSED (' + misspellingOk(w).join('; ') + ')' : 'ok'}`))
}
else if (mode === 'edit') {
  // author aid: the type of each single edit from a key to each misspelling, and the L-class verdict for a full set
  const [k, ...os] = process.argv.slice(3)
  if (!k || !os.length) die('usage: edit <key> <misspelling...> [types=XX+YY]')
  for (const o of os.filter(a => !/^types=/.test(a))) { const d = dl(k, o); if (d !== 1) { console.log(`${o.padEnd(18)} ${d} edits from "${k}"${d === 2 ? ' (the both-errors option)' : ''}`); continue } const e = editType(k, o); console.log(`${o.padEnd(18)} ${e.t ?? 'NO TYPE: ' + e.err}`) }
  const types = os.find(a => /^types=/.test(a)), ms = os.filter(a => !/^types=/.test(a))
  if (types && ms.length === 3) { const r = classErr({ correct_answer: k, choices: [k, ...ms], edit_types: types.slice(6).split('+') }); console.log(r ? `L-class: ${r}` : 'L-class: ok') }
}
else if (mode === 'assign') {
  const iters = 6000, seedString = 'map-lu-v4-wclass'
  const { asg, stats } = searchAssignment(seedString, iters)
  if (stats.all > ASSIGN_CAP || stats.lf > ASSIGN_CAP || !feasible(stats)) die(`assignment search did not meet the cap: ${JSON.stringify(stats)}`)
  wr(W + 'wclass.json', { seedString, iters, note: 'L-class: an unordered pair of seeded edit types per word-format Spelling item (see map-lu-v4.mjs TYPES)', stats, types: asg })
  wr(W + 'lrank.json', { seed: 'sha256("map-lu-v4-lrank")', note: 'key length rank (1 = longest ... 4 = shortest) per sentence-format Spelling item; each rank twice among the first two sentence items of the four grades and twice among the last two', ranks: assignRanks() })
  console.log(`assign: ${Object.keys(asg).length} word items; max selector ${(100 * stats.all).toFixed(1)}% (all), ${(100 * stats.lf).toFixed(1)}% (likely-frozen 20), subsets mean ${(100 * stats.subMean).toFixed(1)}% p90 ${(100 * stats.subP90).toFixed(1)}%; vowel-class edits ${stats.vowelEdits}/64; ${JSON.stringify(stats.counts)}`)
  for (const [id, p] of Object.entries(asg)) console.log(`  ${id} ${p}`)
}
else if (mode === 'select-control') {
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const rows = []
  for (const [fam, sec, dom] of [['sat', 'reading_writing', 'Standard English Conventions'], ['act', 'english', 'Conventions of Standard English']]) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from('study_item_bank').select('id,family,section,domain,subskill,difficulty,item').eq('family', fam).eq('section', sec).eq('domain', dom).eq('verified', true).eq('archived', false).in('difficulty', ['easy', 'medium']).order('id').range(from, from + 999)
      if (error) die(error.message)
      rows.push(...data); if (data.length < 1000) break
    }
  }
  if (rows.length < 200) die(`only ${rows.length} live conventions rows read`)
  const PUNCT = /punctuat|boundar|comma|semicolon|colon|dash|apostroph|possessive|splice|run-on|parenthe|quotation/i, FRAG = /fragment/i
  const prior = new Set([...rd(SB + 'map-lu-v2/control.json'), ...rd(SB + 'map-lu-v3/control.json')].map(c => c.id))
  const four = rows.filter(r => Array.isArray(r.item?.choices) && r.item.choices.length === 4 && r.item.choices.includes(r.item.correct_answer) && !prior.has(r.id))
  const h = r => createHash('sha256').update('map-lu-v4-control:' + r.id).digest('hex')
  const punct = four.filter(r => !FRAG.test(r.subskill ?? '') && PUNCT.test(r.subskill ?? '')).sort((a, b) => (h(a) < h(b) ? -1 : 1)).slice(0, 12)
  const gram = four.filter(r => FRAG.test(r.subskill ?? '') || !PUNCT.test(r.subskill ?? '')).sort((a, b) => (h(a) < h(b) ? -1 : 1)).slice(0, 12)
  if (punct.length !== 12 || gram.length !== 12) die('could not fill 12 + 12')
  const ctl = [...punct.map(r => ({ ...r, ctl: 'punct' })), ...gram.map(r => ({ ...r, ctl: 'gram' }))].map(r => ({ id: r.id, family: r.family, domain: r.domain, subskill: r.subskill, difficulty: r.difficulty, ctl: r.ctl, choices: r.item.choices, correct_answer: r.item.correct_answer }))
  wr(W + 'control.json', ctl)
  const hist = {}; for (const c of ctl) { const kk = `${c.family}/${c.ctl}/${c.difficulty}`; hist[kk] = (hist[kk] ?? 0) + 1 }
  console.log(`control: ${ctl.length} of ${four.length} eligible four-choice live conventions rows (easy+medium, excluding v2's and v3's controls) from ${rows.length} read; ${JSON.stringify(hist)}; sha256 ${sha(W + 'control.json')}`)
}
else if (mode === 'checks' || mode === 'preflight') {
  const file = mode === 'preflight' ? W + 'batch.authored.json' : arg
  if (!file) die('usage: checks <batch.json>')
  const items = rd(file)
  if (!Array.isArray(items) || !items.length) die(`${file} holds no items`)
  let bad = 0, batchBad = 0
  const byStrand = {}
  for (const s of STRANDS) {
    const its = items.filter(i => strandOf(i) === s)
    if (!its.length) continue
    byStrand[s] = its
    console.log(`\n== ${s}: ${its.length} items`)
    if (mode === 'checks') {
      let scored = 0, unsc = 0
      for (const it of its) {
        const r = structural(it); scored += r.e1.scored; unsc += r.e1.unscorable
        console.log(`${r.errs.length ? 'FAIL' : 'ok  '} ${it.id} [g${it.grade_target} ${it.ccss}${it.spelling_format ? ' ' + it.spelling_format : ''}]${r.errs.length ? '\n       x ' + r.errs.join('\n       x ') : ''}`)
        if (r.errs.length) bad++
      }
      console.log(`E1 denominator: ${scored} scored units (>= 15 words), ${unsc} unscorable`)
    }
    const sets = mode === 'preflight' ? { 'all authored': its, 'likely frozen (first per grade quota, id order)': firstPick(its, s) } : { strand: its }
    for (const [nm, sub] of Object.entries(sets)) {
      const b = batchChecks(sub, s)
      console.log(`-- ${nm}: n=${sub.length}; E3 (reported; decided pooled) longest ${b.longest}/${b.n}, shortest ${b.shortest}/${b.n}`)
      for (const [fn, T] of Object.entries(b.fam)) console.log(`${fn} ${fmtT(T)}`)
      for (const [f, F] of Object.entries(b.perFormat)) for (const [fn, T] of Object.entries(F)) console.log(`${fn}[${f}] ${fmtT(T)}`)
      for (const e of b.errs) { console.log(`BATCH FAIL ${e}`); if (mode === 'checks') batchBad++ }
    }
  }
  const pe = pooledE3(byStrand)
  console.log(`\npooled E3: key uniquely longest ${pe.pooled.longest}/${pe.n}, uniquely shortest ${pe.pooled.shortest}/${pe.n}${Object.keys(pe.fails).length ? ' -> FAIL ' + JSON.stringify(pe.fails) : ' -> pass'}`)
  if (mode === 'preflight') process.exit(0)
  batchBad += Object.keys(pe.fails).length
  const unknown = items.filter(i => !strandOf(i)); if (unknown.length) { console.log(`unknown strand on ${unknown.map(i => i.id).join(', ')}`); bad += unknown.length }
  console.log(bad || batchBad ? `\n${bad} item failure(s), ${batchBad} batch failure(s)` : `\nall ${items.length} items pass every exact check`)
  process.exit(bad || batchBad ? 1 : 0)
}
else if (mode === 'teacher-input') {
  const items = rd(W + 'batch.authored.json')
  wr(W + 'teacher.input.json', items.map(it => ({ id: it.id, grade_target: it.grade_target, strand: it.map_strand, prompt: it.prompt, correct_answer: it.correct_answer, wrong_options: it.choices.filter(c => c !== it.correct_answer) })))
  console.log(`teacher input: ${items.length} items, ${items.length * 3} wrong options`)
}
else if (mode === 'teacher-merge') {
  const items = rd(W + 'batch.authored.json'), ta = rd(W + 'teacher-a.json'), tb = rd(W + 'teacher-b.json')
  const out = []; let n = 0, noA = 0, noB = 0
  for (const it of items) {
    const ra = ta[it.id]?.distractors, rb = tb[it.id]?.distractors
    if (ra?.length !== 3 || rb?.length !== 3) die(`${it.id}: a teacher file lacks 3 ratings`)
    const no = []
    for (const opt of it.choices.filter(c => c !== it.correct_answer)) {
      n++
      const a = ra.find(d => d.option === opt), b = rb.find(d => d.option === opt)
      if (!a || !b) die(`${it.id}: rating missing for "${opt.slice(0, 40)}"`)
      if (a.would_pick !== 'yes') noA++
      if (b.would_pick !== 'yes') noB++
      if (a.would_pick !== 'yes' || b.would_pick !== 'yes') no.push({ option: opt, reasons: [a, b].filter(x => x.would_pick !== 'yes').map(x => x.reason) })
    }
    if (no.length) out.push({ item: it, rated_no: no })
  }
  wr(W + 'revise.input.json', out)
  console.log(`teacher round 1: ${n} wrong options; rater a NO ${noA}, rater b NO ${noB}; union NO ${out.reduce((s, x) => s + x.rated_no.length, 0)} on ${out.length} items -> revise.input.json`)
}
else if (mode === 'rerate-input') {
  const rev = rd(W + 'revised.json'), orig = Object.fromEntries(rd(W + 'batch.authored.json').map(i => [i.id, i]))
  const out = rev.map(it => ({ id: it.id, grade_target: it.grade_target, strand: it.map_strand, prompt: it.prompt, correct_answer: it.correct_answer, wrong_options: it.choices.filter(c => c !== it.correct_answer && !orig[it.id].choices.includes(c)) })).filter(x => x.wrong_options.length)
  wr(W + 'rerate.input.json', out)
  console.log(`re-rate input: ${out.length} items, ${out.reduce((s, x) => s + x.wrong_options.length, 0)} rewritten options`)
}
else if (mode === 'repair-input') {
  const P = pipeline()
  const dups = dupFails(P.after, new Set(Object.keys(P.rev)))
  const failing = P.after.map(i => [i, [...structural(i).errs, ...(dups[i.id] ? [dups[i.id] + '. Every tested spelling word in the batch: ' + P.after.filter(x => strandOf(x) === 'spell').map(testedWord).join(', ')] : [])]]).filter(([, e]) => e.length)
  wr(W + 'repair.input.json', failing.map(([item, errors]) => ({ item, errors })))
  console.log(`dropped at re-rate: ${P.dropped.join(', ') || 'none'}; ${failing.length} items fail an exact check -> repair.input.json`)
  for (const [i, e] of failing) console.log(`  ${i.id}: ${e.join('; ')}`)
}
else if (mode === 'screen-input') {
  const P = pipeline()
  const ws = [...new Set(P.survivors.filter(i => strandOf(i) === 'spell').map(testedWord))]
  const h = w => createHash('sha256').update('map-lu-v4-screen:' + w).digest('hex')
  ws.sort((a, b) => (h(a) < h(b) ? -1 : 1))
  wr(W + 'screen.words.json', ws)
  console.log(`screen input: ${ws.length} tested words of ${P.survivors.filter(i => strandOf(i) === 'spell').length} surviving Spelling items -> screen.words.json (no item, no grade, sha256 order)`)
}
else if (mode === 'freeze') {
  const P = pipeline()
  const sd = screenDrops(P.survivors, rd(W + 'screen-a.json'), rd(W + 'screen-b.json'))
  if (sd.error) die(sd.error)
  const pool = P.survivors.filter(i => !sd.drops[i.id])
  console.log(`dropped at teacher re-rate: ${P.dropped.join(', ') || 'none'}`)
  console.log(`failing exact checks after repairs (dropped): ${P.exactFail.map(i => `${i.id} (${P.errsOf(i)[0]})`).join('; ') || 'none'}`)
  console.log(`dropped by the word-grade screen: ${Object.entries(sd.drops).map(([id, w]) => `${id} (${w.replace(/^screen: /, '')})`).join('; ') || 'none'}`)
  const report = {}, picks = {}
  for (const s of STRANDS) {
    let pick = firstPick(pool, s)
    const short = Object.entries(FREEZE[s]).filter(([gr, q]) => pick.filter(i => i.grade_target === +gr).length < q).map(([gr]) => gr)
    if (pick.length) wr(W + `stage0-pick-${s}.json`, pick)
    if (short.length) { report[s] = { stage0: 'FAIL', why: `fewer survivors than the quota at grade ${short.join(',')}`, n: pick.length }; continue }
    let pre = null
    if (s === 'spell') {
      pre = preflightDecide(pool, sub => batchChecks(sub, 'spell').errs)
      console.log(`spell PRE-FLIGHT on the first pick (${firstPick(pool, s).map(i => i.id).join(' ')}): ${pre.errsFirst.join('; ') || 'clear'}`)
      if (pre.which !== 'first') { console.log(`spell RE-DRAW (seeded, once): ${pre.pick.map(i => i.id).join(' ')} -> ${pre.errsSecond.join('; ') || 'clear'}`); wr(W + 'stage0-pick-spell-redraw.json', pre.pick) }
      pick = pre.pick
    }
    const b = batchChecks(pick, s)
    console.log(`${s}: E3 (reported) ${b.longest}/${b.n} longest, ${b.shortest}/${b.n} shortest`)
    for (const [fn, T] of Object.entries(b.fam)) console.log(`${s}: ${fn} ${fmtT(T)}`)
    for (const [f, F] of Object.entries(b.perFormat)) for (const [fn, T] of Object.entries(F)) console.log(`${s}: ${fn}[${f}] ${fmtT(T)}`)
    const t2sum = x => Object.fromEntries(Object.entries(x).map(([fn, T]) => [fn, { best: T.best, score: T.bestScore, fwP: T.fwP, fires: T.fires }]))
    const base = { n: pick.length, ids: pick.map(i => i.id), fam: t2sum(b.fam), perFormat: Object.fromEntries(Object.entries(b.perFormat).map(([f, F]) => [f, t2sum(F)])), longest: b.longest, shortest: b.shortest, preflight: pre ? { which: pre.which, errsFirst: pre.errsFirst, errsSecond: pre.errsSecond ?? null } : null }
    if (b.errs.length) { report[s] = { ...base, stage0: 'FAIL', why: b.errs.join('; ') }; continue }
    report[s] = { ...base, stage0: 'pass' }
    picks[s] = pick
  }
  const pe = pooledE3(picks)
  if (pe.n) {
    console.log(`pooled E3: longest ${pe.pooled.longest}/${pe.n}, shortest ${pe.pooled.shortest}/${pe.n}${Object.keys(pe.fails).length ? ' -> FAIL ' + JSON.stringify(pe.fails) : ' -> pass'}`)
    for (const [s, why] of Object.entries(pe.fails)) report[s] = { ...report[s], stage0: 'FAIL', why }
    report._pooledE3 = { n: pe.n, longest: pe.pooled.longest, shortest: pe.pooled.shortest, fails: pe.fails }
  }
  let frozen = STRANDS.filter(s => report[s]?.stage0 === 'pass').flatMap(s => picks[s])
  if (frozen.length) {
    const PF = { T2: t2(frozen), T2L: t2L(frozen) }
    for (const [fn, PT] of Object.entries(PF)) {
      console.log(`pooled: ${fn} ${fmtT(PT)}`)
      if (PT.fires) for (const s of STRANDS.filter(x => report[x]?.stage0 === 'pass')) {
        const sc = (fn === 'T2' ? t2 : t2L)(picks[s], { perms: 200 }).obs[PT.best]
        if (sc >= PT.control + T2_MARGIN) report[s] = { ...report[s], stage0: 'FAIL', why: `pooled ${fn} ${PT.best} fires (fw p ${PT.fwP.toFixed(4)}) and scores ${(100 * sc).toFixed(1)}% in this strand` }
      }
      report[`_pooled${fn}`] = { best: PT.best, score: PT.bestScore, fwP: PT.fwP, fires: PT.fires, n: PT.n }
    }
  }
  report._screen = { drops: sd.drops, words: P.survivors.filter(i => strandOf(i) === 'spell').length }
  frozen = STRANDS.filter(s => report[s]?.stage0 === 'pass').flatMap(s => picks[s])
  for (const s of STRANDS) console.log(`STAGE 0 ${s}: ${report[s]?.stage0 ?? 'absent'}${report[s]?.why ? ' - ' + report[s].why : ''} (n=${report[s]?.n ?? 0})`)
  wr(W + 'stage0.json', report)
  if (!frozen.length) { console.log('STAGE 0: no strand passed. Nothing frozen.'); process.exit(1) }
  wr(W + 'frozen.json', frozen)
  for (const s of STRANDS.filter(x => report[x]?.stage0 === 'pass')) wr(W + `frozen-${s}.json`, picks[s])
  console.log(`FROZEN ${frozen.length} items -> ${W}frozen.json; sha256 ${sha(W + 'frozen.json')}; grades ${JSON.stringify(frozen.reduce((o, i) => ((o[`${strandOf(i)}${i.grade_target}`] = (o[`${strandOf(i)}${i.grade_target}`] ?? 0) + 1), o), {}))}; spelling formats ${JSON.stringify(frozen.filter(i => strandOf(i) === 'spell').reduce((o, i) => ((o[i.spelling_format] = (o[i.spelling_format] ?? 0) + 1), o), {}))}`)
}
else if (mode === 'render') {
  const cand = rd(W + 'frozen.json'), ctl = rd(W + 'control.json')
  if (ctl.length !== 24) die(`control has ${ctl.length}, need 24`)
  const place = (choices, key, letter, r) => { const rest = shuffleWith(choices.filter(c => c !== key), r); let q = 0; return Object.fromEntries(SL.map(s => [s, s === letter ? key : rest[q++]])) }
  const all = [...cand.map(i => ({ ...i, arm: 'cand' })), ...ctl.map(i => ({ ...i, arm: 'ctl' }))]
  let seed = 20261034, tries = 0, order, letters, r
  for (;;) { tries++; r = rng(seed++); order = shuffleWith(all.slice(), r); letters = dealFlat(order, r); if (!periodicity(letters.join('')).fail) break; if (tries > 2000) die('no E8-clean oo deal') }
  const blind = {}, okey = {}
  order.forEach((it, i) => { const id = `Q${String(i + 1).padStart(2, '0')}`; blind[id] = { options: place(it.choices.map(String), String(it.correct_answer), letters[i], r) }; okey[id] = { letter: letters[i], arm: it.arm, localId: it.id, strand: it.arm === 'cand' ? strandOf(it) : it.ctl, group: fmtGroup(it) } })
  wr(W + 'oo.blind.json', blind); wr(W + 'oo.key.json', okey)
  const oslot = slotCheck(Object.values(okey).map(k => ({ ...k, strand: k.arm === 'ctl' ? 'ctl' : k.strand })))
  console.log(`oo render: ${order.length} items (${cand.length} candidates + 24 control), seeds tried ${tries}; slots ${JSON.stringify(oslot.by)}`)
  if (!oslot.ok) die(`oo deal not flat: ${oslot.bad.join('; ')}`)
  seed = 20261035; tries = 0
  const cs = cand.map(i => ({ ...i, arm: 'cand' }))
  for (;;) { tries++; r = rng(seed++); order = shuffleWith(cs.slice(), r); letters = dealFlat(order, r); if (!periodicity(letters.join('')).fail) break; if (tries > 2000) die('no E8-clean ws deal') }
  const N = cand.length
  const md = [`# Items for review (${N})\n\nEach item: strand, target grade, question, four options. The correct answer is NOT marked.\n`], mdk = [`# Items for review (${N}), KEYED\n\nThe same ${N} items in the same order, now with the intended answer marked.\n`], wkey = {}
  order.forEach((it, i) => {
    const n = i + 1, opts = place(it.choices.map(String), String(it.correct_answer), letters[i], r)
    wkey[n] = { letter: letters[i], localId: it.id, strand: strandOf(it), group: fmtGroup(it), grade_target: it.grade_target, choices: SL.map(s => opts[s]) }
    const head = `---\n\n## Item ${n}\n\nStrand: ${it.map_strand} | Target grade: ${it.grade_target}\n\nQuestion: ${it.prompt}\n\n${SL.map(s => `${s}. ${opts[s]}`).join('\n')}\n`
    md.push(head); mdk.push(head + `\nIntended answer: **${letters[i]}**\n`)
  })
  writeFileSync(W + 'ws.md', md.join('\n')); writeFileSync(W + 'ws.keyed.md', mdk.join('\n')); wr(W + 'ws.key.json', wkey)
  const ws = slotCheck(Object.values(wkey))
  console.log(`ws render: ${N} items, seeds tried ${tries}, key slots per strand and format ${JSON.stringify(ws.by)}`)
  if (!ws.ok) die(`ws deal not flat: ${ws.bad.join('; ')}`)
}
else if (mode === 'score') {
  const okey = rd(W + 'oo.key.json'), ids = Object.keys(okey)
  const sol = ['a', 'b', 'c'].map(s => rd(W + `oo.solver-${s}.json`))
  for (const [i, s] of sol.entries()) { const miss = ids.filter(id => !/^[A-D]$/.test(s[id]?.pick ?? '')); if (miss.length) die(`solver ${'abc'[i]} missing ${miss.length} picks`) }
  const arm = {}, flags = []
  for (const id of ids) {
    const k = okey[id], picks = sol.map(s => s[id].pick), h = picks.filter(p => p === k.letter).length
    const key = k.arm === 'ctl' ? 'ctl' : k.strand
    const a = (arm[key] ??= { n: 0, hits: 0, unan: 0, unanKey: 0 }); a.n++; a.hits += h
    if (new Set(picks).size === 1) { a.unan++; if (h === 3) a.unanKey++; else if (k.arm === 'cand') flags.push(`${k.localId} unanimous on ${picks[0]} (key ${k.letter})`) }
  }
  if (arm.ctl?.n !== 24) die('oo control arm is not 24')
  const pct = a => (100 * a.hits) / (3 * a.n)
  console.log(`OPTIONS-ONLY (stems withheld), 3 samples of one Claude solver; denominators: picks = 3 x items per arm`)
  for (const [n, a] of Object.entries(arm)) console.log(`  ${n.padEnd(6)} n=${a.n} (${3 * a.n} picks) ${pct(a).toFixed(1)}% on key; unanimous ${a.unan}/${a.n} (on key ${a.unanKey})`)
  console.log(`  candidate items unanimous on a NON-key letter: ${flags.join('; ') || 'none'}`)
  const wkey = rd(W + 'ws.key.json'), wids = Object.keys(wkey)
  const cold = ['a', 'b'].map(t => [t, rd(W + `ws.grader-${t}.json`)]), keyed = ['a', 'b'].map(t => [t, rd(W + `ws.keyed-${t}.json`)])
  for (const [t, g] of cold) { const miss = wids.filter(i => !/^[A-D]$/.test(g[i]?.pick ?? '') || !['fits', 'too_easy', 'too_hard'].includes(g[i]?.grade_fit) || !Number.isFinite(+g[i]?.grade_assigned) || g[i]?.grade_assigned === null); if (miss.length) die(`cold grader ${t} incomplete on ${miss.join(',')}`) }
  for (const [t, g] of keyed) { const miss = wids.filter(i => !['correct', 'wrong', 'disputed'].includes(g[i]?.key_verdict)); if (miss.length) die(`keyed grader ${t} incomplete on ${miss.join(',')}`) }
  const frozen = rd(W + 'frozen.json')
  if (wids.length !== frozen.length) die(`with-source has ${wids.length} items, frozen ${frozen.length}`)
  console.log(`\nWITH-SOURCE, two fresh Claude graders, cold then keyed; ${wids.length} items x 2 graders per stage`)
  const out = { strands: {}, oo: { arm: Object.fromEntries(Object.entries(arm).map(([k, a]) => [k, { n: a.n, pct: pct(a), unan: a.unan, unanKey: a.unanKey }])), flags } }
  const st0 = rd(W + 'stage0.json')
  const byStrand = Object.fromEntries(STRANDS.map(s => [s, frozen.filter(i => strandOf(i) === s)]).filter(([, v]) => v.length))
  const pe = pooledE3(byStrand)
  console.log(`pooled E3 over the frozen ${pe.n}: longest ${pe.pooled.longest}/${pe.n}, shortest ${pe.pooled.shortest}/${pe.n}${Object.keys(pe.fails).length ? ' FAIL ' + JSON.stringify(pe.fails) : ' pass'}`)
  const slotAll = slotCheck(Object.values(wkey))
  let anyPass = false
  console.log(`\nBARS PER STRAND (MAP-LU-V4.prereg.md)`)
  for (const s of STRANDS) {
    const its = byStrand[s] ?? []
    if (!its.length) { console.log(`\n[${s}] not frozen (Stage 0 ${st0[s]?.stage0 ?? 'absent'}: ${st0[s]?.why ?? ''}) -> FAIL, nothing inserted`); out.strands[s] = { verdict: 'FAIL', stage0: st0[s] ?? null, passIds: [] }; continue }
    const n = its.length
    if (n !== nFrozen(s)) die(`${s}: frozen ${n}, prereg ${nFrozen(s)}`)
    const S = { pass: 0, easier: 0, harder: 0, diffs: { a: [], b: [] }, deadBoth: 0, coldOnKey: 0, passIds: [], holds: [], byGrade: {}, byFormat: {} }
    for (const id of wids.filter(i => wkey[i].strand === s)) {
      const k = wkey[id]
      const r = wsItem(cold.map(([t, g]) => [t, g[id]]), keyed.map(([t, g]) => [t, g[id]]), k.letter)
      if (r.pass) { S.pass++; S.passIds.push(k.localId) } else S.holds.push(`${k.localId} (g${k.grade_target} ${k.group}): ${r.why.join('; ')}`)
      if (r.deadBoth.length) S.deadBoth++
      for (const [t, g] of cold) { if (g[id].pick === k.letter) S.coldOnKey++; const d = +g[id].grade_assigned - k.grade_target; S.diffs[t].push(d); if (d < 0) S.easier++; if (d > 0) S.harder++ }
      const bg = (S.byGrade[k.grade_target] ??= { n: 0, pass: 0, easier: 0 }); bg.n++; if (r.pass) bg.pass++; bg.easier += cold.filter(([, g]) => +g[id].grade_assigned < k.grade_target).length
      const bf = (S.byFormat[k.group] ??= { n: 0, pass: 0 }); bf.n++; if (r.pass) bf.pass++
    }
    const B = bars({ n, pass: S.pass, easier: S.easier, harder: S.harder, diffs: S.diffs, candPct: pct(arm[s]), ctlPct: pct(arm.ctl) })
    const b = batchChecks(its, s), itemFails = its.filter(i => structural(i).errs.length).length
    const exactOk = itemFails === 0 && !b.errs.length && !pe.fails[s]
    const groups = [...new Set(Object.values(wkey).filter(k => k.strand === s).flatMap(k => [k.strand, k.group]))]
    const slotBad = slotAll.bad.filter(x => groups.includes(x.split(' ')[0]))
    const slotOk = slotBad.length === 0
    const pass = exactOk && B.b && B.c && B.d && B.oo && slotOk
    anyPass ||= pass
    console.log(`\n[${s}] n=${n}`)
    for (const h of S.holds) console.log(`  HOLD ${h}`)
    console.log(`  cold picks on key ${S.coldOnKey}/${2 * n}; items with an option dead by both ${S.deadBoth}/${n}; by grade ${JSON.stringify(S.byGrade)}; by format ${JSON.stringify(S.byFormat)}`)
    console.log(`  S1-a exact: ${exactOk ? 'PASS' : 'FAIL'} (${itemFails} item failures; ${[...b.errs, ...(pe.fails[s] ? [pe.fails[s]] : [])].join('; ') || 'no batch failures'}); E3 in strand (reported) ${b.longest}/${n} longest, ${b.shortest}/${n} shortest`)
    for (const [fn, T] of Object.entries(b.fam)) console.log(`  ${fn} ${fmtT(T)}`)
    for (const [f, F] of Object.entries(b.perFormat)) for (const [fn, T] of Object.entries(F)) console.log(`  ${fn}[${f}] ${fmtT(T)}`)
    console.log(`  S1-b pilot-pass ${S.pass}/${n} (bar >= ${passBar(n)}; range 0-${n}) -> ${B.b ? 'PASS' : 'FAIL'}`)
    console.log(`  S1-c easier ${S.easier}/${2 * n} (bar <= ${easierMax(n)}), harder ${S.harder}/${2 * n} (bar < ${harderLt(n)}) -> ${B.c ? 'PASS' : 'FAIL'}`)
    console.log(`  S1-d mean grade offset a ${B.ma.toFixed(2)}, b ${B.mb.toFixed(2)} (bar within +-0.5) -> ${B.d ? 'PASS' : 'FAIL'}`)
    console.log(`  S2 options-only: ${pct(arm[s]).toFixed(1)}% (n=${arm[s].n}) vs control ${pct(arm.ctl).toFixed(1)}% (bar: >= ${B.ooBar.toFixed(1)}; control must be >= 25%; bar attainable range 0-100) -> ${!B.ooValid ? 'INVALID' : B.oo ? 'PASS' : 'FAIL'}`)
    console.log(`  T key slots ${groups.map(g => `${g} ${JSON.stringify(slotAll.by[g])}`).join(', ')} (bar: no slot > 35% per strand and per format) -> ${slotOk ? 'PASS' : 'FAIL'}`)
    console.log(`  VERDICT ${s}: ${pass ? `PASS - insert the ${S.pass} pilot-pass items STAGED as ${COHORT[s]}` : 'FAIL - nothing inserted'}`)
    out.strands[s] = { verdict: pass ? 'PASS' : 'FAIL', n, passIds: S.passIds, holds: S.holds, ws: { pass: S.pass, easier: S.easier, harder: S.harder, ma: B.ma, mb: B.mb, coldOnKey: S.coldOnKey, deadBoth: S.deadBoth, byGrade: S.byGrade, byFormat: S.byFormat }, exact: { ok: exactOk, longest: b.longest, shortest: b.shortest, pooledE3: pe.fails[s] ?? null, fam: Object.fromEntries(Object.entries(b.fam).map(([fn, T]) => [fn, { best: T.best, score: T.bestScore, fwP: T.fwP, fires: T.fires }])), perFormat: Object.fromEntries(Object.entries(b.perFormat).map(([f, F]) => [f, Object.fromEntries(Object.entries(F).map(([fn, T]) => [fn, { best: T.best, score: T.bestScore, fwP: T.fwP, fires: T.fires }]))])) }, oo: { cand: pct(arm[s]), ctl: pct(arm.ctl), bar: B.ooBar }, slots: Object.fromEntries(groups.map(g => [g, slotAll.by[g]])), bars: { a: exactOk, b: B.b, c: B.c, d: B.d, oo: B.oo, ooValid: B.ooValid, slot: slotOk } }
  }
  out.pooledE3 = { n: pe.n, longest: pe.pooled.longest, shortest: pe.pooled.shortest }
  wr(W + 'stages.json', out)
  console.log(`\nSUMMARY ${STRANDS.map(s => `${s} ${out.strands[s].verdict}`).join(', ')}`)
  process.exit(anyPass ? 0 : 1)
}
else if (mode === 'build') {
  const s = arg; if (!STRANDS.includes(s)) die('usage: build <spell|gram|cap>')
  const st = rd(W + 'stages.json').strands[s]
  if (st?.verdict !== 'PASS') die(`${s} verdict ${st?.verdict}`)
  const frozen = Object.fromEntries(rd(W + 'frozen.json').map(i => [i.id, i]))
  const wkey = rd(W + 'ws.key.json'), ga = rd(W + 'ws.grader-a.json'), gb = rd(W + 'ws.grader-b.json')
  const items = []
  for (const [n, k] of Object.entries(wkey)) {
    if (k.strand !== s || !st.passIds.includes(k.localId)) continue
    const it = frozen[k.localId]
    if (!ga[n] || !gb[n]) die(`${k.localId}: missing a grader label`)
    if (!k.choices.includes(it.correct_answer) || new Set(k.choices).size !== 4) die(`${k.localId}: rendered choices do not hold the key`)
    const off = ((+ga[n].grade_assigned - it.grade_target) + (+gb[n].grade_assigned - it.grade_target)) / 2
    items.push({
      id: it.id, type: 'multiple_choice', blanks: null, stem_is_instruction: !(s === 'spell' && it.spelling_format === 'word'), prompt: it.prompt, choices: k.choices, graphic: null, passage: null,
      difficulty: off <= -1 ? 'easy' : off >= 1 ? 'hard' : 'medium', explanation: it.explanation, correct_answer: it.correct_answer,
      passageGroupId: null, correct_answers: null, acceptable_answers: null,
      distractor_rationales: k.choices.filter(c => c !== it.correct_answer).map(c => ({ choice: c, reason: it.student_error?.[c] ?? '' })),
      map: { area: it.map_area, strand: it.map_strand, grade_target: it.grade_target, ccss: it.ccss, error_sites: it.error_sites ?? null, spelling_format: it.spelling_format ?? null, rule: it.cap_rule ?? it.varied_dimension ?? it.spelling_pattern ?? null, grade_assigned: { a: +ga[n].grade_assigned, b: +gb[n].grade_assigned } },
    })
  }
  if (items.length !== st.passIds.length) die(`built ${items.length} of ${st.passIds.length}`)
  const OUT = W + `inserted-${s}.batch.json`
  writeFileSync(OUT, JSON.stringify(items, null, 1) + '\n')
  console.log(`${items.length} items -> ${OUT}; sha256 ${sha(OUT)}`)
  console.log(`difficulty ${['easy', 'medium', 'hard'].map(d => `${d} ${items.filter(i => i.difficulty === d).length}`).join(' / ')}`)
}
else if (mode === 'insert') {
  const s = arg; if (!STRANDS.includes(s)) die('usage: insert <strand> [--commit]')
  const commit = process.argv.includes('--commit'), OUT = W + `inserted-${s}.batch.json`
  const { gateBatch } = await import(SB + 'gate.mjs')
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  // stem-duplicates refuses a family with zero VERIFIED live rows; MAP is not shipped (as v3 and map-math-g58-v1)
  const { count: liveMap, error: ce } = await db.from('study_item_bank').select('id', { count: 'exact', head: true }).eq('family', 'map').eq('verified', true).eq('archived', false)
  if (ce || typeof liveMap !== 'number') die(`cannot count live map rows: ${ce?.message}`)
  console.log(`live verified map rows: ${liveMap}${liveMap === 0 ? ' -> stem-duplicate check runs within the batch only' : ''}`)
  const g = gateBatch({ task: 'multiple_choice', family: 'map', section: 'language', itemFiles: [OUT], ...(liveMap === 0 ? { liveStems: [] } : {}) })
  console.log(`gate (${g.family}, ledger ${g.batch ?? 'none'}): ${g.canInsert ? 'PASS' : 'REFUSED'} - ${g.reason}`)
  if (!g.canInsert) process.exit(2)
  const items = rd(OUT)
  const norm = x => String(x ?? '').toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
  const hashOf = ({ passage, prompt, choices }) => createHash('md5').update([norm(passage), norm(prompt), (choices || []).map(norm).join('|')].join('~~')).digest('hex')
  const rows = items.map(({ id, map, ...item }) => ({
    family: 'map', section: 'language', domain: map.area, subskill: map.strand, difficulty: item.difficulty, topic_tag: map.strand,
    item_type: 'multiple_choice', task: 'multiple_choice', passage_group_id: null, item, content_hash: hashOf(item),
    word_count: String(item.correct_answer).split(/\s+/).filter(Boolean).length, verified: false, source: 'hand', cohort: COHORT[s],
    verify_meta: {
      method: 'map-lu-v4: claude-authored; two teacher-voice raters + one rewrite; exact checks (E1 E4 E5 E7 G L-rank L-class) + pooled E3 + structural-predictor families T2 and T2-L (per strand, per Spelling format, pooled); Spelling word-grade screen and freeze pre-flight with one seeded re-draw; options-only vs matched live control; two Claude graders cold then keyed',
      staged: true, release: 'NOT released. MAP is not a shipped family; a person releases (human sitting, decision rule fixed before the draw). Never verified=true from a script.',
      localId: id, map, prereg: 'scripts/study-bank/MAP-LU-V4.prereg.md', result: 'scripts/study-bank/MAP-LU-V4-RESULT.md', contentSha: g.sha,
    },
  }))
  const { data: dup, error: e1x } = await db.from('study_item_bank').select('id,cohort').in('content_hash', rows.map(r => r.content_hash))
  if (e1x) die(e1x.message)
  if (dup.length) die(`${dup.length} content_hash already in the bank (${dup.map(d => d.cohort).join(',')})`)
  const { data: same, error: e2 } = await db.from('study_item_bank').select('id').eq('cohort', COHORT[s])
  if (e2) die(e2.message)
  if (same.length) die(`cohort ${COHORT[s]} already has ${same.length} rows`)
  if (rows.some(r => r.verified !== false)) die('a row is not verified=false')
  console.log(`${rows.length} rows ready: family map, section language, verified=false, cohort ${COHORT[s]}`)
  if (!commit) { console.log('DRY RUN: nothing inserted (pass --commit)'); process.exit(0) }
  const { data: ins, error: e3 } = await db.from('study_item_bank').insert(rows).select('id,verified,cohort,difficulty')
  if (e3) die(e3.message)
  console.log(`INSERTED ${ins.length} rows, verified=${[...new Set(ins.map(r => r.verified))].join(',')}, cohort ${COHORT[s]}`)
}
else die('usage: map-lu-v4.mjs spell|edit|assign|select-control|checks|preflight|teacher-input|teacher-merge|rerate-input|repair-input|screen-input|freeze|render|score|build|insert|--selftest')
